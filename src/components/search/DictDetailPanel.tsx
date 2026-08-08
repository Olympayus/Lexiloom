import { useCallback, useEffect, useRef, useState } from 'react'
import DictDetailCard, { type DictDetailCardHandle } from './DictDetailCard'
import { lookupWord } from '../../services/searchService'
import { useViewStore } from '../../stores/viewStore'
import { useWordStore } from '../../stores/wordStore'
import { ensureWord } from '../../lib/ensureWord'
import type { MergeFieldInput } from '../../services/wordService'
import type { DictionaryEntry } from '../../types/dictionary'
import Icon from '../icons'

interface DetailResult {
  source: string
  entries: DictionaryEntry[]
}

interface Props {
  word: string
}

// 词典详情视图（D2）：替换右侧区域。返回按钮/Esc 回词编辑视图（Task 5 追加「添加成功回编辑视图」）。
// Task 13：面板底部 sticky「合并添加」栏，聚合全源勾选字段一次合并后跳编辑页（需求 2b 后半）。
export default function DictDetailPanel({ word }: Props) {
  const [results, setResults] = useState<DetailResult[]>([])
  const [loading, setLoading] = useState(true)
  const [lookupError, setLookupError] = useState(false)
  const showWorkbench = useViewStore(s => s.showWorkbench)
  const selectWord = useWordStore(s => s.selectWord)
  const mergeWordFields = useWordStore(s => s.mergeWordFields)

  // 每张卡片的受控句柄 + 勾选数（卡片 ref/上报均为可选的，重复合并安全：mergeWordFields 幂等去重）
  const cardRefs = useRef<Record<string, DictDetailCardHandle | null>>({})
  const [selectionCounts, setSelectionCounts] = useState<Record<string, number>>({})
  const handleSelectionChange = useCallback((source: string, count: number) => {
    setSelectionCounts(prev => ({ ...prev, [source]: count }))
  }, [])

  const anySelected = results.some(r => (selectionCounts[r.source] ?? 0) > 0)

  // 合并添加：聚合全源勾选字段 → 确保词条存在 → 一次合并 → 跳编辑页
  const handleMergeAdd = async () => {
    const inputs: MergeFieldInput[] = []
    for (const r of results) {
      const built = cardRefs.current[r.source]?.buildInputs()
      if (built) inputs.push(...built)
    }
    if (inputs.length === 0) return
    const target = await ensureWord(word)
    if (!target) return
    const ok = await mergeWordFields(target.id, inputs)
    if (ok) { void selectWord(target.id); showWorkbench() }
  }

  // 阶段二：精确查询词典详情（两个词典源堆叠）
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLookupError(false)
    setResults([])
    setSelectionCounts({})
    lookupWord(word)
      .then(r => { if (!cancelled) setResults(r) })
      .catch(e => { console.error('Word lookup failed:', e); if (!cancelled) setLookupError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [word])

  // Esc 回词编辑视图（规格 §3 步骤 4）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') showWorkbench() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showWorkbench])

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--color-canvas)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 32px' }}>
        {/* 返回按钮 + 单词标题 */}
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={showWorkbench}
            title="返回"
            className="flex items-center gap-1.5"
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)', padding: '6px 8px', borderRadius: 'var(--radius-sm)',
              transition: 'color var(--duration-fast) var(--ease-smooth)',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
          >
            <Icon name="arrow-left" size={16} />
            返回
          </button>
          <span style={{
            fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)',
            fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)',
          }}>
            {word}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            加载中…
          </div>
        ) : lookupError ? (
          <div className="flex items-center justify-center py-8" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent)' }}>
            词典查询出错，请确认词典文件是否存在
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center py-8" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            未找到 &ldquo;{word}&rdquo; 的词典结果
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {results.map(result => (
                <DictDetailCard
                  key={result.source}
                  word={word}
                  source={result.source}
                  entries={result.entries}
                  ref={el => { cardRefs.current[result.source] = el }}
                  onSelectionChange={handleSelectionChange}
                />
              ))}
            </div>

            {/* 合并添加栏：聚合全源勾选，一次合并后跳编辑页（全无勾选时 disabled） */}
            <div style={{ position: 'sticky', bottom: 0, marginTop: '16px', padding: '12px 0', background: 'var(--color-canvas)', borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                disabled={!anySelected}
                onClick={handleMergeAdd}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '10px', borderRadius: 'var(--radius-md)', cursor: anySelected ? 'pointer' : 'not-allowed',
                  background: anySelected ? 'var(--color-brand)' : 'var(--color-border-strong)',
                  color: 'white', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-medium)', transition: 'background-color var(--duration-fast) var(--ease-smooth)',
                }}
              >
                <Icon name="plus" size={16} />
                合并添加
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
