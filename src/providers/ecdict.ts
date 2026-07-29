import Database from '@tauri-apps/plugin-sql'
import type { DictionaryProvider } from './types'
import type { DictionaryEntry } from '../types/dictionary'

const DB_PATH = 'sqlite:ecdict.db'

// exchange prefix mapping table
const EXCHANGE_LABELS: Record<string, string> = {
  d: '过去式',
  p: '过去分词',
  i: '现在分词',
  '3': '第三人称单数',
  s: '复数',
  f: '比较级',
  '0': '原型',
  '1': '过去式(美式)',
}

function parseExchange(exchange: string): Array<{ label: string; value: string }> {
  if (!exchange) return []
  return exchange.split('/').map(pair => {
    const colonIdx = pair.indexOf(':')
    if (colonIdx === -1) return null
    const prefix = pair.substring(0, colonIdx)
    const val = pair.substring(colonIdx + 1)
    const label = EXCHANGE_LABELS[prefix] || prefix
    return { label, value: val }
  }).filter(Boolean) as Array<{ label: string; value: string }>
}

export class EcdictProvider implements DictionaryProvider {
  readonly name = 'ecdict'

  async searchLemmas(query: string): Promise<string[]> {
    if (!query.trim()) return []
    const db = await Database.load(DB_PATH)
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
    const db = await Database.load(DB_PATH)
    const rows = await db.select<Record<string, any>[]>(
      'SELECT * FROM entries WHERE word = ?1 LIMIT 1',
      [normalized]
    )
    if (rows.length === 0) return []

    const entry = rows[0]
    const fields: DictionaryEntry['fields'] = []

    // Phonetic transcription
    if (entry.phonetic) {
      fields.push({ key: 'phonetic', value: entry.phonetic })
    }

    // Chinese definitions (split by \n, each line comma-separated)
    if (entry.translation) {
      const lines = entry.translation.split('\\n')
      for (const line of lines) {
        // Line may start with a POS tag, e.g. "vt. 觉察到, 遵守" or "vi. 注意"
        // Split by comma into individual definitions, preserving POS prefix
        const parts = line.split(',').map((s: string) => s.trim()).filter(Boolean)
        for (const part of parts) {
          fields.push({ key: 'chinese_definition', value: part })
        }
      }
    }

    // English definitions (split by \n)
    if (entry.definition) {
      const lines = entry.definition.split('\\n')
      for (const line of lines) {
        fields.push({ key: 'english_definition', value: line.trim() })
      }
    }

    // Inflection forms
    if (entry.exchange) {
      const items = parseExchange(entry.exchange)
      fields.push({ key: 'exchange', value: '' }) // container
      for (const item of items) {
        fields.push({ key: 'exchange_item', value: `${item.label}: ${item.value}` })
      }
    }

    return [{
      word: entry.word,
      normalizedWord: normalized,
      source: 'ecdict',
      fields,
    }]
  }
}
