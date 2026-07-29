import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '../ui/Input'
import SearchSuggestions from '../search/SearchSuggestions'
import { searchLemmas, lookupWord } from '../../services/searchService'
import type { DictionaryEntry } from '../../types/dictionary'

interface DetailResult {
  source: string
  entries: DictionaryEntry[]
}

export default function TopSearchBar() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [detailResults, setDetailResults] = useState<DetailResult[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  // 阶段一：防抖搜索建议
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      setSearchError(false)
      return
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const result = await searchLemmas(query)
        setSuggestions(result)
        setShowSuggestions(result.length > 0)
        setSelectedIndex(-1)
        setSearchError(false)
      } catch (e) {
        console.error('Lemma search failed:', e)
        setSearchError(true)
      }
    }, 300)
    return () => clearTimeout(timer.current)
  }, [query])

  // 阶段二：选择单词后查询详情
  const handleSelectWord = useCallback(async (word: string) => {
    setQuery(word)
    setShowSuggestions(false)
    setSelectedWord(word)
    setLoadingDetail(true)
    setDetailResults([])
    try {
      const results = await lookupWord(word)
      setDetailResults(results)
    } catch (e) {
      console.error('Word lookup failed:', e)
    }
    setLoadingDetail(false)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelectWord(suggestions[selectedIndex])
    }
  }

  const renderDetailCard = (result: DetailResult) => {
    const isEcdict = result.source === 'ecdict'
    const sourceColor = isEcdict ? 'var(--color-brand)' : '#5B8C5A'

    return (
      <div
        key={result.source}
        className="rounded-lg border overflow-hidden"
        style={{
          borderColor: isEcdict ? 'var(--color-brand)' : '#5B8C5A',
          background: 'var(--color-surface)',
        }}
      >
        <div
          className="px-4 py-2.5"
          style={{ background: `${sourceColor}10` }}
        >
          <span className="text-xs font-semibold uppercase" style={{ color: sourceColor }}>
            {result.source.toUpperCase()}
          </span>
          <span className="text-lg font-bold ml-2" style={{ color: 'var(--color-text-primary)' }}>
            {selectedWord}
          </span>
        </div>
        <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          详细卡片将在下一阶段完成
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div className="relative px-6 py-3">
        <Input
          ref={inputRef}
          placeholder="搜索词典添加新单词…"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setSelectedWord(null)  // 重新输入时清除详情
            setDetailResults([])
          }}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
        />
        {searchError && (
          <div className="text-xs mt-1" style={{ color: 'var(--color-accent)' }}>
            词典搜索出错，请确认词典文件是否存在
          </div>
        )}
        {showSuggestions && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowSuggestions(false)} />
            <SearchSuggestions
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              onSelect={handleSelectWord}
              onHover={i => setSelectedIndex(i)}
              query={query}
            />
          </>
        )}
      </div>

      {/* 阶段二：详情卡片区域 */}
      {selectedWord && (
        <div className="px-6 pb-4 space-y-4">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              加载中…
            </div>
          ) : detailResults.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              未找到 &ldquo;{selectedWord}&rdquo; 的词典结果
            </div>
          ) : (
            detailResults.map(result => renderDetailCard(result))
          )}
        </div>
      )}
    </div>
  )
}
