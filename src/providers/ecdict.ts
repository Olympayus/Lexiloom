import type { DictionaryProvider } from './types'
import type { DictionaryEntry } from '../types/dictionary'
import { buildEcdictFields } from '../lib/ecdictParse'
import { getCachedDb } from './dbCache'
import { resolveDictPath, toSqliteUrl } from './dictPath'

const dbPath = resolveDictPath('ecdict.db')

export class EcdictProvider implements DictionaryProvider {
  readonly name = 'ecdict'

  async searchLemmas(query: string): Promise<string[]> {
    if (!query.trim()) return []
    const db = await getCachedDb(toSqliteUrl(await dbPath))
    const q = `${query.toLowerCase().trim()}%`
    const rows = await db.select<{ word: string }[]>(
      'SELECT word FROM lemmas WHERE word LIKE ?1 LIMIT 20',
      [q]
    )
    return rows.map(r => r.word)
  }

  async lookup(word: string): Promise<DictionaryEntry[]> {
    if (!word.trim()) return []
    const normalized = word.toLowerCase().trim()
    const db = await getCachedDb(toSqliteUrl(await dbPath))
    const rows = await db.select<Record<string, any>[]>(
      'SELECT * FROM entries WHERE word = ?1 LIMIT 1',
      [normalized]
    )
    if (rows.length === 0) return []

    const entry = rows[0]
    const fields = buildEcdictFields({
      word: entry.word,
      translation: entry.translation ?? null,
      definition: entry.definition ?? null,
      phonetic: entry.phonetic ?? null,
      exchange: entry.exchange ?? null,
    })
    return [{
      word: entry.word,
      normalizedWord: normalized,
      source: 'ecdict',
      fields,
    }]
  }
}
