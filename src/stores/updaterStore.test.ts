import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { checkForUpdatesMock, downloadUpdateMock, installAndRelaunchMock } = vi.hoisted(() => ({
  checkForUpdatesMock: vi.fn(),
  downloadUpdateMock: vi.fn(),
  installAndRelaunchMock: vi.fn(),
}))

vi.mock('../services/updater', () => ({
  checkForUpdates: checkForUpdatesMock,
  downloadUpdate: downloadUpdateMock,
  installAndRelaunch: installAndRelaunchMock,
  proxyHintForCheck: () => 'proxy-check-hint',
  proxyHintForDownload: () => 'proxy-download-hint',
}))

import { useUpdaterStore } from './updaterStore'

const makeUpdate = () => ({ version: '0.4.1', body: 'notes', close: vi.fn() })

const resetStore = () => useUpdaterStore.setState({
  phase: 'idle', open: false, hasUpdateBadge: false, badgeVersion: null,
  version: null, notes: undefined, errorMessage: null, errorHint: null,
  downloadedBytes: 0, contentLength: undefined, percent: null, stalled: false, update: null,
})

describe('updaterStore', () => {
  beforeEach(() => {
    resetStore()
    checkForUpdatesMock.mockReset()
    downloadUpdateMock.mockReset()
    installAndRelaunchMock.mockReset()
    vi.useFakeTimers()
  })
  afterEach(() => { vi.useRealTimers() })

  it('checkManually: 打开弹窗并进入 checking → available', async () => {
    checkForUpdatesMock.mockResolvedValue({ status: 'update-available', version: '0.4.1', notes: 'notes', update: makeUpdate() })
    await useUpdaterStore.getState().checkManually()
    const s = useUpdaterStore.getState()
    expect(s.open).toBe(true)
    expect(s.phase).toBe('available')
    expect(s.version).toBe('0.4.1')
    expect(s.hasUpdateBadge).toBe(true)
  })

  it('checkManually: 已最新 → latest 态', async () => {
    checkForUpdatesMock.mockResolvedValue({ status: 'latest' })
    await useUpdaterStore.getState().checkManually()
    expect(useUpdaterStore.getState().phase).toBe('latest')
  })

  it('checkManually: 失败 → error + 代理提示', async () => {
    checkForUpdatesMock.mockResolvedValue({ status: 'error', message: 'network down' })
    await useUpdaterStore.getState().checkManually()
    const s = useUpdaterStore.getState()
    expect(s.phase).toBe('error')
    expect(s.errorMessage).toBe('network down')
    expect(s.errorHint).toBe('proxy-check-hint')
  })

  it('checkSilently: 有新版只点徽标不弹窗', async () => {
    checkForUpdatesMock.mockResolvedValue({ status: 'update-available', version: '0.4.1', notes: 'n', update: makeUpdate() })
    await useUpdaterStore.getState().checkSilently()
    const s = useUpdaterStore.getState()
    expect(s.open).toBe(false)
    expect(s.hasUpdateBadge).toBe(true)
    expect(s.badgeVersion).toBe('0.4.1')
  })

  it('checkSilently: 失败静默（不设徽标、不弹窗）', async () => {
    checkForUpdatesMock.mockResolvedValue({ status: 'error', message: 'no net' })
    await useUpdaterStore.getState().checkSilently()
    const s = useUpdaterStore.getState()
    expect(s.hasUpdateBadge).toBe(false)
    expect(s.open).toBe(false)
    expect(s.phase).toBe('idle')
  })

  it('startDownload: downloading→进度累加→installing→done', async () => {
    const update = makeUpdate()
    checkForUpdatesMock.mockResolvedValue({ status: 'update-available', version: '0.4.1', notes: 'n', update })
    await useUpdaterStore.getState().checkManually()

    downloadUpdateMock.mockImplementation(async (_u, onProgress) => {
      onProgress({ downloadedBytes: 50, contentLength: 100, percent: 0.5 })
    })
    installAndRelaunchMock.mockResolvedValue(undefined)

    const p1 = useUpdaterStore.getState().startDownload()
    expect(useUpdaterStore.getState().phase).toBe('downloading')
    await p1
    const s = useUpdaterStore.getState()
    expect(s.phase).toBe('done')
    expect(s.downloadedBytes).toBe(50)
    expect(s.percent).toBe(0.5)
    expect(installAndRelaunchMock).toHaveBeenCalledWith(update)
  })

  it('startDownload: 进度停滞 8s 后置 stalled', async () => {
    const update = makeUpdate()
    checkForUpdatesMock.mockResolvedValue({ status: 'update-available', version: '0.4.1', notes: 'n', update })
    await useUpdaterStore.getState().checkManually()

    let resolveDownload!: () => void
    downloadUpdateMock.mockImplementation(async () => {
      await new Promise<void>((res) => { resolveDownload = res })
    })
    installAndRelaunchMock.mockResolvedValue(undefined)

    const p = useUpdaterStore.getState().startDownload()
    vi.advanceTimersByTime(9000)
    expect(useUpdaterStore.getState().stalled).toBe(true)
    resolveDownload()
    await p
    expect(useUpdaterStore.getState().phase).toBe('done')
  })

  it('startDownload: 下载抛错 → error + 下载代理提示', async () => {
    const update = makeUpdate()
    checkForUpdatesMock.mockResolvedValue({ status: 'update-available', version: '0.4.1', notes: 'n', update })
    await useUpdaterStore.getState().checkManually()

    downloadUpdateMock.mockRejectedValue(new Error('stall'))
    await useUpdaterStore.getState().startDownload()
    const s = useUpdaterStore.getState()
    expect(s.phase).toBe('error')
    expect(s.errorMessage).toBe('stall')
    expect(s.errorHint).toBe('proxy-download-hint')
  })

  it('checkManually: downloading 期间忽略重复触发（幂等）', async () => {
    const update = makeUpdate()
    checkForUpdatesMock.mockResolvedValue({ status: 'update-available', version: '0.4.1', notes: 'n', update })
    await useUpdaterStore.getState().checkManually()
    checkForUpdatesMock.mockClear()

    downloadUpdateMock.mockImplementation(async () => { await new Promise(() => {}) })
    const p = useUpdaterStore.getState().startDownload()
    await useUpdaterStore.getState().checkManually()   // 应被忽略，不再调 check
    expect(useUpdaterStore.getState().phase).toBe('downloading')
    expect(checkForUpdatesMock).not.toHaveBeenCalled()

    await useUpdaterStore.getState().cancelDownload()
    void p
  })

  it('cancelDownload: 关闭 update 资源并回到 idle', async () => {
    const update = makeUpdate()
    checkForUpdatesMock.mockResolvedValue({ status: 'update-available', version: '0.4.1', notes: 'n', update })
    await useUpdaterStore.getState().checkManually()

    downloadUpdateMock.mockImplementation(async () => { await new Promise(() => {}) }) // 永不结束
    const p = useUpdaterStore.getState().startDownload()
    await useUpdaterStore.getState().cancelDownload()
    expect(update.close).toHaveBeenCalledTimes(1)
    expect(useUpdaterStore.getState().phase).toBe('idle')
    void p // 不 await：download 永不结束，cancel 后由 update.close 中止
  })
})
