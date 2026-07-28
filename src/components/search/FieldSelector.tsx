import { useState, useEffect } from 'react'
import { getFieldDefinitions, upsertFieldValue } from '../../db/fields'
import { useWordStore } from '../../stores/wordStore'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../ui/Button'
import type { FieldDefinition } from '../../types/field'

export default function FieldSelector() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const addWord = useWordStore(s => s.addWord)
  const selectWord = useWordStore(s => s.selectWord)

  const lemma = params.get('lemma') || ''
  const dictDefinition = params.get('word') || ''

  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getFieldDefinitions().then(r => {
      if (r.ok) {
        setFields(r.data)
        const initSelected: Record<string, boolean> = {}
        const initValues: Record<string, string> = {}
        r.data.forEach(f => {
          if (f.key === 'chinese_definition' && dictDefinition) {
            initSelected[f.id] = true
            initValues[f.id] = dictDefinition
          } else {
            initSelected[f.id] = false
            initValues[f.id] = ''
          }
        })
        setSelected(initSelected)
        setValues(initValues)
      }
    })
  }, [dictDefinition])

  const handleSave = async () => {
    if (!lemma.trim()) return
    setSaving(true)
    const word = await addWord(lemma)
    if (word) {
      for (const field of fields) {
        if (selected[field.id] && values[field.id]?.trim()) {
          await upsertFieldValue({
            wordId: word.id,
            fieldId: field.id,
            value: values[field.id].trim(),
            source: field.key === 'chinese_definition' && values[field.id] === dictDefinition ? 'cc-cedict' : 'user',
          })
        }
      }
      await selectWord(word.id)
    }
    setSaving(false)
    navigate('/')
  }

  return (
    <div className="max-w-lg mx-auto mt-12 px-6">
      <h2 className="text-xl font-semibold text-[#1C1814] mb-2">添加 "{lemma}"</h2>
      <p className="text-sm text-[#7A7368] mb-6">选择要保存的字段，保存后可在词库中继续编辑</p>

      <div className="space-y-3">
        {fields.map(f => (
          <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border border-[#D9D4CE]">
            <input
              type="checkbox"
              checked={selected[f.id] || false}
              onChange={e => setSelected(s => ({ ...s, [f.id]: e.target.checked }))}
              className="mt-1"
            />
            <div className="flex-1">
              <label className="text-sm font-medium text-[#1C1814]">{f.name}</label>
              {selected[f.id] || f.key === 'chinese_definition' ? (
                <input
                  className="w-full mt-1 px-3 py-1.5 rounded border border-[#D9D4CE] text-sm outline-none focus:border-[#4A6FA5]"
                  value={values[f.id] || ''}
                  onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))}
                  placeholder={`输入${f.name}…`}
                  autoFocus={f.key === 'chinese_definition'}
                />
              ) : (
                <button
                  className="text-sm text-[#4A6FA5] mt-1"
                  onClick={() => setSelected(s => ({ ...s, [f.id]: true }))}
                >
                  点击填写{f.name}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存到词库'}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/')}>取消</Button>
      </div>
    </div>
  )
}
