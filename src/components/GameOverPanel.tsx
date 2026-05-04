import { useState } from 'react'

type GameOverPanelProps = {
  score: number
  bestScore: number
  onRestart: () => void
}

// 备用复制方案：老浏览器或部分 WebView 没有 navigator.clipboard 时使用 textarea。
function copyWithFallback(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  try {
    return document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}

// 优先使用现代剪贴板 API；不可用或失败时自动降级。
async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return copyWithFallback(text)
    }
  }

  return copyWithFallback(text)
}

export function GameOverPanel({ score, bestScore, onRestart }: GameOverPanelProps) {
  const [hasCopied, setHasCopied] = useState(false)

  async function handleCopyScore() {
    const shareText = `我在 Cat Hop Rush 得了 ${score} 分，你能超过我吗？`
    const isCopied = await copyText(shareText)

    if (isCopied) {
      setHasCopied(true)
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 px-6">
      <div className="w-full max-w-xs rounded-lg bg-white/92 p-6 text-center shadow-xl backdrop-blur">
        <p className="text-sm font-bold text-sky-700">Cat Hop Rush</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">游戏结束</h2>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-slate-100 px-3 py-3">
            <p className="text-xs font-bold text-slate-500">本局分数</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{score}</p>
          </div>
          <div className="rounded-md bg-amber-100 px-3 py-3">
            <p className="text-xs font-bold text-amber-700">最高分</p>
            <p className="mt-1 text-2xl font-black text-amber-900">{bestScore}</p>
          </div>
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-md bg-sky-500 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-sky-600 active:scale-95"
          onClick={onRestart}
        >
          再玩一次
        </button>
        <button
          type="button"
          className="mt-3 w-full rounded-md bg-emerald-500 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
          onClick={handleCopyScore}
        >
          {hasCopied ? '已复制' : '复制战绩'}
        </button>
      </div>
    </div>
  )
}
