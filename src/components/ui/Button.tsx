interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}
export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base = 'px-4 py-1.5 rounded text-sm font-medium'
  const styles = {
    primary: 'text-white',
    secondary: '',
  }
  return (
    <button
      className={`${base} ${styles[variant]} ${className}`}
      style={{
        background: variant === 'primary' ? 'var(--color-brand)' : 'var(--color-border)',
        color: variant === 'primary' ? 'var(--color-surface)' : 'var(--color-text-primary)',
        transition: `background-color var(--duration-fast) var(--ease-smooth)`,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: '14px',
        padding: '6px 20px',
        borderRadius: '6px',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}
      {...props}
    />
  )
}
