import type { FieldKey } from '../types/field'
import { BUILTIN_FIELDS } from '../types/field'

export const SQL_CREATE_WORDS = `CREATE TABLE IF NOT EXISTS words (
  id TEXT PRIMARY KEY,
  lemma TEXT NOT NULL,
  normalized_lemma TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);`

export const SQL_CREATE_FIELD_DEFINITIONS = `CREATE TABLE IF NOT EXISTS field_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  field_type TEXT NOT NULL DEFAULT 'text',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);`

export const SQL_CREATE_FIELD_VALUES = `CREATE TABLE IF NOT EXISTS field_values (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL REFERENCES field_definitions(id) ON DELETE CASCADE,
  value TEXT,
  source TEXT NOT NULL DEFAULT 'user',
  display_order INTEGER NOT NULL DEFAULT 0,
  parent_id TEXT REFERENCES field_values(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);`

export const SQL_CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_fv_word_id ON field_values(word_id);
`

export function seedFieldDefinitionsSQL(): string {
  const now = Date.now()
  const rows = (Object.entries(BUILTIN_FIELDS) as [string, typeof BUILTIN_FIELDS[FieldKey]][])
    .map(([key, def]) => {
      const id = `f_${key}`
      return `('${id}','${def.name}','${key}','${def.fieldType}',${def.displayOrder},${now})`
    }).join(',\n')
  return `INSERT OR IGNORE INTO field_definitions VALUES ${rows};`
}

// D4：PRAGMA user_version 驱动重建。P4/P5 变更 schema 时递增此值。
export const SCHEMA_VERSION = 1

export const SQL_DROP_TABLES: string[] = [
  'DROP TABLE IF EXISTS field_values;',
  'DROP TABLE IF EXISTS field_definitions;',
  'DROP TABLE IF EXISTS words;',
]
