import { describe, it, expect } from 'vitest'
import { sortLemmasByRelevance } from './lemmaSort'

describe('sortLemmasByRelevance', () => {
  it('精确匹配排最前（surplus 场景）', () => {
    expect(sortLemmasByRelevance('surplus', ['surplusage', 'surpluses', 'surpluse', 'surplus']))
      .toEqual(['surplus', 'surpluse', 'surpluses', 'surplusage'])
  })
  it('同前缀按长度升序，再字母序', () => {
    expect(sortLemmasByRelevance('run', ['running', 'run', 'runner'])).toEqual(['run', 'runner', 'running'])
  })
  it('精确匹配大小写不敏感', () => {
    expect(sortLemmasByRelevance('Surplus', ['SURPLUS', 'surplusage'])).toEqual(['SURPLUS', 'surplusage'])
  })
  it('不修改原数组', () => {
    const input = ['b', 'a']
    sortLemmasByRelevance('b', input)
    expect(input).toEqual(['b', 'a'])
  })
})
