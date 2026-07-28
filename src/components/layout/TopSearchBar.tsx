import { useState, useRef, useEffect } from 'react'
import { Input } from '../ui/Input'
import DictSearchResult from '../search/DictSearchResult'
import { CcCedictProvider } from '../../providers/cc-cedict'

const provider = new CcCedictProvider()

export default function TopSearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const entries = await provider.lookup(query)
      setResults(entries)
      setShowDropdown(true)
    }, 300)
    return () => clearTimeout(timer.current)
  }, [query])

  return (
    <div className="relative px-6 py-3 border-b border-[#D9D4CE]">
      <Input
        placeholder="搜索词典添加新单词…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
      />
      {showDropdown && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute left-6 right-6 top-full z-20 mt-1 bg-white border border-[#D9D4CE] rounded-lg shadow-lg max-h-80 overflow-y-auto">
            <DictSearchResult results={results} query={query} onClose={() => setShowDropdown(false)} />
          </div>
        </>
      )}
    </div>
  )
}
