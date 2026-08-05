import { useState, useMemo } from 'react'
import TopSearchBar from './TopSearchBar'
import WordList from './WordList'
import SidebarFooter from './SidebarFooter'
import WordWorkbench from '../word/WordWorkbench'
import { useWordStore } from '../../stores/wordStore'
import { fitCollapsedWidth, measureMaxWordWidth, COLLAPSED_CHROME_ALPHABET, COLLAPSED_CHROME_CATEGORY, type SidebarMode } from '../../lib/sidebar'

// 规格 §2：侧边栏展开宽度 300px；收起宽度内容自适应（D1）
const SIDEBAR_EXPANDED_WIDTH = 300

export default function AppShell() {
  const words = useWordStore(s => s.words)
  const [collapsed, setCollapsed] = useState(false)
  const [mode, setMode] = useState<SidebarMode>('alphabet')

  // D1：收起宽度 = clamp(最长单词渲染宽度 + 实际 chrome, 120px, 240px)，加词/删词重算，150ms 过渡
  const sidebarWidth = useMemo(() => {
    if (!collapsed) return SIDEBAR_EXPANDED_WIDTH
    const serif = typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--font-serif').trim()
      : 'serif'
    const chrome = mode === 'alphabet' ? COLLAPSED_CHROME_ALPHABET : COLLAPSED_CHROME_CATEGORY
    const max = measureMaxWordWidth(words.map(w => w.lemma), `600 13px ${serif}`)  // 600 字重与渲染一致
    return fitCollapsedWidth(max, chrome)
  }, [collapsed, words, mode])

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--color-canvas)' }}>
      {/* 全局顶栏：始终可见，不随侧边栏折叠（规格 §2） */}
      <header className="shrink-0">
        <TopSearchBar />
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏：展开 300px / 收起内容自适应（D1）+ 底部 footer（规格 §2、§4.5） */}
        <aside
          className="flex flex-col shrink-0"
          style={{
            width: sidebarWidth,
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            transition: 'width 150ms var(--ease-smooth)',
            overflow: 'hidden',
          }}
        >
          <WordList
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(c => !c)}
            mode={mode}
            onToggleMode={() => setMode(m => (m === 'alphabet' ? 'category' : 'alphabet'))}
          />
          <SidebarFooter collapsed={collapsed} />
        </aside>

        {/* 右侧区域：词编辑视图（词典详情视图在 P2 加入双视图切换） */}
        <main className="flex-1 overflow-hidden">
          <WordWorkbench />
        </main>
      </div>
    </div>
  )
}
