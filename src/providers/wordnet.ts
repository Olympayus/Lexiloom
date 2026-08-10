import type { DictionaryProvider } from './types'
import type { DictionaryEntry } from '../types/dictionary'
import { getCachedDb } from './dbCache'
import { buildWordnetFields } from '../lib/wordnetParse'
import { resolveDictPath, toSqliteUrl } from './dictPath'

const dbPath = resolveDictPath('wordnet.db')

export class WordNetProvider implements DictionaryProvider {
  readonly name = 'wordnet'

  async searchLemmas(query: string): Promise<string[]> {
    if (!query.trim()) return []
    const db = await getCachedDb(toSqliteUrl(await dbPath))
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
    const db = await getCachedDb(toSqliteUrl(await dbPath))

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

    const synsets = rows.map(row => ({
      pos: row.pos,
      definition: row.definition ?? '',
      examples: row.examples ?? null,
      words: row.words ?? null,
    }))
    const fields = buildWordnetFields(word, synsets)

    return [{
      word,
      normalizedWord: normalized,
      source: 'wordnet',
      fields,
    }]
  }
}
