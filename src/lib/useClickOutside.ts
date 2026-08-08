import { useEffect, type RefObject } from 'react'

// 指针按下在 ref 之外时触发 onOutside（active 控制是否启用）
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  active = true
): void {
  useEffect(() => {
    if (!active) return
    const onPointerDown = (e: PointerEvent) => {
      const el = ref.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) onOutside()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [ref, onOutside, active])
}
