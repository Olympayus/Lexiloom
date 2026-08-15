import type { DisplayFieldKey } from '../stores/settingsStore'

export interface FieldTreeNode {
  key: DisplayFieldKey
  label: string
  children?: FieldTreeNode[]
}

export const FIELD_TREE: FieldTreeNode[] = [
  { key: 'phonetic', label: '音标' },
  {
    key: 'part_of_speech', label: '词性',
    children: [
      { key: 'chinese_definition', label: '中文释义' },
      {
        key: 'english_definition', label: '英文释义',
        children: [
          { key: 'example', label: '例句' },
          { key: 'synonyms', label: '近义词' },
        ],
      },
    ],
  },
  { key: 'exchange', label: '词形变化' },
  { key: 'derivatives', label: '词源相关词' },
]

// key → 祖先链（含自身）
const ANCESTOR_CHAINS: Record<DisplayFieldKey, DisplayFieldKey[]> = (() => {
  const map = {} as Record<DisplayFieldKey, DisplayFieldKey[]>
  const walk = (nodes: FieldTreeNode[], chain: DisplayFieldKey[]) => {
    for (const n of nodes) {
      const next = [...chain, n.key]
      map[n.key] = next
      if (n.children) walk(n.children, next)
    }
  }
  walk(FIELD_TREE, [])
  return map
})()

export function getAncestors(key: DisplayFieldKey): DisplayFieldKey[] {
  return ANCESTOR_CHAINS[key] ?? [key]
}

// 有效可见 = 自身开关 ∧ 全部祖先开关（级联：父关 → 子有效关闭）
export function isFieldVisible(key: DisplayFieldKey, displayFields: Record<DisplayFieldKey, boolean>): boolean {
  return getAncestors(key).every(k => displayFields[k])
}

// 任一祖先（不含自身）关闭 → 该节点开关置灰（父关级联）；自身关闭不算祖先关闭
export function isAncestorOff(key: DisplayFieldKey, displayFields: Record<DisplayFieldKey, boolean>): boolean {
  return getAncestors(key).slice(0, -1).some(k => !displayFields[k])
}
