import * as wordsDb from '../db/words'
import * as fieldsDb from '../db/fields'
import type { Word, WordWithPreview } from '../types/word'
import type { UpsertFieldValueInput } from '../types/field'
import { getFieldValuesForWord } from '../db/fields'
import { getDefinitions } from './fieldService'

export async function addWord(lemma: string): Promise<Word | null> {
  const existing = await wordsDb.getWordByLemma(lemma)
  if (existing.ok && existing.data) return existing.data

  const result = await wordsDb.createWord({ lemma })
  return result.ok ? result.data : null
}

// Merge fields into an existing word entry (dedup by field_id + value)
export async function mergeFields(
  wordId: string,
  fields: { key: string; value: string; source: 'ecdict' | 'wordnet' | 'user'; parentKey?: string }[]
): Promise<boolean> {
  const defs = await getDefinitions()
  const defMap = new Map(defs.map(d => [d.key, d]))
  const existingResult = await getFieldValuesForWord(wordId)
  if (!existingResult.ok) return false

  // Build dedup set from existing field values
  const existingSet = new Set<string>()
  for (const fv of existingResult.data) {
    existingSet.add(`${fv.fieldId}||${fv.value}`)
  }

  // Separate parent fields from child fields
  const parentInputs: { key: string; input: UpsertFieldValueInput }[] = []
  const childInputs: { parentKey: string; input: UpsertFieldValueInput }[] = []

  // Determine starting display_order
  const maxOrder = existingResult.data.reduce((max, fv) => Math.max(max, fv.displayOrder || 0), 0)
  let nextOrder = maxOrder + 1

  for (const field of fields) {
    const def = defMap.get(field.key)
    if (!def) continue

    const dedupKey = `${def.id}||${field.value}`
    if (existingSet.has(dedupKey)) continue

    if (field.parentKey) {
      // Child field: queue for insertion after parent is inserted
      childInputs.push({
        parentKey: field.parentKey,
        input: {
          wordId,
          fieldId: def.id,
          value: field.value,
          source: field.source,
          displayOrder: nextOrder++,
        },
      })
    } else {
      // Parent field: insert immediately to obtain real DB id
      parentInputs.push({
        key: field.key,
        input: {
          wordId,
          fieldId: def.id,
          value: field.value,
          source: field.source,
          displayOrder: nextOrder++,
        },
      })
    }
  }

  // Insert in order: parents first, then children with resolved parentId
  try {
    const parentIdMap = new Map<string, string>()
    for (const { key, input } of parentInputs) {
      const result = await fieldsDb.insertFieldValue(input)
      if (result.ok && result.data) {
        parentIdMap.set(key, result.data.id)
      }
    }
    for (const { parentKey, input } of childInputs) {
      const resolvedParentId = parentIdMap.get(parentKey) || null
      await fieldsDb.insertFieldValue({ ...input, parentId: resolvedParentId })
    }
    return true
  } catch (e) {
    console.error('mergeFields failed:', e)
    return false
  }
}

export async function deleteWord(id: string): Promise<boolean> {
  const result = await wordsDb.deleteWord(id)
  return result.ok
}

export async function getPreviews(): Promise<WordWithPreview[]> {
  const result = await wordsDb.getWordsWithPreviews()
  return result.ok ? result.data : []
}
