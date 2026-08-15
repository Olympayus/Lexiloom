import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ui/ErrorBoundary'
import TextContextMenu from './components/ui/TextContextMenu'
import IndexPage from './routes/IndexPage'
import { useUpdaterStore } from './stores/updaterStore'

export default function App() {
  // 启动静默检查：发现新版只点亮顶栏徽标，不弹窗
  useEffect(() => {
    void useUpdaterStore.getState().checkSilently()
  }, [])

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<IndexPage />} />
        </Routes>
        {/* 全局右键处理：禁止浏览器默认菜单 + 输入框自定义复制/粘贴菜单（v0.4.3 §3） */}
        <TextContextMenu />
      </ErrorBoundary>
    </BrowserRouter>
  )
}
