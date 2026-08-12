import { useState } from 'react'
import { useCategoryStore } from '../../stores/categoryStore'
import { useUiStore } from '../../stores/uiStore'
import Icon from '../icons'

function CategoryRow({ cat, count, onEdit, onDelete }: {
  cat: { id: string; name: string; color: string; description?: string | null }
  count: number
  onEdit: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const btnBase = {
    width: '28px', height: '28px', border: 'none', background: 'transparent',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    opacity: hovered ? 1 : 0,
    transition: 'opacity var(--duration-fast) var(--ease-smooth), background-color var(--duration-fast) var(--ease-smooth), color var(--duration-fast) var(--ease-smooth)',
  }
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 10px', borderRadius: 'var(--radius-md)',
        background: hovered ? 'var(--color-surface-hover)' : 'transparent',
        transition: 'background-color var(--duration-fast) var(--ease-smooth)',
      }}
    >
      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>{cat.name}</div>
        {cat.description && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{cat.description}</div>}
      </div>
      {/* 计数常驻：数字等宽 + 汉字无衬线，同色 */}
      <span style={{ whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{count}</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}> 词</span>
      </span>
      <button type="button" title="编辑分类" aria-label="编辑分类" onClick={onEdit}
        style={{ ...btnBase, color: hovered ? 'var(--color-brand)' : 'var(--color-text-secondary)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        <Icon name="edit" size={16} />
      </button>
      <button type="button" title="删除分类" aria-label="删除分类" onClick={onDelete}
        style={{ ...btnBase, color: hovered ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-danger) 8%, transparent)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        <Icon name="trash" size={16} />
      </button>
    </div>
  )
}

export default function CategorySettings() {
  const categories = useCategoryStore(s => s.categories)
  const wordCategoryMap = useCategoryStore(s => s.wordCategoryMap)
  const deleteCategory = useCategoryStore(s => s.deleteCategory)
  const openEditor = useUiStore(s => s.openEditor)

  const countFor = (catId: string) =>
    Object.values(wordCategoryMap).filter(ids => ids.includes(catId)).length

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
          <CategoryRow
            key={cat.id}
            cat={cat}
            count={countFor(cat.id)}
            onEdit={() => openEditor(cat, null)}
            onDelete={async () => { if (await useUiStore.getState().confirm({ title: '删除分类', message: `确定删除分类"${cat.name}"吗？将从所有单词移除该分类。`, danger: true })) void deleteCategory(cat.id) }}
          />
        ))
      )}
    </div>
  )
}
