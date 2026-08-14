import { describe, it, expect } from 'vitest'
import { isChineseQuery, rankChineseResults } from './chineseSearch'

describe('isChineseQuery', () => {
  it('detects CJK characters', () => {
    expect(isChineseQuery('苹果')).toBe(true)
    expect(isChineseQuery('狗尾巴')).toBe(true)
    expect(isChineseQuery('dog')).toBe(false)
    expect(isChineseQuery('中英混合 app')).toBe(true)
    expect(isChineseQuery('')).toBe(false)
    expect(isChineseQuery('   ')).toBe(false)
  })
})

describe('rankChineseResults', () => {
  const rows = [
    { word: 'apple', translation: '苹果；苹果树' },
    { word: 'pineapple', translation: '菠萝' },
    { word: 'apply', translation: '申请；应用' },
    { word: 'pie', translation: '馅饼' },
    { word: 'applet', translation: '苹果汁' },
  ]
  it('returns only rows whose translation contains the query', () => {
    const result = rankChineseResults(rows, '苹果')
    expect(result).toContain('apple')
    expect(result).toContain('applet')
    expect(result).not.toContain('pineapple')
    expect(result).not.toContain('pie')
  })
  it('ranks exact translation match first', () => {
    const result = rankChineseResults(rows, '苹果')
    expect(result[0]).toBe('apple') // translation 恰好以「苹果」开头且等于整行前段
  })
  it('ranks earlier match position higher', () => {
    const early = rankChineseResults(
      [{ word: 'early', translation: '苹果在开头' }, { word: 'late', translation: '结尾才有苹果' }],
      '苹果'
    )
    expect(early[0]).toBe('early')
  })
  it('prefers shorter word when positions tie', () => {
    const result = rankChineseResults(
      [{ word: 'longlong', translation: 'x苹果' }, { word: 'ab', translation: 'x苹果' }],
      '苹果'
    )
    expect(result[0]).toBe('ab')
  })
  it('dedupes repeated words and caps at 20', () => {
    const dup = [{ word: 'a', translation: '苹果' }, { word: 'a', translation: '苹果' }]
    expect(rankChineseResults(dup, '苹果')).toEqual(['a'])
    const many = Array.from({ length: 25 }, (_, i) => ({ word: `w${i}`, translation: '苹果' }))
    expect(rankChineseResults(many, '苹果').length).toBe(20)
  })
})
