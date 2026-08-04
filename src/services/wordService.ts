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

export interface MergeFieldInput {
  key: string
  value: string
  source: 'ecdict' | 'wordnet' | 'user'
  tempId?: string        // 父字段客户端临时 id
  parentTempId?: string  // 子字段引用父字段 tempId
}

// Merge fields into an existing word entry (dedup by field_id + value).
// Parents carry tempId; children reference that tempId via parentTempId so
// they attach to the exact inserted parent row (no compound-key guessing).
export async function mergeFields(wordId: string, fields: MergeFieldInput[]): Promise<boolean> {
  const defs = await getDefinitions()
  const defMap = new Map(defs.map(d => [d.key, d]))
  const existingResult = await getFieldValuesForWord(wordId)
  if (!existingResult.ok) return false

  const existingSet = new Set<string>()
  for (const fv of existingResult.data) existingSet.add(`${fv.fieldId}||${fv.value}`)

  const parentInputs: { tempId?: string; input: UpsertFieldValueInput }[] = []
  const childInputs: { parentTempId: string; input: UpsertFieldValueInput }[] = []

  const maxOrder = existingResult.data.reduce((max, fv) => Math.max(max, fv.displayOrder || 0), 0)
  let nextOrder = maxOrder + 1

  for (const field of fields) {
    const def = defMap.get(field.key)
    if (!def) continue
    const dedupKey = `${def.id}||${field.value}`
    if (existingSet.has(dedupKey)) continue
    if (field.parentTempId) {
      childInputs.push({ parentTempId: field.parentTempId, input: {
        wordId, fieldId: def.id, value: field.value, source: field.source, displayOrder: nextOrder++,
      } })
    } else {
      parentInputs.push({ tempId: field.tempId, input: {
        wordId, fieldId: def.id, value: field.value, source: field.source, displayOrder: nextOrder++,
      } })
    }
  }

  try {
    const tempIdMap = new Map<string, string>()
    for (const { tempId, input } of parentInputs) {
      const result = await fieldsDb.insertFieldValue(input)
      if (result.ok && result.data && tempId) tempIdMap.set(tempId, result.data.id)
    }
    for (const { parentTempId, input } of childInputs) {
      const resolvedParentId = tempIdMap.get(parentTempId) || null
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
