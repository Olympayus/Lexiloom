// src/providers/dictPath.ts
import { invoke } from '@tauri-apps/api/core'

const cache = new Map<string, Promise<string>>()

export function toSqliteUrl(resolvedPath: string): string {
  return `sqlite:${resolvedPath}`
}

export function resetDictPathCache(): void {
  cache.clear()
}

export function resolveDictPath(name: string): Promise<string> {
  if (!cache.has(name)) {
    cache.set(name, invoke<string>('dict_resource_path', { name }))
  }
  return cache.get(name)!
}
