import { useState, useRef, useEffect, useCallback } from 'react'
import SearchSuggestions from '../search/SearchSuggestions'
import { searchLemmas } from '../../services/searchService'
import { useViewStore } from '../../stores/viewStore'
import Icon from '../icons'

// 全局顶栏（规格 §3）：Logo 32×32 / 主搜索框 40px / 设置按钮；建议下拉 → 词典详情视图（D2）
export default function TopBar() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [focused, setFocused] = useState(false)
  const showDict = useViewStore(s => s.showDict)
  const showWorkbench = useViewStore(s => s.showWorkbench)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // 阶段一：防抖搜索建议（300ms），仅词典（searchLemmas 不查词库，D2）
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

  // 选中建议或回车 → 右侧区域切换为词典详情视图（D2：替换显示，非顶栏下方展开）
  const handleSelectWord = useCallback((word: string) => {
    setQuery(word)
    setShowSuggestions(false)
    showDict(word)
  }, [showDict])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!showSuggestions || suggestions.length === 0) return
      e.preventDefault()
      if (e.key === 'ArrowDown') setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
      else setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // 回车：优先选中的建议，否则以输入词直接查询词典（规格 §3 步骤 3）
      const word = selectedIndex >= 0 ? suggestions[selectedIndex] : query.trim()
      if (word) { e.preventDefault(); handleSelectWord(word) }
    }
  }

  return (
    <div style={{
      height: '56px', display: 'flex', alignItems: 'center', gap: '16px',
      padding: '0 20px', position: 'relative', zIndex: 'var(--z-sticky)',
      background: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)',
    }}>
      {/* Logo 32×32（规格 §3：圆角 radius-md，渐变 brand→#3A5A8A），点击回词编辑视图 */}
      <button
        type="button"
        aria-label="Lexiloom 首页"
        title="Lexiloom"
        onClick={showWorkbench}
        style={{
          width: '32px', height: '32px', flexShrink: 0, cursor: 'pointer', border: 'none',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--color-brand) 0%, #3A5A8A 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
        }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
          <circle cx="8" cy="6" r="1.5" fill="white" stroke="white" />
          <circle cx="16" cy="12" r="1.5" fill="white" stroke="white" />
          <circle cx="8" cy="18" r="1.5" fill="white" stroke="white" />
        </svg>
      </button>

      {/* 主搜索框：40px，圆角 radius-lg，聚焦边框 brand，max-width 480px（规格 §3） */}
      <div className="relative" style={{ flex: 1, maxWidth: '480px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', height: '40px', padding: '0 14px',
          background: 'var(--color-surface)',
          border: `1px solid ${focused ? 'var(--color-brand)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          transition: 'border-color var(--duration-fast) var(--ease-smooth)',
        }}>
          <span style={{ color: 'var(--color-text-tertiary)', display: 'flex' }}>
            <Icon name="search" size={20} />
          </span>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(-1) }}
            onFocus={() => { setFocused(true); if (suggestions.length > 0) setShowSuggestions(true) }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="添加或查询单词..."
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 'var(--text-base)', color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>

        {showSuggestions && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-base)' }} onClick={() => setShowSuggestions(false)} />
            <SearchSuggestions
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              onSelect={handleSelectWord}
              onHover={i => setSelectedIndex(i)}
              query={query}
            />
          </>
        )}
        {searchError && !showSuggestions && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            padding: '8px 12px', fontSize: 'var(--text-xs)', color: 'var(--color-accent)',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', zIndex: 'var(--z-dropdown)',
          }}>
            词典搜索出错，请确认词典文件是否存在
          </div>
        )}
      </div>

      {/* 设置按钮：齿轮 20px（规格 §3）；点击打开设置面板为 P6 职责，本模块仅占位渲染 */}
      <button
        type="button"
        aria-label="设置"
        title="设置"
        style={{
          width: '36px', height: '36px', marginLeft: 'auto', flexShrink: 0,
          border: 'none', background: 'transparent', borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          transition: 'all var(--duration-fast) var(--ease-smooth)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--color-surface-hover)'
          e.currentTarget.style.color = 'var(--color-text-primary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--color-text-secondary)'
        }}
      >
        <Icon name="settings" size={20} />
      </button>
    </div>
  )
}
