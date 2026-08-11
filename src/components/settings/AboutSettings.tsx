import { useState } from 'react'
import pkg from '../../../package.json'
import { Button } from '../ui/Button'
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>版本：v{pkg.version}</span>
        <Button
          variant="secondary"
          onClick={onCheck}
          disabled={phase === 'checking' || phase === 'installing'}
        >
          {phase === 'checking' ? '检查中…' : '检查更新'}
        </Button>
        {result?.status === 'latest' && (
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>已是最新版本</span>
        )}
        {result?.status === 'error' && (
          <span style={{ color: 'var(--color-accent)', fontSize: 'var(--text-sm)' }}>检查更新失败：{result.message}</span>
        )}
      </div>
      <div>数据存储：本地（sqlite:lexiloom.db）</div>
      {result?.status === 'update-available' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>发现新版本 v{result.version}</span>
          <Button variant="primary" onClick={onInstall} disabled={phase === 'installing'}>
            {phase === 'installing' ? '更新中…' : '更新'}
          </Button>
        </div>
      )}
    </div>
  )
}
