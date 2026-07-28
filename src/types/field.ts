export type FieldKey =
  | 'chinese_definition'
  | 'english_definition'
  | 'part_of_speech'
  | 'derivatives'
  | 'synonyms'
  | 'example_sentence'
  | 'usage_scenario'

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
}

export interface FieldDefinition {
  id: string
  name: string
  key: string
  fieldType: 'text' | 'multiline'
  displayOrder: number
  createdAt: number
}

export interface FieldValue {
  id: string
  wordId: string
  fieldId: string
  value: string
  source: 'cc-cedict' | 'user'
  createdAt: number
  updatedAt: number
}

export interface UpsertFieldValueInput {
  wordId: string
  fieldId: string
  value: string
  source: 'cc-cedict' | 'user'
}
