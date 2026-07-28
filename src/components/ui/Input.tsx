import { forwardRef } from 'react'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-4 py-2 rounded-lg bg-white outline-none ${className}`}
        style={{
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-ui)',
          fontSize: '14px',
          lineHeight: 1.5,
          transition: `border-color var(--duration-fast) var(--ease-out-smooth)`,
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--color-brand)'
          props.onFocus?.(e)
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--color-border)'
          props.onBlur?.(e)
        }}
        {...props}
        placeholder={props.placeholder || ''}
      />
    )
  }
)
Input.displayName = 'Input'
