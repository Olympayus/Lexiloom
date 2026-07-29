import type { FieldSource } from './field'

export interface DictionaryEntry {
  word: string
  normalizedWord: string
  source: 'ecdict' | 'wordnet'
  fields: DictionaryField[]
}

export interface DictionaryField {
  key: string
  value: string
  children?: DictionaryField[]
}

export interface PendingWord {
  lemma: string
  fieldSelections: {
    fieldKey: string
    value: string
    source: FieldSource
    selected: boolean
    parentFieldKey?: string
    children?: PendingWord['fieldSelections']
  }[]
}
