import { useCategoryStore } from '../../stores/categoryStore'
import { Button } from '../ui/Button'

interface Props {
  open: boolean
  wordId: string
  onClose: () => void
  onCreateNew: () => void
}

export default function CategoryAssignModal({ open, wordId, onClose, onCreateNew }: Props) {
  const { categories, wordCategoryIds, assignToWord, removeFromWord } = useCategoryStore()
  if (!open) return null

  const assigned = new Set(wordCategoryIds)

  const toggle = async (categoryId: string) => {
    if (assigned.has(categoryId)) {
      await removeFromWord(wordId, categoryId)
    } else {
      await assignToWord(wordId, categoryId)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,24,20,0.3)', zIndex: 'var(--z-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ width: '360px', padding: '24px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-overlay)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: '16px' }}>
          选择分类
        </div>

        <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '16px' }}>
          {categories.length === 0 ? (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
              还没有分类，点击下方「新建分类」创建
            </div>
          ) : (
            categories.map(cat => (
              <label
                key={cat.id}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
              >
                <input type="checkbox" checked={assigned.has(cat.id)} onChange={() => toggle(cat.id)} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', flex: 1, minWidth: 0 }}>{cat.name}</span>
              </label>
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onCreateNew}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 'var(--text-sm)', color: 'var(--color-brand)',
              fontFamily: 'var(--font-sans)', padding: '6px 8px', borderRadius: 'var(--radius-sm)',
              transition: 'background-color var(--duration-fast) var(--ease-smooth)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-brand-softer)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            + 新建分类
          </button>
          <Button variant="secondary" onClick={onClose}>完成</Button>
        </div>
      </div>
    </div>
  )
}
