import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { useFocusTrap } from '../../lib/useFocusTrap'
import { useCategoryStore } from '../../stores/categoryStore'
import type { Category } from '../../types/category'
import { Button } from '../ui/Button'

// 规格 §6.2 分类色板（8 色），与 tokens.css --color-cat-1..8 一致
export const CATEGORY_COLORS = ['#7A7368', '#6B8E7F', '#4A6FA5', '#8B6A8B', '#C17A4E', '#B85450', '#5A7A8C', '#8B7355']

interface Props {
  open: boolean
  category: Category | null   // null = 新建模式；非 null = 编辑已有分类
  wordId: string              // 当前单词（编辑模式「从此单词移除」用）
  onClose: () => void
  onSaved?: (category: Category) => void
}

export default function CategoryEditorModal({ open, category, wordId, onClose, onSaved }: Props) {
  const { createCategory, updateCategory, deleteCategory, assignToWord, removeFromWord } = useCategoryStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const [description, setDescription] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [error, setError] = useState('')

  // 每次打开时按当前分类初始化表单
  useEffect(() => {
    if (!open) return
    setName(category?.name ?? '')
    setColor(category?.color ?? CATEGORY_COLORS[0])
    setDescription(category?.description ?? '')
    setIsDefault(category?.isDefault ?? false)
    setError('')
  }, [open, category])

  // Esc 关闭（§11 a11y 键盘可达；模态仅在 workbench 视图渲染，无与词典详情 Esc 冲突）
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(open, panelRef)

  if (!open) return null

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('分类名称必填'); return }
    if (category) {
      await updateCategory(category.id, {
        name: trimmed, color, description: description.trim() || null, isDefault,
      })
      onClose()
      return
    }
    const created = await createCategory({
      name: trimmed, color, description: description.trim() || undefined, isDefault,
    })
    if (!created) { setError('保存失败，请重试'); return }
    await assignToWord(wordId, created.id)  // 新建分类自动归入当前单词
    onClose()
    onSaved?.(created)
  }

  const handleRemoveFromWord = async () => {
    if (!category) return
    await removeFromWord(wordId, category.id)
    onClose()
  }

  const handleDelete = async () => {
    if (!category) return
    if (!window.confirm(`确定删除分类“${category.name}”吗？将从所有单词移除该分类。`)) return
    await deleteCategory(category.id)
    onClose()
  }

  const inputStyle: CSSProperties = {
    width: '100%', height: '36px', padding: '0 12px',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)', background: 'var(--color-surface)',
    color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)',
  }
  const labelStyle: CSSProperties = { fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '6px' }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'var(--color-scrim)', zIndex: 'var(--z-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ width: '360px', padding: '24px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-overlay)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: '16px' }}>
          {category ? '编辑分类' : '新建分类'}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={labelStyle}>分类名称</div>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-brand)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={labelStyle}>分类颜色</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CATEGORY_COLORS.map(c => (
              <button
                key={c}
                type="button"
                aria-label={`选择颜色 ${c}`}
                onClick={() => setColor(c)}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer',
                  border: `2px solid ${c === color ? 'var(--color-text-primary)' : 'transparent'}`,
                  background: c, transition: 'border-color var(--duration-fast) var(--ease-smooth), background-color var(--duration-fast) var(--ease-smooth)',
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={labelStyle}>分类描述 <span style={{ color: 'var(--color-text-tertiary)' }}>（可选）</span></div>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-brand)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
            style={inputStyle}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '16px', cursor: 'pointer' }}>
          <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
          设为默认分类（新建单词自动归入）
        </label>

        {error && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginBottom: '8px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '20px' }}>
          {category && (
            <>
              <button
                type="button"
                onClick={handleRemoveFromWord}
                style={{
                  marginRight: 'auto', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-sans)', padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                  transition: 'color var(--duration-fast) var(--ease-smooth), background-color var(--duration-fast) var(--ease-smooth)',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
              >
                从此单词移除
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-danger)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  padding: '6px 20px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  transition: 'background-color var(--duration-fast) var(--ease-smooth)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-danger) 8%, transparent)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface)' }}
              >
                删除分类
              </button>
            </>
          )}
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </div>
    </div>
  )
}
