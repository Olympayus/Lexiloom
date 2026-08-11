import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ui/ErrorBoundary'
import IndexPage from './routes/IndexPage'
import { checkForUpdates } from './services/updater'

export default function App() {
  // 启动时检查更新：发现新版弹窗（更新/稍后）
  useEffect(() => {
    let cancelled = false
    checkForUpdates().then((r) => {
      if (cancelled || r.status !== 'update-available') return
      const ok = window.confirm(`发现新版本 v${r.version}，是否立即更新？`)
      if (ok) void r.install()
    })
    return () => { cancelled = true }
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
