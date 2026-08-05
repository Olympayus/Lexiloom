import { useRef, type CSSProperties } from 'react'
import type { WordWithPreview } from '../../types/word'
import type { Category } from '../../types/category'
import type { SidebarMode } from '../../lib/sidebar'
import Icon from '../icons'

interface Props {
  word: WordWithPreview
  categories: Category[]   // 该单词的分类（展开胶囊 / 收起色圈）
  selected: boolean
  collapsed: boolean       // 侧边栏收起态
  mode: SidebarMode
  onClick: () => void
}

function hexToRgb(hex: string): string {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

export default function WordListItem({ word, categories, selected, collapsed, mode, onClick }: Props) {
  // 音标释义行（规格 §4.2）：{音标} · {词性} {首释义}，· 仅在两者都存在时显示
  const hasMeta = Boolean(word.phonetic || word.partOfSpeech || word.chineseDefinition)
  const collapsedDots = categories.slice(0, 3)   // 收起态色圈限 3 个：匹配 COLLAPSED_CHROME_ALPHABET 的 3 色圈宽度（27px）
  const lineRef = useRef<HTMLDivElement>(null)

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: collapsed ? 'center' : 'flex-start',
    gap: '10px',
    padding: collapsed ? (mode === 'alphabet' ? '6px 10px' : '6px 8px') : '8px 12px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    position: 'relative',
    background: selected ? 'var(--color-surface)' : 'transparent',
    transition: 'all var(--duration-fast) var(--ease-smooth)',
    justifyContent: collapsed && mode === 'category' ? 'center' : undefined,
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="group"
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      style={containerStyle}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        if (!selected) el.style.background = 'var(--color-surface-hover)'
        el.style.transform = collapsed ? 'translateX(0)' : 'translateX(2px)'
        if (!selected && lineRef.current) {
          lineRef.current.style.background = 'var(--color-text-secondary)'
          lineRef.current.style.opacity = '1'
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = selected ? 'var(--color-surface)' : 'transparent'
        el.style.transform = 'translateX(0)'
        if (lineRef.current) {
          lineRef.current.style.background = selected ? 'var(--color-brand)' : 'var(--color-border)'
          lineRef.current.style.opacity = selected ? '1' : '0.5'
        }
      }}
    >
      {/* 编织线（规格 §4.4）：默认 3px 50% 透明，悬停 text-secondary 实色，选中 brand 4px */}
      <div ref={lineRef} style={{
        width: selected ? '4px' : '3px',
        alignSelf: 'stretch',
        background: selected ? 'var(--color-brand)' : 'var(--color-border)',
        borderRadius: 'var(--radius-full)',
        opacity: selected ? 1 : 0.5,
        flexShrink: 0,
        transition: 'all var(--duration-fast) var(--ease-smooth)',
      }} />

      {collapsed ? (
        <>
          {/* 收起态单词名（字母模式左对齐 + 色圈；分类模式居中） */}
          <div style={{
            flex: 1, minWidth: 0,
            fontFamily: 'var(--font-serif)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)',
            color: 'var(--color-text-primary)', lineHeight: 1.3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textAlign: mode === 'category' ? 'center' : 'left',
          }}>
            {word.lemma}
          </div>
          {mode === 'alphabet' && collapsedDots.length > 0 && (
            <div style={{ display: 'flex', gap: '3px', flexShrink: 0, alignItems: 'center' }}>
              {collapsedDots.map(c => (
                <span key={c.id} style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.color }} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)',
              color: 'var(--color-text-primary)', lineHeight: 1.3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {word.lemma}
            </div>
            {hasMeta && (
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {word.phonetic && <span style={{ fontFamily: 'var(--font-phonetic)' }}>{word.phonetic}</span>}
                {word.phonetic && (word.partOfSpeech || word.chineseDefinition) && <span> · </span>}
                {word.partOfSpeech && <span>{word.partOfSpeech}</span>}
                {word.partOfSpeech && word.chineseDefinition && <span> </span>}
                {word.chineseDefinition && <span>{word.chineseDefinition}</span>}
              </div>
            )}
            {categories.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                {categories.map(c => (
                  <span key={c.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px', height: '18px', padding: '0 8px',
                    borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)',
                    background: `rgba(${hexToRgb(c.color)}, 0.12)`, color: c.color, whiteSpace: 'nowrap',
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* 悬停箭头（规格 §4.4）：opacity 0→1 */}
          <div className="opacity-0 group-hover:opacity-100" style={{
            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-text-tertiary)', transition: 'opacity var(--duration-fast) var(--ease-smooth)',
            pointerEvents: 'none',
          }}>
            <Icon name="arrow-right" size={14} />
          </div>
        </>
      )}
    </div>
  )
}
