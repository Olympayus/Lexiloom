import { useState } from 'react'
import type { TabKey } from '../../lib/tabs'
import { TAB_GROUPS } from '../../lib/tabs'
import ContextMenu from '../ui/ContextMenu'

interface TabBarProps {
  tabs: TabKey[]
  activeTab: TabKey
  missing: TabKey[]
  onSelect: (t: TabKey) => void
  onAddTab: (t: TabKey) => void
  onDeleteTab: (t: TabKey) => void
}

export default function TabBar({ tabs, activeTab, missing, onSelect, onAddTab, onDeleteTab }: TabBarProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [ctx, setCtx] = useState<{ tab: TabKey; x: number; y: number } | null>(null)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, padding: '4px 24px 0', background: '#F6F4EF', borderBottom: '2px solid #D9D4CE', position: 'relative', marginTop: 14 }}>
      {tabs.map(t => {
        const active = t === activeTab
        return (
          <button
            key={t}
            type="button"
            onClick={() => onSelect(t)}
            onContextMenu={e => { e.preventDefault(); setCtx({ tab: t, x: e.clientX, y: e.clientY }) }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#FAF9F6'; e.currentTarget.style.color = 'var(--color-brand)' } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' } }}
            style={{
              position: 'relative', padding: '7px 20px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              borderRadius: '8px 8px 0 0', zIndex: 1, border: 'none', fontFamily: 'var(--font-sans)',
              background: active ? '#FFFFFF' : 'transparent',
              color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              fontWeight: active ? 600 : 400,
              ...(active ? { border: '1px solid var(--color-border)', borderBottom: 'none', marginBottom: -2 } : {}),
            }}
          >
            {TAB_GROUPS[t].label}
          </button>
        )
      })}

      <div style={{ position: 'relative', marginLeft: 8, marginBottom: 5 }}>
        <button
          type="button" title="添加标签页" aria-label="添加标签页"
          onClick={() => setAddOpen(v => !v)}
          onMouseEnter={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(28,24,20,.14)'; e.currentTarget.style.color = 'var(--color-brand)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
          style={{
            width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent',
            cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 17, fontWeight: 600,
            lineHeight: 1, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          +
        </button>

        {addOpen && (
          <>
            {/* 点空白处关闭下拉（遮罩高于标签 z 1，低于下拉浮层 z-dropdown） */}
            <div className="fixed inset-0" style={{ zIndex: 2 }} onClick={() => setAddOpen(false)} />
            <div
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 4px)', minWidth: 120, padding: 4,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 6, boxShadow: 'var(--shadow-overlay)', zIndex: 'var(--z-dropdown)',
              }}
            >
              {missing.length === 0 && <div style={{ padding: '6px 10px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>无可添加的标签页</div>}
              {missing.map(t => (
                <button
                  key={t} type="button"
                  onClick={() => { setAddOpen(false); onAddTab(t) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: 'transparent', borderRadius: 4, cursor: 'pointer', fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}
                >
                  {TAB_GROUPS[t].label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 标签页右键菜单：打开 / 删除 */}
      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          onClose={() => setCtx(null)}
          items={[
            { key: 'open', label: '打开', onSelect: () => onSelect(ctx.tab) },
            { key: 'delete', label: '删除', danger: true, onSelect: () => onDeleteTab(ctx.tab) },
          ]}
        />
      )}
    </div>
  )
}
