import { describe, it, expect } from 'vitest'
import { buildEcdictFields, parseExchangeItems } from './ecdictParse'

describe('buildEcdictFields', () => {
  it('observe：两个词性父，各自挂中文释义', () => {
    const fields = buildEcdictFields({
      word: 'observe',
      translation: 'vt. 觉察到, 遵守, 注意到, 庆祝\\nvi. 注意, 评论',
      definition: null, phonetic: '/əbˈzɜːv/', exchange: null,
    })
    expect(fields[0]).toEqual({ key: 'phonetic', value: '/əbˈzɜːv/' })
    const pos = fields.filter(f => f.key === 'part_of_speech')
    expect(pos).toHaveLength(2)
    expect(pos[0].value).toBe('vt.')
    expect(pos[0].children!.map(c => c.value)).toEqual(['觉察到', '遵守', '注意到', '庆祝'])
    expect(pos[1].value).toBe('vi.')
    expect(pos[1].children!.map(c => c.value)).toEqual(['注意', '评论'])
  })
  it('run：丢弃 word的 注释行，[域]行入补充', () => {
    const fields = buildEcdictFields({
      word: 'run',
      translation: 'n. 跑, 赛跑\\nvi. 跑\\nrun的过去式和过去分词\\n[计] 运行',
      definition: null, phonetic: 'rʌn', exchange: null,
    })
    const pos = fields.filter(f => f.key === 'part_of_speech')
    expect(pos).toHaveLength(2)
    const supp = fields.find(f => f.key === 'supplementary')
    expect(supp?.children?.map(c => c.value)).toEqual(['[计] 运行'])
  })
  it('英文释义按行首词性挂到同词性父，中文在前', () => {
    const fields = buildEcdictFields({
      word: 'run',
      translation: 'n. 跑',
      definition: 'n. a score in baseball\\nn. a regular trip',
      phonetic: null, exchange: null,
    })
    const pos = fields.find(f => f.key === 'part_of_speech')
    expect(pos?.children?.map(c => c.key)).toEqual(['chinese_definition', 'english_definition', 'english_definition'])
  })
  it('exchange 标签修正：p→过去式 d→过去分词，0/1 过滤', () => {
    const items = parseExchangeItems('p:ran/i:running/d:run/0:run/1:d/3:runs/s:runs')
    expect(items).toEqual([
      { label: '过去式', value: 'ran' },
      { label: '现在分词', value: 'running' },
      { label: '过去分词', value: 'run' },
      { label: '第三人称单数', value: 'runs' },
      { label: '复数', value: 'runs' },
    ])
  })
})
