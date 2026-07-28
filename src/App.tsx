import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ui/ErrorBoundary'
import IndexPage from './routes/IndexPage'
import AddWordPage from './routes/AddWordPage'

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/add" element={<AddWordPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
