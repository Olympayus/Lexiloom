import { useState, useEffect } from 'react'
import { useWordStore } from '../../stores/wordStore'
import { getDefinitions } from '../../services/fieldService'
import { Button } from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import type { FieldDefinition, FieldValue } from '../../types/field'

export default function WordWorkbench() {
  const { words, selectedWordId, fieldValues, updateFieldValue, deleteWord } = useWordStore()
  const [defs, setDefs] = useState<FieldDefinition[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saved, setSaved] = useState(false)
  const [fadeIn, setFadeIn] = useState(true)

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

  const handleStartEdit = (fvId: string, currentValue: string) => {
    setEditing(fvId)
    setEditValue(currentValue || '')
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

  const handleSave = async (fvId: string) => {
    const fv = findFieldValueById(fvId)
    if (!fv) return
    await updateFieldValue(fv.id, { value: editValue })
    setEditing(null)
    setSaved(true)
  }

  const handleDelete = async () => {
    if (!window.confirm(`确定删除单词“${selectedWord.lemma}”吗？此操作不可撤销。`)) return
    await deleteWord(selectedWord.id)
  }

  const sortedFieldValues = [...fieldValues].sort((a, b) => a.displayOrder - b.displayOrder)

  const renderField = (fv: FieldValue, depth: number = 0) => {
    const def = defs.find(d => d.id === fv.fieldId)
    if (!def) return null

    const hasChildren = fv.children && fv.children.length > 0
    const isContainer = hasChildren && !fv.value
    const isEditing = editing === fv.id

    return (
      <div key={fv.id} className="pb-3"
        style={{
          borderBottom: depth === 0 ? '1px solid var(--color-border)' : 'none',
          paddingLeft: depth * 20,
          marginBottom: hasChildren ? '0' : '8px',
        }}>
        {depth === 0 && !isContainer && (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
            {def.name}
          </div>
        )}
        {isContainer && (
          <div style={{
            color: 'var(--color-text-secondary)',
            fontSize: '14px',
            fontWeight: 600,
            padding: '8px 0',
            marginBottom: '8px',
          }}>
            {def.name}
          </div>
        )}
        {!isContainer && (
          isEditing ? (
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
                <Button onClick={() => handleSave(fv.id)}>保存</Button>
                <Button variant="secondary" onClick={() => setEditing(null)}>取消</Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => handleStartEdit(fv.id, fv.value || '')}
              style={{
                padding: '10px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--color-text-primary)',
                background: fv.source !== 'user' ? 'var(--color-canvas)' : 'var(--color-surface)',
                border: `1px solid ${fv.source !== 'user' ? 'var(--color-border)' : 'var(--color-brand)'}`,
                transition: 'all var(--duration-fast) var(--ease-smooth)',
              }}
            >
              {fv.value}
              {fv.source !== 'user' && (
                <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  📖 {fv.source}
                </span>
              )}
            </div>
          )
        )}
        {hasChildren && fv.children!.map(child => renderField(child, depth + 1))}
      </div>
    )
  }

  return (
    <div style={{
      opacity: fadeIn ? 1 : 0,
      transition: 'opacity 100ms var(--ease-smooth)',
      height: '100%',
      overflowY: 'auto',
      padding: '24px',
    }}>
      {/* 单词标题 */}
      <div className="mb-6">
        <div className="flex items-center">
          {saved && (
            <div style={{
              width: '4px',
              height: '24px',
              background: 'var(--color-brand)',
              borderRadius: '2px',
              animation: 'weave-pulse 500ms var(--ease-smooth)',
              marginRight: '8px',
              flexShrink: 0,
              display: 'inline-block',
              verticalAlign: 'middle',
            }} />
          )}
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{selectedWord.lemma}</h2>
          <button
            className="ml-auto"
            onClick={handleDelete}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'color var(--duration-fast) var(--ease-smooth), border-color var(--duration-fast) var(--ease-smooth)',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
          >
            删除
          </button>
        </div>
      </div>

      {/* 层级字段展示 */}
      <div className="space-y-4">
        {sortedFieldValues.map(fv => renderField(fv, 0))}
      </div>
    </div>
  )
}
