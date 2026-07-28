export type DbResult<T> = { ok: true; data: T } | { ok: false; error: string }
