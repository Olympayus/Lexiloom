// 开关组件（规格 §7.1）：36×20px，圆点 16px 白色，滑动 150ms
export function Toggle({ checked, onChange, ...rest }: { checked: boolean; onChange: (on: boolean) => void; 'aria-label'?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      {...rest}
      style={{
        width: '36px', height: '20px', flexShrink: 0,
        borderRadius: 'var(--radius-full)',
        background: checked ? 'var(--color-brand)' : 'var(--color-border-strong)',
        position: 'relative', cursor: 'pointer', border: 'none', padding: 0,
        transition: 'background-color var(--duration-fast) var(--ease-smooth)',
      }}
    >
      <span style={{
        position: 'absolute', top: '2px', left: '2px', width: '16px', height: '16px',
        background: 'white', borderRadius: '50%',
        transform: checked ? 'translateX(16px)' : 'translateX(0)',
        transition: 'transform var(--duration-fast) var(--ease-smooth)',
      }} />
    </button>
  )
}
