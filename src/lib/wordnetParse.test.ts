import { describe, it, expect } from 'vitest'
import { posDisplay, buildWordnetFields } from './wordnetParse'

describe('posDisplay', () => {
  it('n/v/a/s/r 显示映射', () => {
    expect(posDisplay('n')).toBe('n.')
    expect(posDisplay('v')).toBe('v.')
    expect(posDisplay('a')).toBe('adj.')
    expect(posDisplay('s')).toBe('adj.')
    expect(posDisplay('r')).toBe('adv.')
  })
})

describe('buildWordnetFields', () => {
  it('同词性 synset 并入同一父；words→近义词项；examples→例句项', () => {
    const fields = buildWordnetFields('run', [
      { pos: 'n', definition: 'a score in baseball', words: 'run\nscore', examples: 'He hit a run.\nThey scored.' },
      { pos: 'n', definition: 'a regular trip', words: 'trip' },
      { pos: 'v', definition: 'to move fast', words: 'run' },
    ])
    const pos = fields.filter(f => f.key === 'part_of_speech')
    expect(pos.map(p => p.value)).toEqual(['n.', 'v.'])
    expect(pos[0].children!.filter(c => c.key === 'english_definition')).toHaveLength(2)
    const syn = pos[0].children!.find(c => c.key === 'synonyms')!
    expect(syn.children!.map(s => s.value)).toEqual(['score']) // 排除词条自身
    const ex = pos[0].children!.find(c => c.key === 'example_sentence')!
    expect(ex.children!.map(e => e.value)).toEqual(['He hit a run.', 'They scored.'])
  })
  it('无近义词/例句时不产生容器', () => {
    const fields = buildWordnetFields('cat', [{ pos: 'n', definition: 'a small animal' }])
    const pos = fields[0]
    expect(pos.children!.map(c => c.key)).toEqual(['english_definition'])
  })
})
