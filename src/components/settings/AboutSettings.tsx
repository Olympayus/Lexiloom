import pkg from '../../../package.json'

// 关于（规格 §7.2）：版本号（随 package.json，P7 同步后自动跟随）+ 数据存储
export default function AboutSettings() {
  return (
    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
      <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>Lexiloom</div>
      <div>版本：v{pkg.version}</div>
      <div>数据存储：本地（sqlite:lexiloom.db）</div>
    </div>
  )
}
