import { describe, it, expect } from 'vitest'
import { tooltipPosition } from './tooltipPosition'

describe('tooltipPosition', () => {
  it('常规位置：图标右侧打开', () => {
    const p = tooltipPosition({ left: 300, right: 316, top: 100 }, 320, 8, 1200)
    expect(p.x).toBe(324)
    expect(p.y).toBe(100)
  })
  it('右缘溢出且左侧可开：翻到左侧', () => {
    const p = tooltipPosition({ left: 900, right: 916, top: 100 }, 320, 8, 1200)
    expect(p.x).toBe(900 - 8 - 320)
  })
  it('y 钳制不小于 4', () => {
    const p = tooltipPosition({ left: 100, right: 116, top: 1 }, 320, 8, 1200)
    expect(p.y).toBe(4)
  })
})
