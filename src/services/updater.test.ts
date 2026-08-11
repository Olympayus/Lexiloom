import { describe, it, expect, vi, beforeEach } from 'vitest'

const { checkMock, relaunchMock, downloadInstallMock } = vi.hoisted(() => ({
  checkMock: vi.fn(),
  relaunchMock: vi.fn(),
  downloadInstallMock: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-updater', () => ({ check: checkMock }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: relaunchMock }))

import { checkForUpdates } from './updater'

describe('checkForUpdates', () => {
  beforeEach(() => {
    checkMock.mockReset()
    relaunchMock.mockReset()
    downloadInstallMock.mockReset()
  })

  it('有新版返回 update-available，install 触发下载并重启', async () => {
    downloadInstallMock.mockResolvedValue(undefined)
    checkMock.mockResolvedValue({
      version: '0.3.5',
      body: '修复',
      downloadAndInstall: downloadInstallMock,
    })
    const r = await checkForUpdates()
    expect(r.status).toBe('update-available')
    if (r.status !== 'update-available') return
    expect(r.version).toBe('0.3.5')
    await r.install()
    expect(downloadInstallMock).toHaveBeenCalledTimes(1)
    expect(relaunchMock).toHaveBeenCalledTimes(1)
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
