// src/lib/menuPosition.ts
export function clampMenuPosition(
  x: number, y: number, width: number, height: number,
  vw = window.innerWidth, vh = window.innerHeight
): { x: number; y: number } {
  return {
    x: Math.max(4, Math.min(x, vw - width - 4)),
    y: Math.max(4, Math.min(y, vh - height - 4)),
  }
}
