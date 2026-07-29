import Database from '@tauri-apps/plugin-sql'
import {
  SQL_CREATE_WORDS, SQL_CREATE_FIELD_DEFINITIONS, SQL_CREATE_FIELD_VALUES,
  SQL_CREATE_DICTIONARY_ENTRIES, SQL_CREATE_DICTIONARY_FIELDS, SQL_CREATE_INDEXES,
  seedFieldDefinitionsSQL,
} from './schema'

let db: Database | null = null

export async function initDatabase(): Promise<void> {
  if (db) return
  db = await Database.load('sqlite:lexiloom.db')
  for (const sql of [
    SQL_CREATE_WORDS, SQL_CREATE_FIELD_DEFINITIONS, SQL_CREATE_FIELD_VALUES,
    SQL_CREATE_DICTIONARY_ENTRIES, SQL_CREATE_DICTIONARY_FIELDS,
    SQL_CREATE_INDEXES, seedFieldDefinitionsSQL(),
  ]) {
    await db.execute(sql)
  }

  // 检测旧版本 field_values 表（有 UNIQUE 约束的），迁移到新 schema
  const tableInfo = await db.select<{ sql: string }[]>(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='field_values'`
  )
  if (tableInfo.length > 0 && tableInfo[0].sql?.includes('UNIQUE')) {
    await db.execute('BEGIN TRANSACTION')
    await db.execute(`CREATE TABLE field_values_new (
      id TEXT PRIMARY KEY,
      word_id TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
      field_id TEXT NOT NULL REFERENCES field_definitions(id) ON DELETE CASCADE,
      value TEXT,
      source TEXT NOT NULL DEFAULT 'user',
      display_order INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT REFERENCES field_values(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`)
    await db.execute(
      `INSERT INTO field_values_new (id, word_id, field_id, value, source, display_order, parent_id, created_at, updated_at)
       SELECT id, word_id, field_id, value, source, 0, NULL, created_at, updated_at FROM field_values`
    )
    await db.execute('DROP TABLE field_values')
    await db.execute('ALTER TABLE field_values_new RENAME TO field_values')
    await db.execute('COMMIT')
  }
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}
