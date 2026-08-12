import type { FieldValue } from '../types/field'

export type TabKey = 'main' | 'phrase' | 'exchange' | 'derivatives'

export const TAB_GROUPS: Record<TabKey, { roots: string[]; label: string }> = {
  main:        { roots: ['part_of_speech', 'supplementary'], label: '词性' },
  phrase:      { roots: ['phrase'],      label: '短语' },
  exchange:    { roots: ['exchange'],    label: '词形变化' },
  derivatives: { roots: ['derivatives'], label: '派生词' },
}

export const TAB_ORDER: TabKey[] = ['main', 'phrase', 'exchange', 'derivatives']

function tabHasContent(tab: TabKey, roots: FieldValue[], keyOf: (fv: FieldValue) => string): boolean {
  return roots.some(fv => TAB_GROUPS[tab].roots.includes(keyOf(fv)))
}

export function visibleTabs(roots: FieldValue[], keyOf: (fv: FieldValue) => string): TabKey[] {
  return TAB_ORDER.filter(t => tabHasContent(t, roots, keyOf))
}

export function defaultTab(roots: FieldValue[], keyOf: (fv: FieldValue) => string): TabKey | null {
  const vis = visibleTabs(roots, keyOf)
  return vis.includes('main') ? 'main' : vis[0] ?? null
}

export function missingTabs(roots: FieldValue[], keyOf: (fv: FieldValue) => string): TabKey[] {
  return TAB_ORDER.filter(t => !tabHasContent(t, roots, keyOf))
}

export function groupRootsByTab(roots: FieldValue[], keyOf: (fv: FieldValue) => string): Partial<Record<TabKey, FieldValue[]>> {
  const groups: Partial<Record<TabKey, FieldValue[]>> = {}
  for (const t of TAB_ORDER) groups[t] = []
  for (const fv of roots) {
    const tab = TAB_ORDER.find(t => TAB_GROUPS[t].roots.includes(keyOf(fv)))
    if (tab) groups[tab]!.push(fv)
  }
  return groups
}

export function addableRootKeys(tab: TabKey): string[] {
  return TAB_GROUPS[tab].roots
}
