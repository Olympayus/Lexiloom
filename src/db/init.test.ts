import { describe, it, expect } from 'vitest'
import { ensureSchema } from './init'
import { SCHEMA_VERSION } from './schema'
import { createRawTestDb } from './test-utils'

describe('db/init ensureSchema', () => {
  it('空库：建表并写入版本号', async () => {
    const { adapter } = await createRawTestDb()
    await ensureSchema(adapter)
    const tables = await adapter.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('words','field_definitions','field_values','categories','word_categories')"
    )
    expect(tables.length).toBe(5)
    const v = await adapter.select<{ user_version: number }>('SELECT user_version FROM pragma_user_version')
    expect(v[0].user_version).toBe(SCHEMA_VERSION)
  })

  it('版本一致：不重建，数据保留', async () => {
    const { adapter } = await createRawTestDb()
    await ensureSchema(adapter)
    await adapter.execute(
      "INSERT INTO words (id, lemma, normalized_lemma, language, created_at, updated_at) VALUES ('w1','keep','keep','en',1,1)"
    )
    await ensureSchema(adapter)
    const rows = await adapter.select<{ c: number }>('SELECT count(*) as c FROM words')
    expect(rows[0].c).toBe(1)
  })

  it('版本不一致：重建并清空数据', async () => {
    const { adapter } = await createRawTestDb()
    await ensureSchema(adapter)
    await adapter.execute(
      "INSERT INTO words (id, lemma, normalized_lemma, language, created_at, updated_at) VALUES ('w2','gone','gone','en',1,1)"
    )
    await adapter.execute(`PRAGMA user_version = ${SCHEMA_VERSION - 1}`)
    await ensureSchema(adapter)
    const rows = await adapter.select<{ c: number }>('SELECT count(*) as c FROM words')
    expect(rows[0].c).toBe(0)
    const v = await adapter.select<{ user_version: number }>('SELECT user_version FROM pragma_user_version')
    expect(v[0].user_version).toBe(SCHEMA_VERSION)
  })
})
