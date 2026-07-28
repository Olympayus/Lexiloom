// TODO: 当词库超过 100 条时引入虚拟滚动（react-window），当前使用 overflow-y-auto
import { useState, useEffect } from 'react'
import { useWordStore } from '../../stores/wordStore'
import WordCard from '../word/WordCard'
import { vocabularySearch } from '../../lib/search'
import type { WordWithPreview } from '../../types/word'

export default function WordList() {
  const { words, selectedWordId, selectWord } = useWordStore()
  const [filter, setFilter] = useState('')
  const [filtered, setFiltered] = useState<WordWithPreview[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!filter.trim()) {
      setFiltered(words as WordWithPreview[])
      return
    }
    setSearching(true)
    vocabularySearch(filter)
      .then(results => setFiltered(results as WordWithPreview[]))
      .finally(() => setSearching(false))
  }, [filter, words])

  return (
    <div className="h-full flex flex-col">
      {/* 内嵌小搜索 */}
      <div className="px-4 py-3 border-b border-[#D9D4CE]">
        <input
          className="w-full px-3 py-1.5 rounded-md border border-[#D9D4CE] bg-white
            text-sm text-[#1C1814] placeholder-[#7A7368] outline-none
            focus:border-[#4A6FA5]"
          placeholder="在词库中筛选…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {/* 词库列表 */}
      <div className="flex-1 overflow-y-auto">
        {searching ? (
          <div className="px-4 py-8 text-center text-sm text-[#7A7368]">搜索中…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#7A7368]">
            {words.length === 0 ? '词库为空，使用顶部搜索框添加单词' : '没有匹配的单词'}
          </div>
        ) : (
          filtered.map((w: WordWithPreview) => (
            <WordCard
              key={w.id}
              word={w}
              isSelected={w.id === selectedWordId}
              onClick={() => selectWord(w.id)}
              chineseDefinition={w.chineseDefinition}
              partOfSpeech={w.partOfSpeech}
            />
          ))
        )}
      </div>

      <div className="px-4 py-2 text-xs text-[#7A7368] border-t border-[#D9D4CE]">
        共 {words.length} 个单词
      </div>
    </div>
  )
}
