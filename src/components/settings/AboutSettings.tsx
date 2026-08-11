import { useState } from 'react'
import pkg from '../../../package.json'
import { checkForUpdates, type CheckResult } from '../../services/updater'

// 关于（规格 §7.2）：版本号（随 package.json，P7 同步后自动跟随）+ 数据存储 + 检查更新
export default function AboutSettings() {
  const [phase, setPhase] = useState<'idle' | 'checking' | 'installing'>('idle')
  const [result, setResult] = useState<CheckResult | null>(null)

  async function onCheck() {
    setPhase('checking')
    setResult(null)
    const r = await checkForUpdates()
    setResult(r)
    setPhase('idle')
  }

  async function onInstall() {
    if (result?.status !== 'update-available') return
    setPhase('installing')
    try {
      await result.install()
    } finally {
      setPhase('idle')
    }
  }

  return (
    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
      <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>Lexiloom</div>
      <div>
        版本：v{pkg.version}
        <button onClick={onCheck} disabled={phase === 'checking' || phase === 'installing'} style={{ marginLeft: 8 }}>
          {phase === 'checking' ? '检查中…' : '检查更新'}
        </button>
      </div>
      <div>数据存储：本地（sqlite:lexiloom.db）</div>
      {result?.status === 'update-available' && (
        <div>
          发现新版本 v{result.version}
          <button onClick={onInstall} disabled={phase === 'installing'} style={{ marginLeft: 8 }}>
            {phase === 'installing' ? '更新中…' : '更新'}
          </button>
        </div>
      )}
      {result?.status === 'latest' && <div>已是最新版本</div>}
      {result?.status === 'error' && <div>检查更新失败：{result.message}</div>}
    </div>
  )
}
