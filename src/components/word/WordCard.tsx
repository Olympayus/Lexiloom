import type { Word } from '../../types/word'

interface Props {
  word: Word
  isSelected: boolean
  onClick: () => void
  chineseDefinition?: string
  partOfSpeech?: string
  hasCustomContent?: boolean
}

export default function WordCard({ word, isSelected, onClick, chineseDefinition, partOfSpeech, hasCustomContent }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'stretch',
        gap: '12px',
        border: 'none',
        background: isSelected ? 'var(--color-surface)' : 'transparent',
        cursor: 'pointer',
        transition: 'background-color var(--duration-fast) var(--ease-out-smooth), transform var(--duration-fast) var(--ease-out-smooth)',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)'
        }
        (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)'
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
        }
        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'
      }}
    >
      {/* 左侧线标记 */}
      <div style={{
        width: isSelected ? '4px' : '3px',
        borderRadius: '999px',
        flexShrink: 0,
        background: hasCustomContent ? 'var(--color-brand)' : (isSelected ? 'var(--color-brand)' : 'var(--color-border)'),
        transition: 'width var(--duration-fast) var(--ease-out-smooth), background var(--duration-fast) var(--ease-out-smooth)',
      }} />

      {/* 内容 */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          color: 'var(--color-text-primary)',
          fontWeight: 500,
          fontFamily: 'var(--font-word)',
          fontSize: '16px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {word.lemma}
        </div>
        <div style={{
          color: 'var(--color-text-secondary)',
          fontSize: '13px',
          fontFamily: 'var(--font-ui)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {[chineseDefinition, partOfSpeech].filter(Boolean).join(' · ') || ''}
        </div>
      </div>

      {/* 右侧箭头指示器 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        opacity: isSelected ? 1 : 0,
        transition: 'opacity var(--duration-fast) var(--ease-out-smooth)',
        color: 'var(--color-text-secondary)',
        fontSize: '14px',
      }}>
        →
      </div>
    </button>
  )
}
