import { useEffect } from 'react'
import TopSearchBar from '../components/layout/TopSearchBar'
import WordList from '../components/layout/WordList'
import WordWorkbench from '../components/word/WordWorkbench'
import { useWordStore } from '../stores/wordStore'

export default function IndexPage() {
  const { loadWords } = useWordStore()

  useEffect(() => {
    loadWords()
  }, [loadWords])

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--color-canvas)' }}>
      <TopSearchBar />
      <div className="flex-1 flex overflow-hidden">
        {/* 左栏：词库列表 */}
        <div className="w-80 flex flex-col shrink-0" style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>
          <WordList />
        </div>
        {/* 右栏：单词工作台 */}
        <div className="flex-1 overflow-hidden">
          <WordWorkbench />
        </div>
      </div>
    </div>
  )
}
