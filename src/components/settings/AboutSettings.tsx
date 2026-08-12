import pkg from '../../../package.json'
import { useUpdaterStore } from '../../stores/updaterStore'

export default function AboutSettings() {
  const checkManually = useUpdaterStore(s => s.checkManually)
  return (
    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
      <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>Lexiloom</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>版本：v{pkg.version}</span>
        <button
          type="button"
          onClick={() => void checkManually()}
          style={{
            padding: '4px 12px', border: '1px solid var(--color-border)', borderRadius: 6,
            background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          检查更新
        </button>
      </div>
      <div>数据存储：本地（sqlite:lexiloom.db）</div>
    </div>
  )
}
