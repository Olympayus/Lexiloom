import { describe, it, expect } from 'vitest'
import { getAncestors, isFieldVisible } from './fieldTree'

const ALL_ON = {
  phonetic: true, part_of_speech: true, chinese_definition: true,
  english_definition: true, example: true, synonyms: true, exchange: true,
} as const

describe('getAncestors', () => {
  it('返回含自身的祖先链', () => {
    expect(getAncestors('example')).toEqual(['part_of_speech', 'english_definition', 'example'])
    expect(getAncestors('phonetic')).toEqual(['phonetic'])
  })
})

describe('isFieldVisible 级联', () => {
  it('全开时全部可见', () => {
    expect(isFieldVisible('example', ALL_ON)).toBe(true)
    expect(isFieldVisible('phonetic', ALL_ON)).toBe(true)
  })
  it('英文释义关 → 例句/近义词有效关闭，中文释义不受影响', () => {
    const f = { ...ALL_ON, english_definition: false }
    expect(isFieldVisible('example', f)).toBe(false)
    expect(isFieldVisible('synonyms', f)).toBe(false)
    expect(isFieldVisible('chinese_definition', f)).toBe(true)
  })
  it('词性关 → 全部释义关闭，音标不受影响', () => {
    const f = { ...ALL_ON, part_of_speech: false }
    expect(isFieldVisible('chinese_definition', f)).toBe(false)
    expect(isFieldVisible('english_definition', f)).toBe(false)
    expect(isFieldVisible('phonetic', f)).toBe(true)
  })
})
