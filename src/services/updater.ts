import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export type CheckResult =
  | { status: 'update-available'; version: string; notes: string | undefined; install: () => Promise<void> }
  | { status: 'latest' }
  | { status: 'error'; message: string }

export async function checkForUpdates(): Promise<CheckResult> {
  try {
    const update = await check()
    if (update) {
      return {
        status: 'update-available',
        version: update.version,
        notes: update.body,
        install: async () => {
          await update.downloadAndInstall()
          await relaunch()
        },
      }
    }
    return { status: 'latest' }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) }
  }
}
