export default function EmptyState({ message = '暂无内容' }: { message?: string }) {
  return (
    <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '48px 0' }}>
      {message}
    </div>
  )
}
