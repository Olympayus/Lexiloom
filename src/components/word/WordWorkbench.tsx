import { useState, useEffect, type CSSProperties } from 'react'
import { useWordStore } from '../../stores/wordStore'
import { getDefinitions } from '../../services/fieldService'
import { Button } from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import Icon from '../icons'
import CategoryCapsule from './CategoryCapsule'
import type { FieldDefinition, FieldValue } from '../../types/field'
import type { Category } from '../../types/category'

type FieldState = 'original' | 'edited' | 'personal'
const fieldState = (fv: FieldValue): FieldState =>
  fv.edited ? 'edited' : (fv.source === 'user' ? 'personal' : 'original')

const FIELD_STYLES: Record<FieldState, CSSProperties> = {
  original: { background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-weave-original)' },
  edited:   { background: 'var(--color-brand-softer)',  border: '1px solid var(--color-brand-soft)',  borderLeft: '3px solid var(--color-weave-edited)' },
  personal: { background: 'var(--color-accent-soft)',   border: '1px solid rgba(193,122,78,0.2)',      borderLeft: '3px solid var(--color-weave-personal)' },
}

export default function WordWorkbench() {
  const { words, selectedWordId, fieldValues, updateFieldValue, restoreFieldValue, deleteWord, addFieldValue } = useWordStore()
  const [defs, setDefs] = useState<FieldDefinition[]>([])
  const [editorMode, setEditorMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [entryValue, setEntryValue] = useState('')  // 进入编辑时的值
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [addFieldOpen, setAddFieldOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fadeIn, setFadeIn] = useState(true)

  // P4：分类数据为空（P5 接入真实数据）；胶囊区与「+」按钮仍渲染
  const categories: Category[] = []

  const selectedWord = words.find(w => w.id === selectedWordId)

  useEffect(() => {
    getDefinitions().then(defs => setDefs(defs))
  }, [])

  // Cleanup saved state after animation completes
  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 500)
      return () => clearTimeout(timer)
    }
  }, [saved])

  // Fade-in on word switch
  useEffect(() => {
    setFadeIn(false)
    const raf = requestAnimationFrame(() => setFadeIn(true))
    return () => cancelAnimationFrame(raf)
  }, [selectedWordId])

  if (!selectedWord) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState message="选择一个单词开始查看" />
      </div>
    )
  }

  const handleStartEdit = (fv: FieldValue) => {
    setEditingId(fv.id)
    setEditValue(fv.value || '')
    setEntryValue(fv.value || '')
  }

  // Recursively find a FieldValue by its id within the tree (root values + nested children)
  const findFieldValueById = (id: string, values: FieldValue[] = fieldValues): FieldValue | undefined => {
    for (const fv of values) {
      if (fv.id === id) return fv
      if (fv.children?.length) {
        const found = findFieldValueById(id, fv.children)
        if (found) return found
      }
    }
    return undefined
  }

  const handleSave = async () => {
    if (!editingId) return
    const fv = findFieldValueById(editingId)
    if (!fv) return
    if (editValue === entryValue) { setEditingId(null); return }  // 未真实修改：不置位
    if (fv.source === 'user') {
      await updateFieldValue(fv.id, { value: editValue })  // 个人字段保持 personal
    } else {
      await updateFieldValue(fv.id, {
        value: editValue,
        edited: true,
        originalValue: fv.originalValue ?? entryValue,  // 保留既有 original_value
      })
    }
    setEditingId(null)
    setSaved(true)
  }

  const handleDelete = async () => {
    if (!window.confirm(`确定删除单词“${selectedWord.lemma}”吗？此操作不可撤销。`)) return
    await deleteWord(selectedWord.id)
  }

  // 添加字段：选择定义 → 新增空个人字段 → 自动进入编辑态
  const handleAddField = async (def: FieldDefinition) => {
    setAddFieldOpen(false)
    const fv = await addFieldValue(def.id)
    if (!fv) return
    setEditingId(fv.id)
    setEditValue('')
    setEntryValue('')
  }

  // 头部音标/词性：从 fieldValues 经 defs 反查 key 提取（规格 §5.1）
  const defKeyByFieldId = new Map(defs.map(d => [d.id, d.key]))
  const phonetic = fieldValues.find(fv => defKeyByFieldId.get(fv.fieldId) === 'phonetic')?.value
  const posText = fieldValues
    .filter(fv => defKeyByFieldId.get(fv.fieldId) === 'part_of_speech')
    .map(fv => fv.value)
    .filter(Boolean)
    .join(' · ')
  const showPhoneticRow = Boolean(phonetic || posText)

  const sortedFieldValues = [...fieldValues].sort((a, b) => a.displayOrder - b.displayOrder)

  const renderField = (fv: FieldValue, depth: number = 0) => {
    const def = defs.find(d => d.id === fv.fieldId)
    if (!def) return null

    const hasChildren = fv.children && fv.children.length > 0
    const isContainer = hasChildren && !fv.value
    const isEditing = editingId === fv.id
    const isLevel1 = depth === 0
    const isPhonetic = def.key === 'phonetic'
    const state = fieldState(fv)

    return (
      <div
        key={fv.id}
        className="group"
        style={
          editorMode
            ? {
                ...FIELD_STYLES[state],
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                marginBottom: '2px',
                transition: 'all 200ms var(--ease-smooth)',
              }
            : {
                background: isLevel1 ? 'var(--color-surface-raised)' : 'transparent',
                border: isLevel1 ? '1px solid var(--color-border)' : 'none',
                borderRadius: 'var(--radius-md)',
                padding: isLevel1 ? '12px' : '10px 12px',
                marginBottom: isLevel1 ? '2px' : '0',
                transition: 'all 200ms var(--ease-smooth)',
              }
        }
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <span
            style={{
              width: isLevel1 ? '100px' : 'auto',
              minWidth: isLevel1 ? undefined : '80px',
              flexShrink: 0,
              fontSize: isLevel1 ? 'var(--text-sm)' : 'var(--text-xs)',
              fontWeight: 'var(--weight-medium)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {def.name}
          </span>
          {!isContainer && (
            <div
              style={{
                flex: 1,
                fontSize: isLevel1 ? 'var(--text-base)' : 'var(--text-sm)',
                color: editorMode && state === 'original' ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                lineHeight: isLevel1 ? 'var(--leading-relaxed)' : undefined,
                fontFamily: isPhonetic ? 'var(--font-phonetic)' : undefined,
              }}
            >
              {isEditing ? (
                <div className="space-y-2">
                  {def.fieldType === 'multiline' ? (
                    <textarea
                      className="w-full px-3 py-2 rounded text-sm outline-none resize-none min-h-[60px]"
                      style={{
                        border: '1px solid var(--color-brand)',
                        color: 'var(--color-text-primary)',
                        background: 'var(--color-surface)',
                        transition: `transform var(--duration-fast) var(--ease-smooth)`,
                        transform: 'scale(1.005)',
                      }}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <input
                      className="w-full px-3 py-1.5 rounded text-sm outline-none"
                      style={{
                        border: '1px solid var(--color-brand)',
                        color: 'var(--color-text-primary)',
                        background: 'var(--color-surface)',
                        transition: `transform var(--duration-fast) var(--ease-smooth)`,
                        transform: 'scale(1.005)',
                      }}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      autoFocus
                    />
                  )}
                  <div className="flex gap-2">
                    <Button onClick={handleSave}>保存</Button>
                    <Button variant="secondary" onClick={() => setEditingId(null)}>取消</Button>
                  </div>
                </div>
              ) : (
                <div onClick={() => handleStartEdit(fv)} style={{ cursor: 'pointer' }}>
                  {fv.value}
                </div>
              )}
            </div>
          )}
          {editorMode && state !== 'original' && (
            <span
              style={{
                flexShrink: 0,
                fontSize: 'var(--text-xs)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: state === 'edited' ? 'var(--color-brand-soft)' : 'rgba(193,122,78,0.15)',
                color: state === 'edited' ? 'var(--color-brand)' : 'var(--color-accent)',
                whiteSpace: 'nowrap',
              }}
            >
              {state === 'edited' ? '已编辑' : '个人'}
            </span>
          )}
          {state === 'edited' && (
            <div style={{ position: 'relative', flexShrink: 0, alignSelf: 'center' }}>
              <button
                type="button"
                title="更多操作"
                onClick={() => setMenuOpenId(menuOpenId === fv.id ? null : fv.id)}
                className="opacity-0 group-hover:opacity-100"
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  transition: 'opacity var(--duration-fast) var(--ease-smooth), color var(--duration-fast) var(--ease-smooth)',
                }}
              >
                <Icon name="more" size={16} />
              </button>
              {menuOpenId === fv.id && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 4px)',
                    minWidth: '120px',
                    padding: '4px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-overlay)',
                    zIndex: 'var(--z-dropdown)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setMenuOpenId(null); restoreFieldValue(fv.id) }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 10px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      color: 'var(--color-text-primary)',
                      fontSize: 'var(--text-sm)',
                      fontFamily: 'var(--font-sans)',
                      whiteSpace: 'nowrap',
                      transition: 'background var(--duration-fast) var(--ease-smooth), color var(--duration-fast) var(--ease-smooth)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-brand)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
                  >
                    还原原始值
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {hasChildren && (
          <div style={{ marginLeft: '24px', paddingLeft: '16px', borderLeft: '1px solid var(--color-border)', marginTop: '8px' }}>
            {fv.children!.map(child => renderField(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 100ms var(--ease-smooth)',
        height: '100%',
        overflowY: 'auto',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 40px 60px' }}>
        {/* 单词标题区（规格 §5.1） */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '6px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {saved && (
                  <div
                    style={{
                      width: '4px',
                      height: '24px',
                      background: 'var(--color-brand)',
                      borderRadius: '2px',
                      animation: 'weave-pulse 500ms var(--ease-smooth)',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 'var(--weight-bold)',
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.2,
                  }}
                >
                  {selectedWord.lemma}
                </div>
              </div>
              {showPhoneticRow && (
                <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>
                  {phonetic && <span style={{ fontFamily: 'var(--font-phonetic)' }}>{phonetic}</span>}
                  {phonetic && posText && <span> · </span>}
                  {posText && <span>{posText}</span>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <CategoryCapsule key={cat.id} category={cat} />
              ))}
              {/* 「+」虚线圆钮：P4 仅视觉，P5 接入新建/选择分类 */}
              <button
                title="添加分类"
                style={{
                  width: '24px',
                  height: '24px',
                  border: '1px dashed var(--color-border-strong)',
                  borderRadius: 'var(--radius-full)',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  transition: 'all var(--duration-fast) var(--ease-smooth)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--color-brand)'
                  e.currentTarget.style.borderColor = 'var(--color-brand)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--color-text-tertiary)'
                  e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                }}
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 分割线 */}
        <div style={{ height: '1px', background: 'var(--color-border-strong)', margin: '16px 0' }} />

        {/* 工具栏：编者模式开关（规格 §5.2，交互 Task 6 接入） */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            <span>编者模式</span>
            <button
              type="button"
              role="switch"
              aria-checked={editorMode}
              onClick={() => { setEditorMode(!editorMode); setMenuOpenId(null) }}
              style={{
                width: '36px',
                height: '20px',
                background: editorMode ? 'var(--color-brand)' : 'var(--color-border-strong)',
                borderRadius: 'var(--radius-full)',
                position: 'relative',
                flexShrink: 0,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-smooth)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: '2px',
                  width: '16px',
                  height: '16px',
                  background: '#FFFFFF',
                  borderRadius: '50%',
                  transition: 'transform var(--duration-fast) var(--ease-smooth)',
                  transform: editorMode ? 'translateX(16px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>
        </div>

        {/* 字段列表（非编者模式默认：统一微暖背景，无竖线无角标，规格 §5.2/§5.4） */}
        <div style={{ marginTop: '8px' }}>
          {sortedFieldValues.map(fv => renderField(fv, 0))}
        </div>

        {/* 添加字段（规格 §5.6 + D3）：虚线按钮 + 定义选择器浮层 */}
        <div style={{ position: 'relative', marginTop: '12px' }}>
          <button
            type="button"
            onClick={() => setAddFieldOpen(!addFieldOpen)}
            style={{
              width: '100%',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'all var(--duration-fast) var(--ease-smooth)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--color-brand)'
              e.currentTarget.style.borderColor = 'var(--color-brand)'
              e.currentTarget.style.background = 'var(--color-brand-softer)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--color-text-tertiary)'
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Icon name="plus" size={16} />
            添加字段
          </button>

          {addFieldOpen && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 'calc(100% + 4px)',
                maxHeight: '240px',
                overflowY: 'auto',
                padding: '4px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-overlay)',
                zIndex: 'var(--z-dropdown)',
              }}
            >
              {defs.map(def => (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => handleAddField(def)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap',
                    transition: 'background var(--duration-fast) var(--ease-smooth), color var(--duration-fast) var(--ease-smooth)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-brand)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
                >
                  {def.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 删除单词（最底部，危险操作，低调次级钮） */}
        <button
          type="button"
          onClick={handleDelete}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            margin: '24px auto 0',
            padding: '6px 12px',
            border: 'none',
            background: 'transparent',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'color var(--duration-fast) var(--ease-smooth), background var(--duration-fast) var(--ease-smooth)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--color-danger)'
            e.currentTarget.style.background = 'rgba(184,84,80,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--color-text-tertiary)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <Icon name="trash" size={16} />
          删除单词
        </button>
      </div>
    </div>
  )
}
