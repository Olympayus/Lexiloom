import * as fieldsDb from '../db/fields'
import type { FieldDefinition, FieldValue, UpsertFieldValueInput } from '../types/field'

// Simple in-memory cache for field definitions (avoids repeated DB reads)
let defsCache: FieldDefinition[] | null = null

export async function getDefinitions(): Promise<FieldDefinition[]> {
  if (defsCache) return defsCache
  const result = await fieldsDb.getFieldDefinitions()
  if (result.ok) {
    defsCache = result.data
    return result.data
  }
  return []
}

export function clearDefinitionsCache() {
  defsCache = null
}

export async function upsertValue(input: UpsertFieldValueInput): Promise<FieldValue | null> {
  const result = await fieldsDb.upsertFieldValue(input)
  return result.ok ? result.data : null
}

export async function getValues(wordId: string): Promise<Record<string, FieldValue | null>> {
  const result = await fieldsDb.getFieldValuesForWord(wordId)
  if (!result.ok) return {}
  const map: Record<string, FieldValue | null> = {}
  for (const fv of result.data) map[fv.fieldId] = fv
  return map
}
