import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import initSqlJs from 'sql.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WN_INPUT = join(__dirname, '..', 'node_modules', 'wordnet-db', 'dict')
const OUTPUT = join(__dirname, '..', 'public', 'dictionaries', 'wordnet.db')

const POS_MAP = { noun: 'n', verb: 'v', adj: 'a', adv: 'r' }

function parseIndexLine(line) {
  // format: lemma pos synset_cnt p_cnt [ptr_types...] sense_cnt tagsense_cnt offset1 offset2...
  const parts = line.trim().split(/\s+/)
  if (parts.length < 6) return null
  const lemma = parts[0]
  const pos = parts[1]
  const synsetCnt = parseInt(parts[2], 10)
  if (synsetCnt === 0) return null
  const offsets = parts.slice(-synsetCnt).map(s => parseInt(s, 10))
  return { lemma, pos, synsetOffsets: offsets }
}

function parseDataLine(line) {
  // format: synset_offset lex_filenum ss_type w_cnt word1 lex_id1 word2 lex_id2 ... p_cnt ... | gloss
  const barIdx = line.indexOf('|')
  if (barIdx === -1) return null

  const head = line.substring(0, barIdx).trim()
  const gloss = line.substring(barIdx + 1).trim()

  const headParts = head.split(/\s+/)
  const synsetOffset = parseInt(headParts[0], 10)
  const pos = headParts[2]
  const wCnt = parseInt(headParts[3], 16)

  // Extract words: after ss_type and w_cnt, pairs of (word, lex_id)
  const words = []
  let idx = 4
  for (let i = 0; i < wCnt && idx + 1 < headParts.length; i++) {
    const word = headParts[idx].replace(/_/g, ' ')
    words.push(word)
    idx += 2  // skip lex_id
  }

  // Extract examples from gloss: quoted parts
  const examples = []
  const quoteRegex = /"([^"]+)"/g
  let m
  while ((m = quoteRegex.exec(gloss)) !== null) {
    examples.push(m[1])
  }

  return {
    synsetOffset,
    pos,
    words,
    definition: gloss,
    examples,
  }
}

async function main() {
  try { unlinkSync(OUTPUT) } catch {}

  const SQL = await initSqlJs()
  const db = new SQL.Database()

  db.run(`CREATE TABLE wn_words (
    lemma TEXT NOT NULL,
    pos TEXT NOT NULL,
    synset_offset INTEGER NOT NULL
  )`)
  db.run(`CREATE INDEX idx_wn_word ON wn_words(lemma)`)

  db.run(`CREATE TABLE wn_synsets (
    synset_offset INTEGER NOT NULL,
    pos TEXT NOT NULL,
    definition TEXT NOT NULL,
    examples TEXT,
    words TEXT,
    PRIMARY KEY (synset_offset, pos)
  )`)

  const wordInsert = db.prepare('INSERT INTO wn_words VALUES (?, ?, ?)')
  const synsetInsert = db.prepare('INSERT OR IGNORE INTO wn_synsets VALUES (?, ?, ?, ?, ?)')
  let totalWords = 0

  for (const [posName, posCode] of Object.entries(POS_MAP)) {
    const indexFile = join(WN_INPUT, `index.${posName}`)
    const dataFile = join(WN_INPUT, `data.${posName}`)

    console.log(`Processing ${posName}...`)

    // Parse index file
    const indexLines = readFileSync(indexFile, 'utf-8').split('\n')
    const wordToOffsets = new Map()

    for (const line of indexLines) {
      if (!line || line.startsWith('  ')) continue
      const parsed = parseIndexLine(line)
      if (!parsed) continue
      wordToOffsets.set(parsed.lemma, parsed.synsetOffsets)
    }

    // Parse data file
    const dataLines = readFileSync(dataFile, 'utf-8').split('\n')
    const offsetToSynset = new Map()

    for (const line of dataLines) {
      if (!line || line.startsWith('  ')) continue
      const parsed = parseDataLine(line)
      if (!parsed) continue
      offsetToSynset.set(parsed.synsetOffset, parsed)
    }

    // Write words
    for (const [lemma, offsets] of wordToOffsets) {
      for (const offset of offsets) {
        wordInsert.run([lemma, posCode, offset])
        totalWords++
      }
    }

    // Write synsets
    for (const [, synset] of offsetToSynset) {
      const wordsStr = synset.words.join('\n')
      const examplesStr = synset.examples.join('\n')
      synsetInsert.run([synset.synsetOffset, posCode, synset.definition, examplesStr || null, wordsStr])
    }

    console.log(`  → ${wordToOffsets.size} words, ${offsetToSynset.size} synsets`)
  }

  wordInsert.free()
  synsetInsert.free()

  const buffer = db.export()
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, Buffer.from(buffer))
  db.close()
  console.log(`Done: ${totalWords} word-synset mappings written to ${OUTPUT} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
