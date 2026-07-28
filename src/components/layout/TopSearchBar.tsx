import { useState, useRef, useEffect } from 'react'
import { Input } from '../ui/Input'
import DictSearchResult from '../search/DictSearchResult'
import { searchDictionary } from '../../services/searchService'

export default function TopSearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearchError(false); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const entries = await searchDictionary(query)
        setResults(entries)
        setShowDropdown(true)
        setSearchError(false)
      } catch (e) {
        console.error('Dictionary search failed:', e)
        setSearchError(true)
      }
    }, 300)
    return () => clearTimeout(timer.current)
  }, [query])

  return (
    <div className="relative px-6 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <Input
        placeholder="搜索词典添加新单词…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
      />
      {searchError && (
        <div className="text-xs mt-1" style={{ color: 'var(--color-accent)' }}>
          词典搜索出错，请确认词典文件是否存在
        </div>
      )}
      {showDropdown && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute left-6 right-6 top-full z-20 mt-1 bg-white rounded-lg shadow-lg max-h-80 overflow-y-auto" style={{ border: '1px solid var(--color-border)' }}>
            <DictSearchResult results={results} query={query} onClose={() => setShowDropdown(false)} />
          </div>
        </>
      )}
    </div>
  )
}
