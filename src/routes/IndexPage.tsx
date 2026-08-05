import { useEffect } from 'react'
import AppShell from '../components/layout/AppShell'
import { useWordStore } from '../stores/wordStore'
import { useCategoryStore } from '../stores/categoryStore'

export default function IndexPage() {
  const { loadWords } = useWordStore()
  const { loadCategories, loadWordCategoryMap } = useCategoryStore()

  useEffect(() => {
    loadWords()
    loadCategories()
    loadWordCategoryMap()
  }, [loadWords, loadCategories, loadWordCategoryMap])

  return <AppShell />
}
