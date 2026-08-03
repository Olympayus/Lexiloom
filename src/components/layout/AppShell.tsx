import TopSearchBar from './TopSearchBar'
import WordList from './WordList'
import SidebarFooter from './SidebarFooter'
import WordWorkbench from '../word/WordWorkbench'

// 规格 §2：侧边栏展开宽度 300px（收起在 P3 实现）
const SIDEBAR_WIDTH = 300

export default function AppShell() {
  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--color-canvas)' }}>
      {/* 全局顶栏：始终可见，不随侧边栏折叠（规格 §2） */}
      <header className="shrink-0">
        <TopSearchBar />
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏：300px + 底部 footer（规格 §2、§4.5） */}
        <aside
          className="flex flex-col shrink-0"
          style={{
            width: SIDEBAR_WIDTH,
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          <WordList />
          <SidebarFooter />
        </aside>

        {/* 右侧区域：词编辑视图（词典详情视图在 P2 加入双视图切换） */}
        <main className="flex-1 overflow-hidden">
          <WordWorkbench />
        </main>
      </div>
    </div>
  )
}
