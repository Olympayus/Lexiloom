export interface DictionaryEntry {
  word: string
  normalizedWord: string
  source: 'cc-cedict'
  fields: DictionaryField[]
}

export interface DictionaryField {
  key: string
  value: string
}

export interface PendingWord {
  lemma: string
  fieldSelections: {
    fieldKey: string
    value: string
    source: 'cc-cedict' | 'user'
    selected: boolean
  }[]
}
