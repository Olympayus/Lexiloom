import initSqlJs from 'sql.js'
import {
  SQL_CREATE_WORDS, SQL_CREATE_FIELD_DEFINITIONS, SQL_CREATE_FIELD_VALUES,
  SQL_CREATE_CATEGORIES, SQL_CREATE_WORD_CATEGORIES,
  SQL_CREATE_INDEXES, seedFieldDefinitionsSQL,
} from './schema'

// 与 tauri-plugin-sql Database 对齐的最小接口（execute/select）
export interface DbLike {
  execute: (sql: string, params?: unknown[]) => Promise<void>
  select: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>
}

export async function createRawTestDb(): Promise<{ adapter: DbLike }> {
  const SQL = await initSqlJs()
  const db = new SQL.Database()
  db.run('PRAGMA foreign_keys = ON')
  const adapter: DbLike = {
    async execute(sql, params = []) {
      db.run(sql, params as never[])
    },
    async select<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const stmt = db.prepare(sql)
      try {
        stmt.bind(params as never[])
        const rows: Record<string, unknown>[] = []
        while (stmt.step()) rows.push(stmt.getAsObject())
        return rows as unknown as T[]
      } finally {
        stmt.free()
      }
    },
  }
  return { adapter }
}

export async function createTestDb(): Promise<DbLike> {
  const { adapter } = await createRawTestDb()
  for (const sql of [
    SQL_CREATE_WORDS, SQL_CREATE_FIELD_DEFINITIONS, SQL_CREATE_FIELD_VALUES,
    SQL_CREATE_CATEGORIES, SQL_CREATE_WORD_CATEGORIES,
    SQL_CREATE_INDEXES, seedFieldDefinitionsSQL(),
  ]) {
    await adapter.execute(sql)
  }
  return adapter
}
