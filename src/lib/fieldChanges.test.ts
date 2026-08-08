import { describe, it, expect } from 'vitest'
import { hasFieldChanges } from './fieldChanges'

describe('hasFieldChanges', () => {
  it('未改动返回 false', () => {
    expect(hasFieldChanges('hello', 'hello')).toBe(false)
    expect(hasFieldChanges('', '')).toBe(false)
  })
  it('有改动返回 true', () => {
    expect(hasFieldChanges('hello', 'Hello')).toBe(true)
    expect(hasFieldChanges('', 'x')).toBe(true)
  })
})
