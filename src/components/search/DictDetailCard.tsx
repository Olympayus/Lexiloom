import { useState, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { DictionaryEntry, DictionaryField } from '../../types/dictionary'
import type { Word } from '../../types/word'
import type { FieldSource } from '../../types/field'
import { useWordStore } from '../../stores/wordStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { mergeEntryFields, flattenTree, buildMergeInputs, toggleSubtreeSelection } from '../../lib/dictPlan'
import type { FlatNode } from '../../lib/dictPlan'

interface Props {
  word: string
  source: string
  entries: DictionaryEntry[]
  onAdded: (wordId: string) => void
}

// 来源名称映射
const SOURCE_NAMES: Record<string, string> = {
  ecdict: 'ECDICT',
  wordnet: 'WordNet',
}

// 来源配色：颜色走 --color-* 变量；alpha 变体用 color-mix 生成（避免硬编码 hex，§11 视觉第 8 项）
const SOURCE_ACCENTS: Record<string, { color: string; bg: string; border: string; headerBorder: string }> = {
  ecdict: {
    color: 'var(--color-brand)',
    bg: 'color-mix(in srgb, var(--color-brand) 6%, transparent)',
    border: 'color-mix(in srgb, var(--color-brand) 25%, transparent)',
    headerBorder: 'color-mix(in srgb, var(--color-brand) 19%, transparent)',
  },
  wordnet: {
    color: 'var(--color-wordnet)',
    bg: 'color-mix(in srgb, var(--color-wordnet) 6%, transparent)',
    border: 'color-mix(in srgb, var(--color-wordnet) 25%, transparent)',
    headerBorder: 'color-mix(in srgb, var(--color-wordnet) 19%, transparent)',
  },
}

// 字段类型 → 展示标签（词性节点用胶囊，故此处不映射）
function fieldLabel(key: string): string {
  switch (key) {
    case 'phonetic': return '音标'
    case 'chinese_definition': return '中文释义'
    case 'english_definition': return '英文释义'
    case 'synonyms': return '近义词'
    case 'example_sentence': return '例句'
    case 'exchange': return '词形变化'
    case 'supplementary': return '补充'
    default: return ''
  }
}

// 子树叶子计数（词性窗格胶囊数字）
function countItems(node: FlatNode): number {
  if (node.children.length === 0) return 1
  return node.children.reduce((sum, c) => sum + countItems(c), 0)
}

export default function DictDetailCard({ word: word_, source: source_, entries, onAdded }: Props) {
  const addWord = useWordStore(s => s.addWord)
  const mergeWordFields = useWordStore(s => s.mergeWordFields)
  const displayFields = useSettingsStore(s => s.displayFields)
  const sourceLabel = SOURCE_NAMES[source_] || source_
  const accent = SOURCE_ACCENTS[source_] || {
    color: 'var(--color-text-secondary)',
    bg: 'color-mix(in srgb, var(--color-text-secondary) 6%, transparent)',
    border: 'color-mix(in srgb, var(--color-text-secondary) 25%, transparent)',
    headerBorder: 'color-mix(in srgb, var(--color-text-secondary) 19%, transparent)',
  }

  // 合并同词性父（跨 entry 显示为一窗格）
  const merged = useMemo(() => mergeEntryFields(entries.flatMap(e => e.fields)), [entries])

  // displayFields 隐藏的字段类型不渲染、不进入勾选（等价原逐项 displayFields 判断）
  const visible = useMemo(() => {
    const keyAllowed = (key: string) => {
      const map: Record<string, boolean> = {
        phonetic: displayFields.phonetic, part_of_speech: true,
        chinese_definition: displayFields.chinese_definition, english_definition: displayFields.english_definition,
        example: displayFields.example, exchange: displayFields.exchange,
      }
      return map[key] ?? true
    }
    const filter = (nodes: DictionaryField[]): DictionaryField[] =>
      nodes
        .filter(n => keyAllowed(n.key))
        .map(n => ({ ...n, children: n.children ? filter(n.children) : n.children }))
        .filter(n => !(n.value === '' && !(n.children && n.children.length > 0))) // 隐藏子字段后变空的容器无意义，丢弃
    return filter(merged)
  }, [merged, displayFields])

  const flat = useMemo(() => flattenTree(visible), [visible])

  // 全树路径 key 表（toggleSubtree 判定子树是否全选）
  const allNodeKeys = useMemo(() => {
    const keys: string[] = []
    const walk = (nodes: FlatNode[]) => { for (const n of nodes) { keys.push(n.key); walk(n.children) } }
    walk(flat)
    return keys
  }, [flat])

  // 勾选状态：Set<key>，key 为路径（'0'、'0-1'、'0-1-0'）
  const [selected, setSelected] = useState<Set<string>>(new Set())
  useEffect(() => {
    const all = new Set<string>()
    const walk = (nodes: FlatNode[]) => { for (const n of nodes) { all.add(n.key); walk(n.children) } }
    walk(flat)
    setSelected(all)
  }, [word_, source_, flat])

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  // 词性/容器级整体勾选：未全选 → 补全子树；全选 → 清空子树（dictPlan.toggleSubtreeSelection）
  const toggleSubtree = (key: string) => {
    setSelected(prev => toggleSubtreeSelection(prev, allNodeKeys, key))
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

    // 2. 由可见树 + 勾选集构建 merge 输入（displayFields 过滤已由 visible 完成）
    const selectedFieldInputs = buildMergeInputs(visible, selected, source_ as FieldSource)

    // 3. 执行合并
    const ok = await mergeWordFields(word.id, selectedFieldInputs)
    // 4. 成功 → 通知面板回编辑视图并定位新词（D2）
    if (ok) onAdded(word.id)
  }

  // 叶子值渲染（音标/例句/词形变化项等特殊排版）
  const renderValue = (node: FlatNode): ReactNode => {
    const key = node.field.key
    switch (key) {
      case 'phonetic':
        return <div style={{ fontFamily: 'var(--font-phonetic)' }}>{node.field.value}</div>
      case 'example':
        return <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>"{node.field.value}"</div>
      case 'exchange_item': {
        const colonIdx = node.field.value.indexOf(':')
        if (colonIdx > 0) {
          return (
            <div style={{ fontSize: '13px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{node.field.value.substring(0, colonIdx)}:</span>{' '}
              <span style={{ fontFamily: 'var(--font-serif)' }}>{node.field.value.substring(colonIdx + 1).trim()}</span>
            </div>
          )
        }
        return <div style={{ fontSize: '13px' }}>{node.field.value}</div>
      }
      default:
        return <div>{node.field.value}</div>
    }
  }

  // 递归渲染 flat 树：词性/容器节点整棵勾选，普通节点单项勾选
  const renderFlat = (nodes: FlatNode[]): ReactNode => {
    const keyCounts = new Map<string, number>()
    for (const n of nodes) keyCounts.set(n.field.key, (keyCounts.get(n.field.key) ?? 0) + 1)
    const seen = new Map<string, number>()

    return nodes.map(node => {
      const isContainer = node.children.length > 0
      const isPos = node.field.key === 'part_of_speech'
      const idx = seen.get(node.field.key) ?? 0
      seen.set(node.field.key, idx + 1)
      const label = fieldLabel(node.field.key)
      const showNum = Boolean(label) && (keyCounts.get(node.field.key) ?? 0) > 1
      const numLabel = showNum ? `${label}(${idx + 1})` : label
      const onToggle = () => (isContainer ? toggleSubtree(node.key) : toggle(node.key))

      return (
        <div key={node.key}>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(node.key)}
              onChange={onToggle}
              className="mt-0.5"
            />
            {isPos ? (
              // 词性窗格：胶囊标签 + 计数（与工作台分类胶囊一致的视觉语言）
              <div className="flex items-center gap-1.5 flex-wrap">
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  height: '20px', padding: '0 10px', borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)',
                  background: accent.bg, color: accent.color, border: '1px solid ' + accent.border,
                }}>
                  {node.field.value}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  {countItems(node)} 项
                </span>
              </div>
            ) : (
              <div className="flex-1">
                {label && (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{numLabel}</span>
                )}
                {!isContainer && renderValue(node)}
              </div>
            )}
          </label>

          {isContainer && (
            <div className="ml-6 pl-4 mt-1 space-y-1"
              style={{ borderLeft: '2px solid var(--color-border)' }}>
              {renderFlat(node.children)}
            </div>
          )}
        </div>
      )
    })
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

      {/* 卡片内容 - POS 分组树 */}
      <div className="px-4 py-3 space-y-3 text-sm">
        {renderFlat(flat)}
      </div>

      {/* 添加到词库按钮 */}
      <div className="px-4 py-3 flex justify-end"
        style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-canvas)' }}>
        <button
          className="px-4 py-1.5 rounded text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: accent.color, color: 'white' }}
          onClick={handleAdd}
        >
          添加到词库
        </button>
      </div>
    </div>
  )
}
