import { useEffect, useState } from 'react'
import DictDetailCard from './DictDetailCard'
import { lookupWord } from '../../services/searchService'
import { useViewStore } from '../../stores/viewStore'
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
export default function DictDetailPanel({ word }: Props) {
  const [results, setResults] = useState<DetailResult[]>([])
  const [loading, setLoading] = useState(true)
  const [lookupError, setLookupError] = useState(false)
  const showWorkbench = useViewStore(s => s.showWorkbench)

  // 阶段二：精确查询词典详情（两个词典源堆叠）
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLookupError(false)
    setResults([])
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
          <div className="space-y-4">
            {results.map(result => (
              <DictDetailCard
                key={result.source}
                word={word}
                source={result.source}
                entries={result.entries}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
