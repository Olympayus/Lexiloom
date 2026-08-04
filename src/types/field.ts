export type FieldKey =
  | 'chinese_definition'
  | 'english_definition'
  | 'part_of_speech'
  | 'derivatives'
  | 'synonyms'
  | 'example_sentence'
  | 'usage_scenario'
  | 'phonetic'
  | 'exchange'
  | 'exchange_item'
  | 'example'

export const BUILTIN_FIELDS: Record<FieldKey, {
  name: string
  fieldType: 'text' | 'multiline'
  displayOrder: number
}> = {
  chinese_definition:  { name: '中文释义', fieldType: 'text',      displayOrder: 1 },
  english_definition:  { name: '英文释义', fieldType: 'multiline', displayOrder: 2 },
  part_of_speech:      { name: '词性',     fieldType: 'text',      displayOrder: 3 },
  derivatives:         { name: '派生词',   fieldType: 'text',      displayOrder: 4 },
  synonyms:            { name: '近义词',   fieldType: 'text',      displayOrder: 5 },
  example_sentence:    { name: '例句',     fieldType: 'multiline', displayOrder: 6 },
  usage_scenario:      { name: '使用场景', fieldType: 'multiline', displayOrder: 7 },
  phonetic:            { name: '音标',     fieldType: 'text',      displayOrder: 8 },
  exchange:            { name: '词形变化', fieldType: 'text',      displayOrder: 9 },
  exchange_item:       { name: '词形变化项', fieldType: 'text',    displayOrder: 10 },
  example:             { name: '例句',     fieldType: 'text',      displayOrder: 11 },
}

export interface FieldDefinition {
  id: string
  name: string
  key: string
  fieldType: 'text' | 'multiline'
  displayOrder: number
  createdAt: number
}

export type FieldSource = 'ecdict' | 'wordnet' | 'user'

export interface FieldValue {
  id: string
  wordId: string
  fieldId: string
  value: string
  source: FieldSource
  edited: boolean
  originalValue: string | null
  displayOrder: number
  parentId: string | null
  children?: FieldValue[]
  createdAt: number
  updatedAt: number
}

export interface UpsertFieldValueInput {
  wordId: string
  fieldId: string
  value: string
  source: FieldSource
  displayOrder?: number
  parentId?: string | null
}

// Partial content update for an existing field_value. `source` is intentionally
// NOT part of this input — a user edit must never re-label a dictionary field
// (ecdict/wordnet) as 'user'. Only the columns present are updated.
export interface FieldValueContentUpdate {
  value?: string
  edited?: boolean
  originalValue?: string | null
}
