import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './uiStore'

describe('uiStore 统一模态宿主', () => {
  beforeEach(() => useUiStore.setState({ assignWordId: null, editorTarget: null }))

  it('openAssign 打开分配分类，且关闭编辑模态', () => {
    useUiStore.getState().openEditor({ id: 'c1', name: 'A', color: '#fff', description: null, isDefault: false } as any, 'w1')
    useUiStore.getState().openAssign('w2')
    const s = useUiStore.getState()
    expect(s.assignWordId).toBe('w2')
    expect(s.editorTarget).toBeNull()
  })

  it('openEditor 记录目标，且关闭分配模态', () => {
    useUiStore.getState().openEditor(null, 'w1')
    const s = useUiStore.getState()
    expect(s.editorTarget).toEqual({ category: null, wordId: 'w1' })
    expect(s.assignWordId).toBeNull()
  })

  it('closeModals 全部关闭', () => {
    useUiStore.getState().openAssign('w1')
    useUiStore.getState().closeModals()
    const s = useUiStore.getState()
    expect(s.assignWordId).toBeNull()
    expect(s.editorTarget).toBeNull()
  })
})

describe('confirm', () => {
  it('confirm 返回 Promise，resolveConfirm(true) 后 resolve true 并清空', async () => {
    useUiStore.setState({ confirmReq: null })
    const p = useUiStore.getState().confirm({ title: '删除', message: '确定？', danger: true })
    expect(useUiStore.getState().confirmReq?.title).toBe('删除')
    useUiStore.getState().resolveConfirm(true)
    await expect(p).resolves.toBe(true)
    expect(useUiStore.getState().confirmReq).toBeNull()
  })

  it('resolveConfirm(false) resolve false', async () => {
    const p = useUiStore.getState().confirm({ title: 't', message: 'm' })
    useUiStore.getState().resolveConfirm(false)
    await expect(p).resolves.toBe(false)
  })
})
