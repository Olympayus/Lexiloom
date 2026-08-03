import { useWordStore } from '../../stores/wordStore'

// 规格 §4.5：仅显示「共 N 个单词」，--text-xs，--color-text-tertiary，居中
export default function SidebarFooter() {
  const count = useWordStore(s => s.words.length)
  return (
    <div
      className="shrink-0"
      style={{
        textAlign: 'center',
        padding: '8px 16px',
        borderTop: '1px solid var(--color-border)',
        fontSize: '12px',
        color: 'var(--color-text-tertiary)',
      }}
    >
      共 {count} 个单词
    </div>
  )
}
