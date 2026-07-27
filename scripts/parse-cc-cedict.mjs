import { readFileSync, unlinkSync, writeFileSync } from 'fs'
import initSqlJs from 'sql.js'

const INPUT = 'public/dictionaries/cedict_ts.u8'
const OUTPUT = 'public/dictionaries/cc-cedict.db'

async function main() {
  try { unlinkSync(OUTPUT) } catch {}

  const SQL = await initSqlJs()
  const db = new SQL.Database()

  db.run(`
    CREATE TABLE dictionary_index (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      chinese_definition TEXT NOT NULL
    );
    CREATE INDEX idx_di_word ON dictionary_index(word);
  `)

  const text = readFileSync(INPUT, 'utf-8')
  const lines = text.split('\n')
  let count = 0

  const stmt = db.prepare('INSERT INTO dictionary_index (word, chinese_definition) VALUES (?, ?)')

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    // Format: Traditional Simplified [pinyin] /def1/def2/.../
    // Extract simplified word (2nd field) and definitions (between outer slashes)
    const parts = line.split(' ')
    if (parts.length < 3) continue

    const simplified = parts[1]
    const defStart = line.indexOf('/')
    if (defStart === -1) continue

    const defEnd = line.lastIndexOf('/')
    if (defEnd <= defStart) continue

    // Join multiple definitions with Chinese semicolon
    const definitions = line
      .substring(defStart + 1, defEnd)
      .split('/')
      .map(s => s.trim())
      .filter(Boolean)
      .join('；')

    if (!simplified || !definitions) continue

    stmt.run([simplified, definitions])
    count++
  }

  stmt.free()

  const buffer = db.export()
  writeFileSync(OUTPUT, Buffer.from(buffer))

  db.close()
  console.log(`Done: ${count} entries written to ${OUTPUT}`)
}

main().catch(console.error)
