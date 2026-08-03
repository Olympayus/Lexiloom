import { useEffect } from 'react'
import AppShell from '../components/layout/AppShell'
import { useWordStore } from '../stores/wordStore'

export default function IndexPage() {
  const { loadWords } = useWordStore()

  useEffect(() => {
    loadWords()
  }, [loadWords])

  return <AppShell />
}
