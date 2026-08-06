import { SCHEMA_SEED_STATEMENTS, SCHEMA_VERSION, SQL_DROP_TABLES } from './schema'

// 与 tauri-plugin-sql Database 对齐的最小接口（与 test-utils.DbLike 同构）
export interface DbHandle {
  execute: (sql: string, params?: unknown[]) => Promise<void>
  select: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>
}

export async function ensureSchema(db: DbHandle): Promise<void> {
  const rows = await db.select<{ user_version: number }>('SELECT user_version FROM pragma_user_version')
  const current = rows[0]?.user_version ?? 0
  if (current === SCHEMA_VERSION) return
  for (const sql of SQL_DROP_TABLES) await db.execute(sql)
  for (const sql of SCHEMA_SEED_STATEMENTS) await db.execute(sql)
  await db.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`)
}
