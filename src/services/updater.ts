import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export type CheckResult =
  | { status: 'update-available'; version: string; notes: string | undefined; update: Update }
  | { status: 'latest' }
  | { status: 'error'; message: string }

export async function checkForUpdates(timeoutMs = 15000): Promise<CheckResult> {
  try {
    const update = await check({ timeout: timeoutMs })
    if (update) return { status: 'update-available', version: update.version, notes: update.body, update }
    return { status: 'latest' }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) }
  }
}

export interface DownloadProgress {
  downloadedBytes: number
  contentLength: number | undefined
  percent: number | null
}

export async function downloadUpdate(update: Update, onProgress: (p: DownloadProgress) => void): Promise<void> {
  let downloaded = 0
  let contentLength: number | undefined
  await update.download((ev: DownloadEvent) => {
    if (ev.event === 'Started') contentLength = ev.data.contentLength
    else if (ev.event === 'Progress') {
      downloaded += ev.data.chunkLength
      onProgress({
        downloadedBytes: downloaded,
        contentLength,
        percent: contentLength ? downloaded / contentLength : null,
      })
    }
  })
}

export async function installAndRelaunch(update: Update): Promise<void> {
  await update.install()
  await relaunch()
}

export function proxyHintForCheck(): string {
  return '请确认网络连接正常；若使用代理，请确认已放行 raw.githubusercontent.com 与 *.githubusercontent.com，并可在代理中开启全局/TUN 模式后重试。'
}

export function proxyHintForDownload(): string {
  return '下载源为 objects.githubusercontent.com（S3）。若代理未放行或网络过慢会卡住，可取消后检查代理设置再重试。'
}
