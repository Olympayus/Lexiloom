import { describe, it, expect } from 'vitest'
import { mergeEntryFields, flattenTree, buildMergeInputs } from './dictPlan'
import type { DictionaryField } from '../types/dictionary'

const fields: DictionaryField[] = [
  { key: 'part_of_speech', value: 'n.', children: [
    { key: 'chinese_definition', value: '大气' },
    { key: 'english_definition', value: 'the atmosphere', children: [
      { key: 'synonyms', value: '', children: [{ key: 'synonym_item', value: 'air' }] },
    ] },
  ] },
  { key: 'exchange', value: '', children: [{ key: 'exchange_item', value: '过去式: observed' }] },
]

describe('mergeEntryFields', () => {
  it('同词性父按标签合并', () => {
    const merged = mergeEntryFields([
      { key: 'part_of_speech', value: 'n.', children: [{ key: 'chinese_definition', value: '大气' }] },
      { key: 'part_of_speech', value: 'n.', children: [{ key: 'english_definition', value: 'the atmosphere' }] },
      { key: 'part_of_speech', value: 'v.', children: [{ key: 'chinese_definition', value: '觉察' }] },
    ])
    const pos = merged.filter(f => f.key === 'part_of_speech')
    expect(pos).toHaveLength(2)
    expect(pos[0].children!.map(c => c.key)).toEqual(['chinese_definition', 'english_definition'])
  })
})

describe('flattenTree', () => {
  it('分配稳定路径 key 与 parentKey', () => {
    const flat = flattenTree(fields)
    expect(flat[0].key).toBe('0')
    expect(flat[0].children[0].key).toBe('0-0')
    expect(flat[0].children[1].children[0].key).toBe('0-1-0')
    expect(flat[0].children[1].parentKey).toBe('0')
  })
})

describe('buildMergeInputs', () => {
  it('父先子后，子引用父 tempId', () => {
    const sel = new Set(['0', '0-1', '0-1-0'])
    const inputs = buildMergeInputs(fields, sel, 'ecdict')
    expect(inputs.map(i => i.key)).toEqual(['part_of_speech', 'english_definition', 'synonyms'])
    expect(inputs[1].tempId).toBe('0-1')
    expect(inputs[2].parentTempId).toBe('0-1')
  })
  it('勾选子但漏勾父：自动隐式补选祖先（保证无游离释义）', () => {
    const inputs = buildMergeInputs(fields, new Set(['0-1-0']), 'wordnet')
    expect(inputs.map(i => i.key)).toEqual(['part_of_speech', 'english_definition', 'synonyms'])
  })
})
