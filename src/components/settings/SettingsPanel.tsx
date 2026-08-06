import { useState, useEffect } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import Icon from '../icons'
import SearchSettings from './SearchSettings'
import SidebarSettings from './SidebarSettings'
import AboutSettings from './AboutSettings'

type SectionKey = 'search' | 'sidebar' | 'about'
const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'search', label: '搜索设置' },
  { key: 'sidebar', label: '侧边栏显示' },
  { key: 'about', label: '关于' },
]

// 设置面板（规格 §7.1）：480px 右侧滑出抽屉，覆盖层点击 / X / Esc 关闭
export default function SettingsPanel() {
  const open = useSettingsStore(s => s.settingsOpen)
  const closeSettings = useSettingsStore(s => s.closeSettings)
  const [active, setActive] = useState<SectionKey>('search')

  // Esc 关闭：capture 阶段拦截并 stopPropagation，避免穿透到词典详情的 bubble Esc（§7.1）
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeSettings() }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, closeSettings])

  const navStyle = (isActive: boolean): React.CSSProperties => ({
    width: '100%', display: 'block', textAlign: 'left', cursor: 'pointer',
    padding: '10px 20px', fontSize: 'var(--text-sm)',
    color: isActive ? 'var(--color-brand)' : 'var(--color-text-secondary)',
    background: isActive ? 'var(--color-brand-soft)' : 'transparent',
    fontWeight: isActive ? 'var(--weight-medium)' : 'var(--weight-regular)',
    fontFamily: 'var(--font-sans)',
    border: 'none',
    borderLeft: `2px solid ${isActive ? 'var(--color-brand)' : 'transparent'}`,
    transition: 'all var(--duration-fast) var(--ease-smooth)',
  })

  return (
    <>
      {/* 覆盖层：点击关闭；透明度随 open 过渡（规格 §7.1：200ms） */}
      <div
        onClick={closeSettings}
        aria-hidden={!open}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(28,24,20,0.3)', zIndex: 'var(--z-overlay)',
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 200ms var(--ease-smooth)',
        }}
      />
      {/* 抽屉：480px，translateX 滑入/滑出（规格 §7.1：200ms） */}
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        inert={!open}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px',
          background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)',
          zIndex: 'var(--z-modal)', display: 'flex',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 200ms var(--ease-smooth)',
        }}
      >
        <nav style={{
          width: '160px', flexShrink: 0, background: 'var(--color-canvas)',
          borderRight: '1px solid var(--color-border)', padding: '16px 0',
        }}>
          {SECTIONS.map(s => (
            <button key={s.key} type="button" onClick={() => setActive(s.key)} style={navStyle(active === s.key)}>
              {s.label}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
              {SECTIONS.find(s => s.key === active)!.label}
            </div>
            <button
              type="button"
              aria-label="关闭设置"
              title="关闭"
              onClick={closeSettings}
              style={{
                width: '36px', height: '36px', border: 'none', background: 'transparent',
                borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--color-text-secondary)',
                transition: 'all var(--duration-fast) var(--ease-smooth)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <div style={{ padding: '24px' }}>
            {active === 'search' && <SearchSettings />}
            {active === 'sidebar' && <SidebarSettings />}
            {active === 'about' && <AboutSettings />}
          </div>
        </div>
      </div>
    </>
  )
}
