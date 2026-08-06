import { describe, it, expect } from 'vitest'
import { formatPhonetic } from './phonetic'

describe('formatPhonetic 音标斜杠', () => {
  it('无斜杠值两侧加斜杠', () => {
    expect(formatPhonetic('bru:')).toBe('/bru:/')
  })

  it('已含斜杠不重复加', () => {
    expect(formatPhonetic('/bruː/')).toBe('/bruː/')
  })

  it('去掉首尾空白', () => {
    expect(formatPhonetic('  bru:  ')).toBe('/bru:/')
  })
})
