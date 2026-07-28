import { useState, useEffect } from 'react'
import { useWordStore } from '../../stores/wordStore'
import { getDefinitions } from '../../services/fieldService'
import { Button } from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import type { FieldDefinition, FieldKey } from '../../types/field'

export default function WordWorkbench() {
  const { words, selectedWordId, fieldValues, updateFieldValue } = useWordStore()
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

  const handleStartEdit = (fieldId: string, currentValue: string) => {
    setEditing(fieldId)
    setEditValue(currentValue || '')
  }

  const handleSave = async (fieldId: string) => {
    const def = defs.find(d => d.id === fieldId)
    if (def) {
      await updateFieldValue(def.key as FieldKey, editValue)
    }
    setEditing(null)
    setSaved(true)
  }

  return (
    <div style={{
      opacity: fadeIn ? 1 : 0,
      transition: 'opacity 100ms var(--ease-out-smooth)',
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
              animation: 'weave-pulse 500ms var(--ease-out-smooth)',
              marginRight: '8px',
              flexShrink: 0,
              display: 'inline-block',
              verticalAlign: 'middle',
            }} />
          )}
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{selectedWord.lemma}</h2>
        </div>
      </div>

      {/* 字段列表 */}
      <div className="space-y-4">
        {defs.map(def => {
          const fv = fieldValues[def.id]
          const hasValue = fv && fv.value?.trim()
          const isEditing = editing === def.id

          // Empty field: dashed border placeholder
          if (!hasValue && !isEditing) {
            return (
              <div key={def.id} className="pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>{def.name}</div>
                <div
                  onClick={() => handleStartEdit(def.id, '')}
                  style={{
                    border: '1px dashed var(--color-border)',
                    borderRadius: '4px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                    fontSize: '13px',
                    background: 'var(--color-surface)',
                    transition: `border-color var(--duration-fast) var(--ease-out-smooth)`,
                  }}
                >
                  点击添加…
                </div>
              </div>
            )
          }

          // Has value or currently editing
          return (
            <div key={def.id} className="pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>{def.name}</div>
              {isEditing ? (
                <div className="space-y-2">
                  {def.fieldType === 'multiline' ? (
                    <textarea
                      className="w-full px-3 py-2 rounded text-sm outline-none resize-none min-h-[60px]"
                      style={{
                        border: '1px solid var(--color-brand)',
                        color: 'var(--color-text-primary)',
                        background: 'var(--color-surface)',
                        transition: `transform var(--duration-fast) var(--ease-out-smooth)`,
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
                        transition: `transform var(--duration-fast) var(--ease-out-smooth)`,
                        transform: 'scale(1.005)',
                      }}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      autoFocus
                    />
                  )}
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave(def.id)}>保存</Button>
                    <Button variant="secondary" onClick={() => setEditing(null)}>取消</Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => handleStartEdit(def.id, fv?.value || '')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--color-text-primary)',
                    background: fv?.source === 'cc-cedict' ? 'var(--color-canvas)' : 'var(--color-surface)',
                    border: `1px solid ${fv?.source === 'cc-cedict' ? 'var(--color-border)' : 'var(--color-brand)'}`,
                    transition: `all var(--duration-fast) var(--ease-out-smooth)`,
                  }}
                >
                  {fv?.value}
                  {fv?.source === 'cc-cedict' && (
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>📖 词典</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
