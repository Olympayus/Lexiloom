import { useCategoryStore } from '../../stores/categoryStore'
import { useUiStore } from '../../stores/uiStore'
import Icon from '../icons'

export default function CategorySettings() {
  const categories = useCategoryStore(s => s.categories)
  const deleteCategory = useCategoryStore(s => s.deleteCategory)
  const openEditor = useUiStore(s => s.openEditor)

  return (
    <div>
      <button
        type="button"
        onClick={() => openEditor(null, null)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px',
          padding: '8px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
          border: '1px dashed var(--color-border-strong)', background: 'transparent',
          color: 'var(--color-brand)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
          transition: 'background-color var(--duration-fast) var(--ease-smooth), border-color var(--duration-fast) var(--ease-smooth)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-brand-softer)'; e.currentTarget.style.borderColor = 'var(--color-brand)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-border-strong)' }}
      >
        <Icon name="plus" size={16} />
        新建分类
      </button>

      {categories.length === 0 ? (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
          暂无分类，点击上方「新建分类」创建
        </div>
      ) : (
        categories.map(cat => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>{cat.name}</div>
              {cat.description && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{cat.description}</div>}
            </div>
            <button
              type="button" title="编辑分类" aria-label="编辑分类"
              onClick={() => openEditor(cat, null)}
              style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-brand)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            >
              <Icon name="edit" size={16} />
            </button>
            <button
              type="button" title="删除分类" aria-label="删除分类"
              onClick={() => { if (window.confirm(`确定删除分类“${cat.name}”吗？将从所有单词移除该分类。`)) void deleteCategory(cat.id) }}
              style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-danger) 8%, transparent)'; e.currentTarget.style.color = 'var(--color-danger)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ))
      )}
    </div>
  )
}
