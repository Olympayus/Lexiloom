import Database from '@tauri-apps/plugin-sql'
import { getDb } from '../db/connection'
import type { DictionaryProvider } from './types'
import type { DictionaryEntry } from '../types/dictionary'

export class CcCedictProvider implements DictionaryProvider {
  readonly name = 'cc-cedict'

  async lookup(query: string): Promise<DictionaryEntry[]> {
    if (!query.trim()) return []
    const q = `%${query.toLowerCase().trim()}%`

    // Try main DB cache first
    const db = getDb()
    const cached = await db.select<{ id: string; word: string; normalized_word: string }[]>(
      `SELECT id, word, normalized_word FROM dictionary_entries WHERE word LIKE ?1 LIMIT 20`, [q]
    )
    if (cached.length > 0) return this._hydrate(db, cached)

    // Load from file DB — search both Chinese word and English definition
    const fileDb = await Database.load('sqlite:cc-cedict.db')
    const rows = await fileDb.select<{ word: string; chinese_definition: string }[]>(
      `SELECT word, chinese_definition FROM dictionary_index WHERE word LIKE ?1 OR chinese_definition LIKE ?1 LIMIT 20`, [q]
    )
    if (rows.length === 0) return []

    // Cache to main DB and collect IDs for re-query
    const now = Date.now()
    const entryIds: string[] = []
    for (const r of rows) {
      const id = crypto.randomUUID()
      entryIds.push(id)
      await db.execute(
        `INSERT OR IGNORE INTO dictionary_entries VALUES(?1,?2,?3,'cc-cedict',?4,?5)`,
        [id, r.word, r.word.toLowerCase(), JSON.stringify({ d: r.chinese_definition }), now]
      )
      await db.execute(
        `INSERT OR IGNORE INTO dictionary_fields VALUES(?1,?2,'chinese_definition',?3)`,
        [crypto.randomUUID(), id, r.chinese_definition]
      )
    }

    // Query back by IDs (not by word LIKE, since word is Chinese but query may be English)
    const placeholders = entryIds.map(() => '?').join(',')
    return this._hydrate(db, await db.select<{ id: string; word: string; normalized_word: string }[]>(
      `SELECT id, word, normalized_word FROM dictionary_entries WHERE id IN (${placeholders})`, entryIds
    ))
  }

  private async _hydrate(db: any, rows: { id: string; word: string; normalized_word: string }[]): Promise<DictionaryEntry[]> {
    const result: DictionaryEntry[] = []
    for (const row of rows) {
      const fields: { field_key: string; field_value: string }[] = await db.select(
        `SELECT field_key, field_value FROM dictionary_fields WHERE entry_id = ?1`, [row.id]
      )
      result.push({
        word: row.word,
        normalizedWord: row.normalized_word,
        source: 'cc-cedict',
        fields: fields.map(f => ({ key: f.field_key, value: f.field_value })),
      })
    }
    return result
  }
}
