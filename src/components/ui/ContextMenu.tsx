import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useClickOutside } from '../../lib/useClickOutside'
import { clampMenuPosition } from '../../lib/menuPosition'
import Icon from '../icons'

export interface MenuItem {
  key: string
  label: string
  onSelect?: () => void
  disabled?: boolean
  danger?: boolean
  children?: MenuItem[]
}

interface Props {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

const MENU_WIDTH = 168
const SUBMENU_WIDTH = 160
const ITEM_HEIGHT = 32

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [sub, setSub] = useState<string | null>(null)
  useClickOutside(ref, onClose, true)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onScroll = () => onClose()
    const onResize = () => onClose()
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [onClose])

  const height = items.length * ITEM_HEIGHT + 8
  const pos = clampMenuPosition(x, y, MENU_WIDTH, height)
  const submenuOpenLeft = x + MENU_WIDTH + SUBMENU_WIDTH + 8 > window.innerWidth

  const itemStyle = (item: MenuItem): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
    width: '100%', textAlign: 'left', padding: '0 10px', height: `${ITEM_HEIGHT}px`,
    border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)',
    cursor: item.disabled ? 'not-allowed' : 'pointer',
    color: item.danger ? 'var(--color-danger)' : (item.disabled ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)'),
    fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
    opacity: item.disabled ? 0.5 : 1,
    transition: 'background-color var(--duration-fast) var(--ease-smooth)',
  })

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 'var(--z-toast)',
        minWidth: MENU_WIDTH, padding: '4px',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-overlay)',
      }}
    >
      {items.map(item => (
        <div
          key={item.key}
          style={{ position: 'relative' }}
          onMouseEnter={() => setSub(item.children ? item.key : null)}
          onMouseLeave={() => setSub(prev => prev === item.key ? null : prev)}
        >
          <button
            type="button"
            disabled={item.disabled}
            onClick={() => { if (!item.children) { item.onSelect?.(); onClose() } }}
            style={itemStyle(item)}
          >
            <span>{item.label}</span>
            {item.children && <Icon name="chevron-right" size={14} />}
          </button>
          {sub === item.key && item.children && (
            <div style={{
              position: 'absolute', top: 0,
              left: submenuOpenLeft ? `-${SUBMENU_WIDTH}px` : '100%',
              minWidth: SUBMENU_WIDTH, padding: '4px',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-overlay)',
            }}>
              {item.children.map(child => (
                <button
                  key={child.key}
                  type="button"
                  disabled={child.disabled}
                  onClick={() => { child.onSelect?.(); onClose() }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  style={itemStyle(child)}
                >
                  <span>{child.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>,
    document.body
  )
}
