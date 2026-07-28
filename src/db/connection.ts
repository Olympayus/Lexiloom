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
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}
