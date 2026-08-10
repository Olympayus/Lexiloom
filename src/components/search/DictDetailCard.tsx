import { useState, useMemo, useEffect, useImperativeHandle } from 'react'
import type { ReactNode } from 'react'
import type * as React from 'react'
import type { DictionaryEntry, DictionaryField } from '../../types/dictionary'
import type { FieldSource } from '../../types/field'
import type { MergeFieldInput } from '../../services/wordService'
import { useWordStore } from '../../stores/wordStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { ensureWord } from '../../lib/ensureWord'
import { mergeEntryFields, flattenTree, buildMergeInputs, toggleSubtreeSelection, shouldNumberField } from '../../lib/dictPlan'
import type { FlatNode } from '../../lib/dictPlan'
import PosTag from '../ui/PosTag'

interface Props {
  word: string
  source: string
  entries: DictionaryEntry[]
}

// 受控句柄：面板合并按钮经 ref 调用 buildInputs 取当前勾选构建的 merge 输入
export interface DictDetailCardHandle {
  buildInputs: () => MergeFieldInput[] | null
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

export default function DictDetailCard({
  word: word_, source: source_, entries,
  onSelectionChange, ref,
}: Props & {
  onSelectionChange?: (source: string, count: number) => void
  ref?: React.Ref<DictDetailCardHandle>
}) {
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

  // 受控句柄：面板合并按钮经 ref 取当前勾选构建的 merge 输入（无勾选返回 null）
  useImperativeHandle(ref, () => ({
    buildInputs: () => selected.size === 0 ? null : buildMergeInputs(visible, selected, source_ as FieldSource),
  }), [visible, selected, source_])

  // 勾选数变化上报面板（面板合并按钮 disabled 态）
  useEffect(() => {
    onSelectionChange?.(source_, selected.size)
  }, [selected, source_, onSelectionChange])

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

  // 免跳转添加：合并成功后卡片内「已添加 ✓」反馈（1.5s）；失败则短暂错误提示（2.5s，规格：失败不跳转）
  const [added, setAdded] = useState(false)
  const [error, setError] = useState(false)
  const handleAdd = async () => {
    const inputs = buildMergeInputs(visible, selected, source_ as FieldSource)
    if (inputs.length === 0) return
    const word = await ensureWord(word_)
    if (!word) {
      setError(true)
      window.setTimeout(() => setError(false), 2500)
      return
    }
    const ok = await mergeWordFields(word.id, inputs)
    if (ok) {
      setError(false)
      setAdded(true)
      window.setTimeout(() => setAdded(false), 1500)
    } else {
      setError(true)
      window.setTimeout(() => setError(false), 2500)
    }
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
    const seen = new Map<string, number>()

    return nodes.map(node => {
      const isContainer = node.children.length > 0
      const isPos = node.field.key === 'part_of_speech'
      const idx = seen.get(node.field.key) ?? 0
      seen.set(node.field.key, idx + 1)
      const label = fieldLabel(node.field.key)
      // 编号规则：仅中/英释义带 (n)，按词性独立从 1 重计；近义词/例句等一律不加编号
      const showNum = shouldNumberField(node.field.key)
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
              // 词性窗格：方角深蓝描边标签（⑤ 新语言）+ 计数
              <div className="flex items-center gap-1.5 flex-wrap">
                <PosTag value={node.field.value} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  {countItems(node)} 项
                </span>
              </div>
            ) : (
              <div className="flex-1">
                {label && (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>{numLabel}</span>
                )}
                {!isContainer && renderValue(node)}
              </div>
            )}
          </label>

          {isContainer && (
            <div className="ml-3 pl-2 mt-1 space-y-1"
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
      <div className="px-4 py-3 flex items-center justify-end gap-2"
        style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-canvas)' }}>
        {error && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>添加失败，请重试</span>
        )}
        <button
          className="px-4 py-1.5 rounded text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: accent.color, color: 'white' }}
          onClick={handleAdd}
          disabled={added || selected.size === 0}
        >
          {added ? '已添加 ✓' : '添加到词库'}
        </button>
      </div>
    </div>
  )
}
