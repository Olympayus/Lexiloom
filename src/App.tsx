import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ui/ErrorBoundary'
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
      </ErrorBoundary>
    </BrowserRouter>
  )
}
