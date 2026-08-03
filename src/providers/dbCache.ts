import Database from '@tauri-apps/plugin-sql'

// 词典库连接缓存：避免每次搜索重复打开 95MB/26MB 词典库。
// 已确认 tauri-plugin-sql 的 load 命令每次都会重新 DbPool::connect（commands.rs），无复用。
// 缓存 Promise 以同时去重并发 load；load 失败时清掉条目以便重试。
const dbCache = new Map<string, Promise<Database>>()

export function getCachedDb(path: string): Promise<Database> {
  let cached = dbCache.get(path)
  if (!cached) {
    cached = Database.load(path).catch(err => {
      dbCache.delete(path)
      throw err
    })
    dbCache.set(path, cached)
  }
  return cached
}
