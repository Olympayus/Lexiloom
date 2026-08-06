import { describe, it, expect, beforeEach } from 'vitest'
import { useViewStore } from './viewStore'

describe('viewStore 双视图切换（D2）', () => {
  beforeEach(() => {
    useViewStore.setState({ activeView: 'workbench', dictWord: null })
  })

  it('初始为词编辑视图', () => {
    const s = useViewStore.getState()
    expect(s.activeView).toBe('workbench')
    expect(s.dictWord).toBeNull()
  })

  it('showDict 切到词典详情视图并记录单词', () => {
    useViewStore.getState().showDict('observe')
    const s = useViewStore.getState()
    expect(s.activeView).toBe('dict')
    expect(s.dictWord).toBe('observe')
  })

  it('showWorkbench 回到词编辑视图并清空 dictWord', () => {
    useViewStore.getState().showDict('observe')
    useViewStore.getState().showWorkbench()
    const s = useViewStore.getState()
    expect(s.activeView).toBe('workbench')
    expect(s.dictWord).toBeNull()
  })

  it('showDict 连续替换词典单词', () => {
    useViewStore.getState().showDict('observe')
    useViewStore.getState().showDict('ball')
    expect(useViewStore.getState().dictWord).toBe('ball')
  })
})
