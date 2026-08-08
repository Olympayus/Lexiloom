import type { DictionaryField } from '../types/dictionary'

export const POS_DISPLAY: Record<string, string> = { n: 'n.', v: 'v.', a: 'adj.', s: 'adj.', r: 'adv.' }

export function posDisplay(code: string): string {
  return POS_DISPLAY[code] || code
}

export interface SynsetInput {
  pos: string
  definition: string
  examples?: string | null
  words?: string | null
}

export function buildWordnetFields(word: string, synsets: SynsetInput[]): DictionaryField[] {
  const fields: DictionaryField[] = []
  const posParents = new Map<string, DictionaryField>()
  const getPos = (label: string): DictionaryField => {
    let p = posParents.get(label)
    if (!p) {
      p = { key: 'part_of_speech', value: label, children: [] }
      posParents.set(label, p)
      fields.push(p)
    }
    return p
  }

  for (const synset of synsets) {
    const children: DictionaryField[] = []
    if (synset.definition) children.push({ key: 'english_definition', value: synset.definition })
    const wordsList = synset.words
      ? synset.words.split('\n').map(w => w.trim()).filter(w => w && w.toLowerCase() !== word.toLowerCase())
      : []
    if (wordsList.length) {
      children.push({ key: 'synonyms', value: '', children: wordsList.map(w => ({ key: 'synonym_item', value: w })) })
    }
    const examples = synset.examples ? synset.examples.split('\n').filter(Boolean) : []
    if (examples.length) {
      children.push({ key: 'example_sentence', value: '', children: examples.map(ex => ({ key: 'example', value: ex })) })
    }
    getPos(posDisplay(synset.pos)).children!.push(...children)
  }
  return fields
}
