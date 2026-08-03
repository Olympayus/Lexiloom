import { useState, useMemo, useEffect } from 'react'
import type { DictionaryEntry } from '../../types/dictionary'
import type { Word } from '../../types/word'
import type { FieldSource } from '../../types/field'
import { useWordStore } from '../../stores/wordStore'

interface Props {
  word: string
  source: string
  entries: DictionaryEntry[]
}

// 来源名称映射
const SOURCE_NAMES: Record<string, string> = {
  ecdict: 'ECDICT',
  wordnet: 'WordNet',
}

// 来源配色（含 alpha 变体 — 用 hex 硬编码避免 CSS var + alpha 拼接失效）
const SOURCE_ACCENTS: Record<string, { color: string; bg: string; border: string; headerBorder: string }> = {
  ecdict: { color: 'var(--color-brand)', bg: '#4A6FA510', border: '#4A6FA540', headerBorder: '#4A6FA530' },
  wordnet: { color: '#5B8C5A', bg: '#5B8C5A10', border: '#5B8C5A40', headerBorder: '#5B8C5A30' },
}

// 按模板分组字段
function groupFields(entries: DictionaryEntry[]): {
  phonetic: string[]
  chineseDefinitions: string[]
  englishDefinitions: { value: string; synonyms: string[]; examples: string[] }[]
  exchangeItems: { label: string; value: string }[]
} {
  const result = {
    phonetic: [] as string[],
    chineseDefinitions: [] as string[],
    englishDefinitions: [] as { value: string; synonyms: string[]; examples: string[] }[],
    exchangeItems: [] as { label: string; value: string }[],
  }

  for (const entry of entries) {
    for (const field of entry.fields) {
      switch (field.key) {
        case 'phonetic':
          result.phonetic.push(field.value)
          break
        case 'chinese_definition':
          result.chineseDefinitions.push(field.value)
          break
        case 'english_definition':
          result.englishDefinitions.push({ value: field.value, synonyms: [], examples: [] })
          break
        case 'synonyms':
          if (result.englishDefinitions.length > 0) {
            const last = result.englishDefinitions[result.englishDefinitions.length - 1]
            last.synonyms = field.value.split(', ').filter(Boolean)
          }
          break
        case 'example':
          if (result.englishDefinitions.length > 0) {
            const last = result.englishDefinitions[result.englishDefinitions.length - 1]
            last.examples.push(field.value)
          }
          break
        case 'exchange':
          // 容器，忽略
          break
        case 'exchange_item':
          // 格式 "过去式: observed"
          const colonIdx = field.value.indexOf(':')
          if (colonIdx > 0) {
            result.exchangeItems.push({
              label: field.value.substring(0, colonIdx),
              value: field.value.substring(colonIdx + 1).trim(),
            })
          } else {
            result.exchangeItems.push({ label: '', value: field.value })
          }
          break
      }
    }
  }

  return result
}

export default function DictDetailCard({ word: word_, source: source_, entries }: Props) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
  const [added, setAdded] = useState(false)
  const grouped = useMemo(() => groupFields(entries), [entries])
  const sourceLabel = SOURCE_NAMES[source_] || source_
  const accent = SOURCE_ACCENTS[source_] || { color: '#666', bg: '#66666610', border: '#66666640', headerBorder: '#66666630' }
  const addWord = useWordStore(s => s.addWord)
  const mergeWordFields = useWordStore(s => s.mergeWordFields)

  // 初始化默认全选（含子字段）
  useEffect(() => {
    const allKeys = new Set<string>()
    grouped.phonetic.forEach((_, i) => allKeys.add(`phonetic-${i}`))
    grouped.chineseDefinitions.forEach((_, i) => allKeys.add(`chinese-${i}`))
    grouped.englishDefinitions.forEach((def, defIdx) => {
      allKeys.add(`english-${defIdx}`)
      def.synonyms.forEach((_, i) => allKeys.add(`synonym-${defIdx}-${i}`))
      def.examples.forEach((_, i) => allKeys.add(`example-${defIdx}-${i}`))
    })
    grouped.exchangeItems.forEach((_, i) => allKeys.add(`exchange-${i}`))
    setSelectedFields(allKeys)
  }, [word_, source_])

  const toggleField = (key: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleEnglishDef = (defIdx: number, checked: boolean) => {
    setSelectedFields(prev => {
      const next = new Set(prev)
      const defKey = `english-${defIdx}`
      if (checked) {
        next.add(defKey)
        // 自动选中子字段
        const def = grouped.englishDefinitions[defIdx]
        def.synonyms.forEach((_, i) => next.add(`synonym-${defIdx}-${i}`))
        def.examples.forEach((_, i) => next.add(`example-${defIdx}-${i}`))
      } else {
        next.delete(defKey)
        // 取消子字段
        const def = grouped.englishDefinitions[defIdx]
        def.synonyms.forEach((_, i) => next.delete(`synonym-${defIdx}-${i}`))
        def.examples.forEach((_, i) => next.delete(`example-${defIdx}-${i}`))
      }
      return next
    })
  }

  const handleAdd = async () => {
    // 1. 确保词条存在（如不存在则创建）
    let word = await addWord(word_)
    if (!word) {
      const existing = useWordStore.getState().words.find(w =>
        (w as Word).lemma.toLowerCase() === word_.toLowerCase()
      )
      if (existing) word = existing as Word
      else return
    }

    // 2. 收集选中的字段，构建 merge 输入
    const selectedFieldInputs: { key: string; value: string; source: FieldSource; parentKey?: string }[] = []

    // 音标
    if (selectedFields.has('phonetic-0') && grouped.phonetic.length > 0) {
      selectedFieldInputs.push({ key: 'phonetic', value: grouped.phonetic[0], source: source_ as FieldSource })
    }

    // 中文释义
    for (let i = 0; i < grouped.chineseDefinitions.length; i++) {
      if (selectedFields.has(`chinese-${i}`)) {
        selectedFieldInputs.push({ key: 'chinese_definition', value: grouped.chineseDefinitions[i], source: source_ as FieldSource })
      }
    }

    // 英文释义 + 近义词 + 例句
    for (let defIdx = 0; defIdx < grouped.englishDefinitions.length; defIdx++) {
      const def = grouped.englishDefinitions[defIdx]
      if (!selectedFields.has(`english-${defIdx}`)) continue

      selectedFieldInputs.push({
        key: 'english_definition',
        value: def.value,
        source: source_ as FieldSource,
      })

      // 近义词
      if (def.synonyms.length > 0 && selectedFields.has(`synonym-${defIdx}-0`)) {
        selectedFieldInputs.push({
          key: 'synonyms',
          value: def.synonyms.join(', '),
          source: source_ as FieldSource,
          parentKey: `english_definition::${defIdx}`,
        })
      }

      // 例句
      for (let exIdx = 0; exIdx < def.examples.length; exIdx++) {
        if (selectedFields.has(`example-${defIdx}-${exIdx}`)) {
          selectedFieldInputs.push({
            key: 'example',
            value: def.examples[exIdx],
            source: source_ as FieldSource,
            parentKey: `english_definition::${defIdx}`,
          })
        }
      }
    }

    // 词形变化
    let hasExchange = false
    for (let i = 0; i < grouped.exchangeItems.length; i++) {
      if (selectedFields.has(`exchange-${i}`)) {
        if (!hasExchange) {
          // 先插入容器
          selectedFieldInputs.push({ key: 'exchange', value: '', source: source_ as FieldSource })
          hasExchange = true
        }
        const item = grouped.exchangeItems[i]
        selectedFieldInputs.push({
          key: 'exchange_item',
          value: `${item.label}: ${item.value}`,
          source: source_ as FieldSource,
          parentKey: 'exchange',
        })
      }
    }

    // 3. 执行合并
    await mergeWordFields(word.id, selectedFieldInputs)
    // 4. 反馈：按钮状态变化
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="rounded-lg border overflow-hidden"
      style={{
        borderColor: accent.border,
        background: 'var(--color-surface)',
      }}>
      {/* 卡片头部 */}
      <div className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: accent.bg, borderBottom: '1px solid ' + accent.headerBorder }}>
        <span className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: accent.color }}>
          {sourceLabel}
        </span>
        <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
          {word_}
        </span>
      </div>

      {/* 卡片内容 - 层级模板 */}
      <div className="px-4 py-3 space-y-3 text-sm">

        {/* 音标 */}
        {grouped.phonetic.length > 0 && (
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFields.has('phonetic-0')}
              onChange={() => toggleField('phonetic-0')}
              className="mt-0.5"
            />
            <div>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>音标</span>
              <div style={{ fontFamily: 'var(--font-sans)' }}>{grouped.phonetic[0]}</div>
            </div>
          </label>
        )}

        {/* 中文释义 */}
        {grouped.chineseDefinitions.map((def, i) => (
          <label key={`chinese-${i}`} className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFields.has(`chinese-${i}`)}
              onChange={() => toggleField(`chinese-${i}`)}
              className="mt-0.5"
            />
            <div>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                中文释义{grouped.chineseDefinitions.length > 1 ? `(${i + 1})` : ''}
              </span>
              <div>{def}</div>
            </div>
          </label>
        ))}

        {/* 英文释义 */}
        {grouped.englishDefinitions.map((def, defIdx) => (
          <div key={`english-${defIdx}`} className="space-y-1">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.has(`english-${defIdx}`)}
                onChange={(e) => toggleEnglishDef(defIdx, e.target.checked)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                  英文释义{grouped.englishDefinitions.length > 1 ? `(${defIdx + 1})` : ''}
                </span>
                <div>{def.value}</div>
              </div>
            </label>

            {/* 子字段：近义词 */}
            {def.synonyms.length > 0 && (
              <div className="ml-6 pl-4" style={{ borderLeft: '2px solid var(--color-border)' }}>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.has(`synonym-${defIdx}-0`)}
                    onChange={() => toggleField(`synonym-${defIdx}-0`)}
                    className="mt-0.5"
                  />
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>近义词</span>
                    <div>{def.synonyms.join(', ')}</div>
                  </div>
                </label>
              </div>
            )}

            {/* 子字段：例句 */}
            {def.examples.length > 0 && (
              <div className="ml-6 pl-4 space-y-1" style={{ borderLeft: '2px solid var(--color-border)' }}>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>例句</div>
                {def.examples.map((ex, exIdx) => (
                  <label key={`example-${defIdx}-${exIdx}`} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.has(`example-${defIdx}-${exIdx}`)}
                      onChange={() => toggleField(`example-${defIdx}-${exIdx}`)}
                      className="mt-0.5"
                    />
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>
                      "{ex}"
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 词形变化 */}
        {grouped.exchangeItems.length > 0 && (
          <div className="space-y-1 pt-2" style={{ borderTop: '1px dashed var(--color-border)' }}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>词形变化</div>
            {grouped.exchangeItems.map((item, i) => (
              <label key={`exchange-${i}`} className="flex items-start gap-2 cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={selectedFields.has(`exchange-${i}`)}
                  onChange={() => toggleField(`exchange-${i}`)}
                  className="mt-0.5"
                />
                <div style={{ fontSize: '13px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{item.label}:</span>{' '}
                  <span style={{ fontFamily: 'var(--font-serif)' }}>{item.value}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 添加到词库按钮 */}
      <div className="px-4 py-3 flex justify-end"
        style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-canvas)' }}>
        <button
          className="px-4 py-1.5 rounded text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: accent.color, color: 'white' }}
          onClick={handleAdd}
        >
          {added ? '已添加' : '添加到词库'}
        </button>
      </div>
    </div>
  )
}
