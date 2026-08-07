import type { DictionaryField } from '../types/dictionary'

// 词性前缀（ecdict 行首，含点号，保留原样标签）。
// 注意：交替必须「最长前缀优先」——否则 'vi. 跑' 会先匹配 'v'，label 错成 'v'、释义错成 'i. 跑'。
const POS_RE = /^(vt|vi|adj|adv|aux|prep|conj|pron|abbr|num|art|int|ad|n|v|a)\.?/i

// exchange 前缀 → 中文标注（修正后，spec §5.3）
const EXCHANGE_LABELS: Record<string, string> = {
  p: '过去式', d: '过去分词', i: '现在分词',
  '3': '第三人称单数', s: '复数', f: '复数',
  r: '比较级', t: '最高级', b: '比较级', z: '最高级',
}
// 0(原型)、1(单字母词性码) 为元数据，过滤
const EXCHANGE_SKIP = new Set(['0', '1'])

// translation/definition 字段分隔符：字面反斜杠 n（字符码 92,110）
const SEP = String.fromCharCode(92, 110)

function splitLines(text: string): string[] {
  return text.split(SEP).map(s => s.trim()).filter(Boolean)
}

export function parseExchangeItems(exchange: string): { label: string; value: string }[] {
  if (!exchange) return []
  return exchange.split('/').map(pair => {
    const ci = pair.indexOf(':')
    if (ci === -1) return null
    const prefix = pair.substring(0, ci)
    const value = pair.substring(ci + 1)
    if (EXCHANGE_SKIP.has(prefix)) return null
    return { label: EXCHANGE_LABELS[prefix] || prefix, value }
  }).filter(Boolean) as { label: string; value: string }[]
}

export function buildEcdictFields(input: {
  word: string
  translation: string | null
  definition: string | null
  phonetic?: string | null
  exchange?: string | null
}): DictionaryField[] {
  const fields: DictionaryField[] = []
  if (input.phonetic) fields.push({ key: 'phonetic', value: input.phonetic })

  const posParents = new Map<string, DictionaryField>()
  const getPos = (label: string): DictionaryField => {
    let p = posParents.get(label)
    if (!p) {
      p = { key: 'part_of_speech', value: label, children: [] }
      posParents.set(label, p)
      fields.push(p)
    }
    return p
  }

  const supplementary: DictionaryField = { key: 'supplementary', value: '', children: [] }
  let supplementaryUsed = false
  const addToSupplementary = (text: string) => {
    supplementaryUsed = true
    supplementary.children!.push({ key: 'supplementary_item', value: text })
  }

  // 中文释义（translation）
  if (input.translation) {
    for (const line of splitLines(input.translation)) {
      if (line.startsWith(`${input.word}的`)) continue // 冗余注释丢弃
      const m = line.match(POS_RE)
      if (m) {
        const rest = line.slice(m[0].length).replace(/^[,，:：\s]+/, '')
        if (rest) {
          const pos = getPos(m[0])
          for (const part of rest.split(',').map(s => s.trim()).filter(Boolean)) {
            pos.children!.push({ key: 'chinese_definition', value: part })
          }
        }
      } else {
        addToSupplementary(line)
      }
    }
  }

  // 英文释义（definition），同样带词性前缀
  if (input.definition) {
    for (const line of splitLines(input.definition)) {
      const m = line.match(POS_RE)
      if (!m) { addToSupplementary(line); continue }
      const rest = line.slice(m[0].length).replace(/^[\s:]+/, '')
      if (!rest) continue
      getPos(m[0]).children!.push({ key: 'english_definition', value: rest })
    }
  }

  // 补充释义先于词形变化（模板序：phonetic → POS → supplementary → exchange）
  if (supplementaryUsed) fields.push(supplementary)

  // 词形变化
  if (input.exchange) {
    const items = parseExchangeItems(input.exchange)
    if (items.length) {
      fields.push({
        key: 'exchange', value: '',
        children: items.map(it => ({ key: 'exchange_item', value: `${it.label}: ${it.value}` })),
      })
    }
  }

  return fields
}
