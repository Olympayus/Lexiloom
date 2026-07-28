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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(word_id, field_id)
);`

export const SQL_CREATE_DICTIONARY_ENTRIES = `CREATE TABLE IF NOT EXISTS dictionary_entries (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  normalized_word TEXT NOT NULL,
  source TEXT NOT NULL,
  raw_data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);`

export const SQL_CREATE_DICTIONARY_FIELDS = `CREATE TABLE IF NOT EXISTS dictionary_fields (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value TEXT NOT NULL
);`

export const SQL_CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_fv_word_id ON field_values(word_id);
  CREATE INDEX IF NOT EXISTS idx_df_entry_id ON dictionary_fields(entry_id);
  CREATE INDEX IF NOT EXISTS idx_df_value ON dictionary_fields(field_value);
  CREATE INDEX IF NOT EXISTS idx_de_word ON dictionary_entries(normalized_word);
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
