import Database from '@tauri-apps/plugin-sql'
import { resolveResource } from '@tauri-apps/api/path'
import type { DictionaryProvider } from './types'
import type { DictionaryEntry } from '../types/dictionary'

let dbPromise: Promise<Database> | null = null
async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const path = await resolveResource('wordnet.db')
      return Database.load(`sqlite:${path}`)
    })()
  }
  return dbPromise
}

export class WordNetProvider implements DictionaryProvider {
  readonly name = 'wordnet'

  async searchLemmas(query: string): Promise<string[]> {
    if (!query.trim()) return []
    const db = await getDb()
    const q = `${query.toLowerCase().trim()}%`
    const rows = await db.select<{ lemma: string }[]>(
      'SELECT DISTINCT lemma FROM wn_words WHERE lemma LIKE ?1 LIMIT 20',
      [q]
    )
    return rows.map(r => r.lemma)
  }

  async lookup(word: string): Promise<DictionaryEntry[]> {
    if (!word.trim()) return []
    const normalized = word.toLowerCase().trim()
    const db = await getDb()

    // Query all synsets for this word, joining on composite PK (synset_offset, pos)
    const rows = await db.select<Record<string, any>[]>(
      `SELECT ws.synset_offset, ws.pos, ws.definition, ws.examples, ws.words
       FROM wn_words ww
       JOIN wn_synsets ws ON ww.synset_offset = ws.synset_offset AND ww.pos = ws.pos
       WHERE ww.lemma = ?1
       ORDER BY ws.synset_offset`,
      [normalized]
    )

    if (rows.length === 0) return []

    // Each synset becomes an independent English definition with sub-fields
    const entries: DictionaryEntry[] = []

    for (const row of rows) {
      const fields: DictionaryEntry['fields'] = []

      // English definition
      fields.push({ key: 'english_definition', value: row.definition })

      // Synonyms (exclude the search term itself)
      const wordsList: string[] = row.words
        ? row.words.split('\n').filter((w: string) => w.toLowerCase() !== normalized)
        : []
      if (wordsList.length > 0) {
        fields.push({ key: 'synonyms', value: wordsList.join(', ') })
      }

      // Example sentences (extracted from gloss quotes)
      if (row.examples) {
        const examples = row.examples.split('\n').filter(Boolean)
        if (examples.length > 0) {
          fields.push({ key: 'example_sentence', value: '' }) // container
          for (const ex of examples) {
            fields.push({ key: 'example', value: ex })
          }
        }
      }

      entries.push({
        word: word,
        normalizedWord: normalized,
        source: 'wordnet',
        fields,
      })
    }

    return entries
  }
}
