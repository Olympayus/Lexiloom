import Icon from '../icons'

interface Props {
  collapsed: boolean
  filter: string
  onFilterChange: (value: string) => void
  onToggleMode: () => void
  onToggleCollapse: () => void
}

export default function SidebarToolbar({ collapsed, filter, onFilterChange, onToggleMode, onToggleCollapse }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
      {/* 筛选搜索（规格 §4.1）：展开态输入框+图标；收起态仅图标 18px */}
      <div
        className="flex items-center gap-2 h-8 px-2.5"
        style={{
          flex: 1,
          minWidth: 0,
          background: collapsed ? 'transparent' : 'var(--color-surface)',
          border: collapsed ? 'none' : '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          justifyContent: collapsed ? 'center' : undefined,
          padding: collapsed ? 0 : undefined,
          transition: 'background-color var(--duration-fast) var(--ease-smooth), border-color var(--duration-fast) var(--ease-smooth)',
        }}
        onMouseEnter={e => { if (collapsed) e.currentTarget.style.background = 'var(--color-surface-hover)' }}
        onMouseLeave={e => { if (collapsed) e.currentTarget.style.background = 'transparent' }}
      >
        <Icon name="search" size={collapsed ? 18 : 16} />
        {!collapsed && (
          <input
            type="text"
            placeholder="筛选词库..."
            value={filter}
            onChange={e => onFilterChange(e.target.value)}
            onFocus={e => { e.currentTarget.parentElement!.style.borderColor = 'var(--color-brand)' }}
            onBlur={e => { e.currentTarget.parentElement!.style.borderColor = 'var(--color-border)' }}
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)',
            }}
          />
        )}
      </div>

      {/* 模式切换（收起态隐藏） */}
      {!collapsed && (
        <button
          type="button"
          title="切换显示模式"
          onClick={onToggleMode}
          className="w-8 h-8 flex items-center justify-center"
          style={{
            border: 'none', background: 'transparent', borderRadius: 'var(--radius-md)',
            cursor: 'pointer', color: 'var(--color-text-secondary)', flexShrink: 0,
            transition: 'background-color var(--duration-fast) var(--ease-smooth), color var(--duration-fast) var(--ease-smooth)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-brand)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        >
          <Icon name="swap" size={16} />
        </button>
      )}

      {/* 收缩按钮（收起态图标旋转 180°） */}
      <button
        type="button"
        title="收起/展开侧边栏"
        onClick={onToggleCollapse}
        className="w-8 h-8 flex items-center justify-center"
        style={{
          border: 'none', background: 'transparent', borderRadius: 'var(--radius-md)',
          cursor: 'pointer', color: 'var(--color-text-secondary)', flexShrink: 0,
          transition: 'background-color var(--duration-fast) var(--ease-smooth), color var(--duration-fast) var(--ease-smooth)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-brand)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
      >
        <span style={{ display: 'flex', transition: 'transform var(--duration-normal) var(--ease-smooth)', transform: collapsed ? 'rotate(180deg)' : undefined }}>
          <Icon name="chevron-left" size={16} />
        </span>
      </button>
    </div>
  )
}
