import * as wordsDb from '../db/words'
import * as fieldsDb from '../db/fields'
import type { Word, WordWithPreview } from '../types/word'
import type { UpsertFieldValueInput } from '../types/field'
import { getFieldValuesForWord } from '../db/fields'
import { getDefinitions, renumberWordByTemplate } from './fieldService'
import { assignDefaultToWord } from './categoryService'

export async function addWord(lemma: string): Promise<Word | null> {
  const existing = await wordsDb.getWordByLemma(lemma)
  if (existing.ok && existing.data) return existing.data

  const result = await wordsDb.createWord({ lemma })
  if (result.ok && result.data) {
    await assignDefaultToWord(result.data.id)
  }
  return result.ok ? result.data : null
}

export interface MergeFieldInput {
  key: string
  value: string
  source: 'ecdict' | 'wordnet' | 'user'
  tempId?: string        // 父字段客户端临时 id
  parentTempId?: string  // 子字段引用父字段 tempId
}

// Merge fields into an existing word entry, deduping by PARENT scope (root or
// specific parent row) and renumbering the whole word by template order after
// each merge (spec §4.1). Parents carry tempId; children reference that tempId
// via parentTempId so they attach to the exact inserted parent row.
export async function mergeFields(wordId: string, fields: MergeFieldInput[]): Promise<boolean> {
  const defs = await getDefinitions()
  const defMap = new Map(defs.map(d => [d.key, d]))
  const existingResult = await getFieldValuesForWord(wordId)
  if (!existingResult.ok) return false

  // 按父作用域去重键：root 或父行 id
  const existingSet = new Set<string>()
  const existingIdMap = new Map<string, string>()
  for (const fv of existingResult.data) {
    const key = `${fv.parentId || 'root'}||${fv.fieldId}||${fv.value}`
    existingSet.add(key)
    existingIdMap.set(key, fv.id)
  }

  const parentInputs: { tempId?: string; input: UpsertFieldValueInput }[] = []
  const childInputs: { parentTempId: string; input: UpsertFieldValueInput }[] = []
  const tempIdMap = new Map<string, string>() // 父 tempId → 真实 id（已存在或新插）

  for (const field of fields) {
    const def = defMap.get(field.key)
    if (!def) continue
    if (field.parentTempId) {
      childInputs.push({ parentTempId: field.parentTempId, input: {
        wordId, fieldId: def.id, value: field.value, source: field.source,
      } })
    } else {
      parentInputs.push({ tempId: field.tempId, input: {
        wordId, fieldId: def.id, value: field.value, source: field.source,
      } })
    }
  }

  try {
    for (const { tempId, input } of parentInputs) {
      const key = `root||${input.fieldId}||${input.value}`
      if (!existingSet.has(key)) {
        const result = await fieldsDb.insertFieldValue(input)
        if (result.ok && result.data) {
          existingSet.add(key)
          existingIdMap.set(key, result.data.id)
        }
      }
      if (tempId) tempIdMap.set(tempId, existingIdMap.get(key) || '')
    }
    for (const { parentTempId, input } of childInputs) {
      const parentId = tempIdMap.get(parentTempId) || null
      const key = `${parentId || 'root'}||${input.fieldId}||${input.value}`
      if (existingSet.has(key)) continue
      const result = await fieldsDb.insertFieldValue({ ...input, parentId })
      if (result.ok && result.data) {
        existingSet.add(key)
        existingIdMap.set(key, result.data.id)
      }
    }
    await renumberWordByTemplate(wordId)
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
