// 音标两侧加斜杠（值本身已含斜杠则不重复加），如 bru: → /bru:/
export function formatPhonetic(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('/') && trimmed.endsWith('/')) return trimmed
  return `/${trimmed}/`
}
