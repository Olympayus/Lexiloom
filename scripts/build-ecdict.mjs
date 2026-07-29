import { readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import initSqlJs from 'sql.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ECDICT_DATA = join(__dirname, '..', 'node_modules', 'ecdict', 'data')
const OUTPUT = join(__dirname, '..', 'public', 'dictionaries', 'ecdict.db')

async function main() {
  try { unlinkSync(OUTPUT) } catch {}

  const SQL = await initSqlJs()
  const db = new SQL.Database()

  db.run(`CREATE TABLE lemmas (
    word TEXT PRIMARY KEY,
    frequency INTEGER NOT NULL DEFAULT 0
  )`)
  db.run(`CREATE TABLE entries (
    word TEXT PRIMARY KEY,
    phonetic TEXT,
    definition TEXT,
    translation TEXT,
    collins INTEGER DEFAULT 0,
    oxford INTEGER DEFAULT 0,
    tag TEXT,
    bnc INTEGER DEFAULT 0,
    frq INTEGER DEFAULT 0,
    exchange TEXT
  )`)

  // 导入 lemma.json
  console.log('Loading lemma.json...')
  const lemmaData = JSON.parse(readFileSync(join(ECDICT_DATA, 'lemma.json'), 'utf-8'))
  const lemmaStmt = db.prepare('INSERT OR IGNORE INTO lemmas VALUES (?, ?)')
  for (const item of lemmaData) {
    lemmaStmt.run([item.word, item.frequency || 0])
    // 也插入 variations（如果有）
    if (item.variations && Array.isArray(item.variations)) {
      for (const v of item.variations) {
        lemmaStmt.run([v, item.frequency || 0])
      }
    }
  }
  lemmaStmt.free()
  console.log(`  → ${lemmaData.length} lemmas loaded`)

  // 导入 dict.json
  console.log('Loading dict.json (this may take a moment)...')
  const dictData = JSON.parse(readFileSync(join(ECDICT_DATA, 'dict.json'), 'utf-8'))
  const entryStmt = db.prepare(
    'INSERT OR IGNORE INTO entries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  let count = 0
  for (const item of dictData) {
    entryStmt.run([
      item.word || '',
      item.phonetic || null,
      item.definition || null,
      item.translation || null,
      item.collins || 0,
      item.oxford || 0,
      item.tag || null,
      item.bnc || 0,
      item.frq || 0,
      item.exchange || null,
    ])
    count++
    if (count % 100000 === 0) console.log(`  → ${count} entries processed...`)
  }
  entryStmt.free()
  console.log(`  → ${count} total entries loaded`)

  // 创建索引
  db.run('CREATE INDEX idx_lemmas_word ON lemmas(word)')

  const buffer = db.export()
  writeFileSync(OUTPUT, Buffer.from(buffer))
  db.close()
  console.log(`Done: ${OUTPUT} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`)
}

main().catch(console.error)
