import { describe, it, expect, vi, beforeEach } from 'vitest'

const { checkMock, relaunchMock, downloadMock, installMock, closeMock } = vi.hoisted(() => ({
  checkMock: vi.fn(),
  relaunchMock: vi.fn(),
  downloadMock: vi.fn(),
  installMock: vi.fn(),
  closeMock: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-updater', () => ({ check: checkMock }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: relaunchMock }))

import type { Update } from '@tauri-apps/plugin-updater'
import { checkForUpdates, downloadUpdate, installAndRelaunch, proxyHintForCheck, proxyHintForDownload } from './updater'

const makeUpdate = (): Update => ({
  version: '0.4.1', body: '修复', download: downloadMock, install: installMock, close: closeMock,
} as unknown as Update)

describe('checkForUpdates', () => {
  beforeEach(() => { checkMock.mockReset(); relaunchMock.mockReset(); downloadMock.mockReset(); installMock.mockReset(); closeMock.mockReset() })

  it('check 默认传 timeout=15000', async () => {
    checkMock.mockResolvedValue(null)
    await checkForUpdates()
    expect(checkMock).toHaveBeenCalledWith({ timeout: 15000 })
  })

  it('有新版返回 update-available 并携带 update 资源', async () => {
    checkMock.mockResolvedValue(makeUpdate())
    const r = await checkForUpdates()
    expect(r.status).toBe('update-available')
    if (r.status !== 'update-available') return
    expect(r.version).toBe('0.4.1')
    expect(r.notes).toBe('修复')
    expect(r.update).toBeDefined()
  })

  it('无新版返回 latest', async () => {
    checkMock.mockResolvedValue(null)
    const r = await checkForUpdates()
    expect(r.status).toBe('latest')
  })

  it('check 抛错返回 error', async () => {
    checkMock.mockRejectedValue(new Error('network'))
    const r = await checkForUpdates()
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.message).toBe('network')
  })
})

describe('downloadUpdate', () => {
  it('累加 Progress chunkLength 算出 percent', async () => {
    downloadMock.mockImplementation(async (onEvent) => {
      onEvent({ event: 'Started', data: { contentLength: 100 } })
      onEvent({ event: 'Progress', data: { chunkLength: 25 } })
      onEvent({ event: 'Progress', data: { chunkLength: 50 } })
      onEvent({ event: 'Finished' })
    })
    const seen: Array<{ d: number; p: number | null }> = []
    await downloadUpdate(makeUpdate(), (p) => seen.push({ d: p.downloadedBytes, p: p.percent }))
    expect(seen[0]).toEqual({ d: 25, p: 0.25 })
    expect(seen[1]).toEqual({ d: 75, p: 0.75 })
  })

  it('contentLength 未知时 percent 为 null', async () => {
    downloadMock.mockImplementation(async (onEvent) => {
      onEvent({ event: 'Started', data: {} })
      onEvent({ event: 'Progress', data: { chunkLength: 10 } })
    })
    const seen: Array<{ d: number; p: number | null }> = []
    await downloadUpdate(makeUpdate(), (p) => seen.push({ d: p.downloadedBytes, p: p.percent }))
    expect(seen[0]).toEqual({ d: 10, p: null })
  })
})

describe('installAndRelaunch', () => {
  it('先 install 再 relaunch', async () => {
    await installAndRelaunch(makeUpdate())
    expect(installMock).toHaveBeenCalledTimes(1)
    expect(relaunchMock).toHaveBeenCalledTimes(1)
  })
})

describe('proxy hints', () => {
  it('提示文案包含关键域名', () => {
    expect(proxyHintForCheck()).toMatch(/raw\.githubusercontent\.com/)
    expect(proxyHintForDownload()).toMatch(/objects\.githubusercontent\.com/)
  })
})
