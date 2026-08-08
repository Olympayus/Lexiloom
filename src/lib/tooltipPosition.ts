// src/lib/tooltipPosition.ts
export interface RectLike { left: number; right: number; top: number }

export function tooltipPosition(
  rect: RectLike, panelWidth: number, gap: number, vw: number
): { x: number; y: number } {
  const canOpenLeft = rect.left - gap - panelWidth > 4
  const overflowRight = rect.right + gap + panelWidth > vw - 4
  const flipLeft = canOpenLeft && overflowRight
  return {
    x: flipLeft ? rect.left - gap - panelWidth : rect.right + gap,
    y: Math.max(4, rect.top),
  }
}
