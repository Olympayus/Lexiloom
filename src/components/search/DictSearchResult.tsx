import { useNavigate } from 'react-router-dom'

interface Props {
  results: any[]
  query: string
  onClose: () => void
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <span key={i} style={{ color: 'var(--color-accent)', fontWeight: 500 }}>{part}</span>
      : part
  )
}

export default function DictSearchResult({ results, query, onClose }: Props) {
  const navigate = useNavigate()

  if (results.length === 0) return null

  return (
    <div>
      <div style={{
        padding: '8px 16px',
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
        fontWeight: 500,
        fontFamily: 'var(--font-ui)',
      }}>
        词典结果
      </div>
      {results.map((entry, i) => (
        <button
          key={i}
          style={{
            width: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'var(--font-ui)',
            transition: 'background-color var(--duration-fast) var(--ease-out-smooth)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          onClick={() => {
            const params = new URLSearchParams()
            const def = entry.fields.find((f: any) => f.key === 'chinese_definition')?.value || ''
            params.set('word', def)
            params.set('lemma', entry.word || '')
            navigate(`/add?${params}`)
            onClose()
          }}
        >
          <div>
            <div style={{
              color: 'var(--color-text-primary)',
              fontWeight: 500,
              fontFamily: 'var(--font-word)',
              fontSize: '16px',
            }}>
              {highlightText(entry.word || entry.fields[0]?.value || '单词', query)}
            </div>
            <div style={{
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              fontFamily: 'var(--font-ui)',
            }}>
              {highlightText(entry.fields.find((f: any) => f.key === 'chinese_definition')?.value || '', query)}
            </div>
          </div>
          <span style={{
            color: 'var(--color-brand)',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-ui)',
          }}>
            + 添加
          </span>
        </button>
      ))}
    </div>
  )
}
