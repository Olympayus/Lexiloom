import { describe, it, expect } from 'vitest'
import { clampMenuPosition } from './menuPosition'

describe('clampMenuPosition', () => {
  it('中间位置保持原坐标', () => {
    expect(clampMenuPosition(100, 100, 168, 100, 800, 600)).toEqual({ x: 100, y: 100 })
  })
  it('右/下越界时钳制在视口内', () => {
    const p = clampMenuPosition(700, 560, 168, 100, 800, 600)
    expect(p.x).toBeLessThanOrEqual(800 - 168 - 4)
    expect(p.y).toBeLessThanOrEqual(600 - 100 - 4)
  })
  it('不越界时不上提', () => {
    expect(clampMenuPosition(50, 50, 168, 100, 800, 600)).toEqual({ x: 50, y: 50 })
  })
})
