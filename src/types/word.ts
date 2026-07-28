export interface Word {
  id: string
  lemma: string
  normalizedLemma: string
  language: string
  createdAt: number
  updatedAt: number
}

export interface CreateWordInput {
  lemma: string
  language?: string
}

export interface WordWithPreview extends Word {
  chineseDefinition?: string
  partOfSpeech?: string
}
