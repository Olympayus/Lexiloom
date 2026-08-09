import type { DictionaryField } from '../types/dictionary'
import type { MergeFieldInput } from '../services/wordService'
import type { FieldSource } from '../types/field'

// 合并同词性父（跨 entry 显示为一窗格）
export function mergeEntryFields(fields: DictionaryField[]): DictionaryField[] {
  const out: DictionaryField[] = []
  const posIndex = new Map<string, DictionaryField>()
  for (const f of fields) {
    if (f.key === 'part_of_speech') {
      const existing = posIndex.get(f.value)
      if (existing) {
        existing.children = [...(existing.children ?? []), ...(f.children ?? [])]
        continue
      }
      posIndex.set(f.value, f)
    }
    out.push(f)
  }
  return out
}

// 编号规则：仅中/英释义显示 (n) 编号；近义词/例句/音标等一律不加（需求：仅中英释义编号）
export function shouldNumberField(key: string): boolean {
  return key === 'chinese_definition' || key === 'english_definition'
}

export interface FlatNode {
  key: string
  field: DictionaryField
  children: FlatNode[]
  parentKey: string | null
}

export function flattenTree(fields: DictionaryField[]): FlatNode[] {
  const walk = (nodes: DictionaryField[], parentKey: string | null): FlatNode[] =>
    nodes.map((field, i) => {
      const key = parentKey === null ? String(i) : `${parentKey}-${i}`
      const node: FlatNode = { key, field, parentKey, children: [] }
      node.children = walk(field.children ?? [], key)
      return node
    })
  return walk(fields, null)
}

// 由勾选集构建 MergeFieldInput[]：父先子后，tempId=key，子引用父 tempId；
// 隐式补选已勾选节点的全部祖先（保证无游离释义不变量）。
export function buildMergeInputs(fields: DictionaryField[], selected: Set<string>, source: FieldSource): MergeFieldInput[] {
  const flat = flattenTree(fields)
  const all: FlatNode[] = []
  const collect = (nodes: FlatNode[]) => { for (const n of nodes) { all.push(n); collect(n.children) } }
  collect(flat)
  const parentByKey = new Map(all.filter(n => n.parentKey).map(n => [n.key, n.parentKey!]))

  const effective = new Set<string>()
  const addLineage = (key: string) => {
    if (effective.has(key)) return
    effective.add(key)
    const p = parentByKey.get(key)
    if (p) addLineage(p)
  }
  for (const k of selected) addLineage(k)

  const out: MergeFieldInput[] = []
  const walk = (nodes: FlatNode[]) => {
    for (const n of nodes) {
      if (!effective.has(n.key)) continue
      out.push({
        key: n.field.key,
        value: n.field.value,
        source,
        tempId: n.key,
        ...(n.parentKey ? { parentTempId: n.parentKey } : {}),
      })
      walk(n.children)
    }
  }
  walk(flat)
  return out
}

// 词性/容器级整体勾选：未全选 → 补全子树；全选 → 清空子树（spec §4.5）
export function toggleSubtreeSelection(selected: Set<string>, allKeys: string[], key: string): Set<string> {
  const next = new Set(selected)
  const descendantKeys = allKeys.filter(k => k.startsWith(`${key}-`))
  const isOn = !descendantKeys.every(k => next.has(k))
  for (const k of [key, ...descendantKeys]) {
    if (isOn) next.add(k); else next.delete(k)
  }
  return next
}
