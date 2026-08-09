// src/components/ui/PosTag.tsx
interface Props {
  value: string
  size?: 'sm' | 'md'
  bold?: boolean
}

// 词性标签新语言（⑤）：方角描边、透明底、深夜蓝；与圆角分类胶囊区分。
// 搜索/编辑页 bold 默认 true（无衬线粗）；侧边栏传 bold={false} 用常规字重。
export default function PosTag({ value, size = 'md', bold = true }: Props) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
      height: size === 'sm' ? 18 : 20,
      padding: `0 ${size === 'sm' ? 6 : 9}px`,
      borderRadius: 'var(--radius-sm)',
      border: '1.5px solid var(--color-pos)',
      color: 'var(--color-pos)',
      background: 'transparent',
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: bold ? 700 : 600,
      lineHeight: 1,
    }}>
      {value}
    </span>
  )
}
