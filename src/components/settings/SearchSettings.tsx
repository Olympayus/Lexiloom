import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSettingsStore, type OnlineSourceKey } from '../../stores/settingsStore'
import { Toggle } from '../ui/Toggle'
import Icon from '../icons'
import { tooltipPosition } from '../../lib/tooltipPosition'
import { FIELD_TREE, getAncestors, type FieldTreeNode } from '../../lib/fieldTree'

// 在线词典来源（规格 §7.3）
const ONLINE_SOURCES: { key: OnlineSourceKey; name: string; url: string }[] = [
  { key: 'oxford', name: '牛津高阶', url: 'oxfordlearnersdictionaries.com' },
  { key: 'longman', name: '朗文当代', url: 'ldoceonline.com' },
  { key: 'collins', name: '柯林斯', url: 'collinsdictionary.com' },
  { key: 'merriam', name: '韦氏词典', url: 'merriam-webster.com' },
]

// 词典字段覆盖说明（规格 §7.3 悬浮框内容）
const TOOLTIP_DICTS: { name: string; lines: string[] }[] = [
  { name: 'ECDICT', lines: ['✓ 音标 ✓ 词性 ✓ 中文释义', '✓ 英文释义 ✓ 词形变化 ✗ 例句', '✗ 词源'] },
  { name: 'WordNet', lines: ['✗ 音标 ✓ 词性 ✗ 中文释义', '✓ 英文释义 ✓ 近义词 ✓ 例句', '✗ 词形变化 ✗ 词源'] },
]

const SECTION_TITLE: React.CSSProperties = { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--color-text-primary)' }

// 树形开关行：父级行名加粗，子条目装入分块外框；父关 → 后代置灰禁用（Model B，不改存储）
function FieldRow({ node }: { node: FieldTreeNode }) {
  const displayFields = useSettingsStore(s => s.displayFields)
  const setDisplayField = useSettingsStore(s => s.setDisplayField)
  const chain = getAncestors(node.key)
  const ancestorOff = chain.slice(1).some(k => !displayFields[k])
  const effective = !ancestorOff && displayFields[node.key]
  const isParent = !!node.children && node.children.length > 0

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px',
          borderRadius: 'var(--radius-md)',
          transition: 'background-color var(--duration-fast) var(--ease-smooth)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{
          fontSize: 'var(--text-sm)',
          fontWeight: isParent ? 'var(--weight-semibold)' : 'var(--weight-regular)',
          color: 'var(--color-text-primary)',
        }}>
          {node.label}
        </span>
        <span style={{ flex: 1 }} />
        <Toggle
          checked={effective}
          disabled={ancestorOff}
          onChange={on => setDisplayField(node.key, on)}
          aria-label={`${node.label}开关`}
        />
      </div>
      {isParent && (
        <div style={{
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface-raised)', padding: '4px 0',
          margin: '4px 0 6px',
        }}>
          {node.children!.map(c => <FieldRow key={c.key} node={c} />)}
        </div>
      )}
    </div>
  )
}

export default function SearchSettings() {
  const onlineDictEnabled = useSettingsStore(s => s.onlineDictEnabled)
  const setOnlineDictEnabled = useSettingsStore(s => s.setOnlineDictEnabled)
  const onlineSources = useSettingsStore(s => s.onlineSources)
  const setOnlineSource = useSettingsStore(s => s.setOnlineSource)

  // 信息悬浮框：Hover 300ms 显示、100ms 消失（规格 §7.3）
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const infoRef = useRef<HTMLSpanElement>(null)

  const handleInfoEnter = () => {
    clearTimeout(hideTimer.current)
    showTimer.current = setTimeout(() => {
      const rect = infoRef.current?.getBoundingClientRect()
      if (!rect) return
      const panelWidth = 320
      const gap = 8
      const pos = tooltipPosition({ left: rect.left, right: rect.right, top: rect.top }, panelWidth, gap, window.innerWidth)
      setTooltip({ visible: true, x: pos.x, y: pos.y })
    }, 300)
  }
  const handleInfoLeave = () => {
    clearTimeout(showTimer.current)
    hideTimer.current = setTimeout(() => setTooltip(t => ({ ...t, visible: false })), 100)
  }

  return (
    <>
      {/* 词典返回词条（规格 §7.3） */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ ...SECTION_TITLE, marginBottom: '12px' }}>
          词典返回词条
          <span
            ref={infoRef}
            onMouseEnter={handleInfoEnter}
            onMouseLeave={handleInfoLeave}
            style={{ display: 'inline-flex', verticalAlign: 'middle', color: 'var(--color-text-tertiary)', cursor: 'help', marginLeft: '4px' }}
          >
            <Icon name="info" size={16} />
          </span>
        </div>
        {FIELD_TREE.map(node => <FieldRow key={node.key} node={node} />)}
      </div>

      {/* 在线词典查询：与「词典返回词条」同级标题（规格 §7.3 勘误） */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={SECTION_TITLE}>在线词典查询</span>
          <Toggle checked={onlineDictEnabled} onChange={setOnlineDictEnabled} aria-label="在线词典查询开关" />
        </div>
        {onlineDictEnabled && (
          <div style={{ marginTop: '8px' }}>
            {ONLINE_SOURCES.map(s => (
              <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={onlineSources[s.key]} onChange={e => setOnlineSource(s.key, e.target.checked)} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>{s.name}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{s.url}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 悬浮框：createPortal 到 body，脱离抽屉 transform 容器（§7.3） */}
      {tooltip.visible && createPortal(
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y, zIndex: 'var(--z-toast)',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-overlay)',
          padding: '16px', width: '320px', fontSize: 'var(--text-sm)',
        }}>
          <div style={{ fontWeight: 'var(--weight-semibold)', marginBottom: '8px', color: 'var(--color-text-primary)' }}>词典字段覆盖说明</div>
          {TOOLTIP_DICTS.map(d => (
            <div key={d.name} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 'var(--weight-medium)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>{d.name}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {d.lines.map(l => <div key={l}>{l}</div>)}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: '8px', fontStyle: 'italic' }}>
            ✗ 表示该词典本身不包含此字段，与您的开关设置无关。
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
