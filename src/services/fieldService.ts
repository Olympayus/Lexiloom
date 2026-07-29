import * as fieldsDb from '../db/fields'
import type { FieldDefinition, FieldValue, UpsertFieldValueInput } from '../types/field'

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

// Single insert (no dedup check)
export async function insertValue(input: UpsertFieldValueInput): Promise<FieldValue | null> {
  const result = await fieldsDb.insertFieldValue(input)
  return result.ok ? result.data : null
}

// Batch insert multiple field values (used for dictionary imports)
export async function insertValues(inputs: UpsertFieldValueInput[]): Promise<FieldValue[]> {
  const results: FieldValue[] = []
  for (const input of inputs) {
    const result = await fieldsDb.insertFieldValue(input)
    if (result.ok && result.data) results.push(result.data)
  }
  return results
}

// Retained old interface (compatible with existing storage logic)
// Used by user edit flow (WordWorkbench) — properly upserts by (wordId, fieldId)
export async function upsertValue(input: UpsertFieldValueInput): Promise<FieldValue | null> {
  const result = await fieldsDb.upsertFieldValue(input)
  return result.ok ? result.data : null
}

export async function getValues(wordId: string): Promise<FieldValue[]> {
  const result = await fieldsDb.getFieldValuesForWord(wordId)
  if (!result.ok) return []

  // Build maps for tree aggregation
  const fvMap = new Map<string, FieldValue>()
  const childrenMap = new Map<string, FieldValue[]>()

  for (const fv of result.data) {
    fvMap.set(fv.id, { ...fv, children: [] })
    if (fv.parentId) {
      if (!childrenMap.has(fv.parentId)) childrenMap.set(fv.parentId, [])
      childrenMap.get(fv.parentId)!.push(fvMap.get(fv.id)!)
    }
  }

  // Attach children to parents
  for (const [parentId, children] of childrenMap) {
    const parent = fvMap.get(parentId)
    if (parent) parent.children = children
  }

  // Return root-level nodes (entries without a parentId)
  return result.data
    .filter(fv => !fv.parentId)
    .map(fv => ({ ...fv, children: childrenMap.get(fv.id) || [] }))
}
