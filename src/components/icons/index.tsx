import type { ReactNode } from 'react'

export type IconName = 'plus' | 'grip' | 'more' | 'trash'

const PATHS: Record<IconName, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  grip: (
    <>
      <circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M6 7l1-3h10l1 3" /><path d="M8 7v14h8V7" />
    </>
  ),
}

export default function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}
