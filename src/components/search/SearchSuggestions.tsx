interface Props {
  suggestions: string[]
  selectedIndex: number
  onSelect: (word: string) => void
  onHover: (index: number) => void
  query: string
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <span key={i} style={{ color: 'var(--color-accent)', fontWeight: 500 }}>{part}</span>
      : part
  )
}

export default function SearchSuggestions({ suggestions, selectedIndex, onSelect, onHover, query }: Props) {
  if (suggestions.length === 0) return null

  return (
    <div
      className="absolute left-6 right-6 top-full z-20 mt-1 bg-white rounded-lg max-h-80 overflow-y-auto"
      style={{ border: '1px solid var(--color-border)' }}
    >
      <div style={{
        padding: '8px 16px',
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
        fontWeight: 500,
        fontFamily: 'var(--font-ui)',
      }}>
        单词建议
      </div>
      {suggestions.map((word, i) => (
        <button
          key={word}
          onClick={() => onSelect(word)}
          onMouseEnter={() => onHover(i)}
          style={{
            width: '100%',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: 'none',
            background: i === selectedIndex ? 'var(--color-surface)' : 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'var(--font-word)',
            fontSize: '15px',
            color: 'var(--color-text-primary)',
            transition: 'background-color var(--duration-fast) var(--ease-out-smooth)',
          }}
        >
          {highlightText(word, query)}
        </button>
      ))}
    </div>
  )
}
