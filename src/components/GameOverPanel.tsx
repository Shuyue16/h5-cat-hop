import { useState } from 'react'
import { getUnlockedCgChapters } from '../game/story'

type GameOverPanelProps = {
  score: number
  bestScore: number
  orangeCount: number
  totalOrangeCount: number
  hasNewCg: boolean
  onShowCg: () => void
  onRestart: () => void
}

const gameOverMemes = [
  '/assets/images/%E6%AD%BB%E4%BA%A1%E7%BB%93%E7%AE%971.gif',
  '/assets/images/%E6%AD%BB%E4%BA%A1%E7%BB%93%E7%AE%972.gif',
  '/assets/images/%E6%AD%BB%E4%BA%A1%E7%BB%93%E7%AE%973.gif',
  '/assets/images/%E6%AD%BB%E4%BA%A1%E7%BB%93%E7%AE%974.gif',
]

function getRating(score: number) {
  if (score <= 10) {
    return '菜得很稳定'
  }

  if (score <= 30) {
    return '差点就像会玩了'
  }

  if (score <= 60) {
    return '有点东西，但不多'
  }

  return '猫meme今日状态在线'
}

const roastLines = [
  '酸柠檬都没使劲，你就自己送上门了。下一把把它跳过去。',
  'duro还没看见橘子，猫meme先看见结算页了。再来，别让橘子白跑。',
  '这波不是跑酷，是给路障送温暖。下一把把温暖留给duro。',
  '橘子挺甜，操作有点酸。再练一把，甜回来。',
  '别急，表白可以慢慢练，跳跃也可以。下一把手感会醒。',
  '猫meme：我本来是想帅气登场的。再来一次，把登场补上。',
]

function getRandomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

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

export function GameOverPanel({
  score,
  bestScore,
  orangeCount,
  totalOrangeCount,
  hasNewCg,
  onShowCg,
  onRestart,
}: GameOverPanelProps) {
  const [hasCopied, setHasCopied] = useState(false)
  const [meme] = useState(() => getRandomItem(gameOverMemes))
  const [roastLine] = useState(() => getRandomItem(roastLines))
  const unlockedCgCount = getUnlockedCgChapters(totalOrangeCount).length
  const rating = getRating(score)

  async function handleCopyScore() {
    const shareText = `猫meme本局给duro收到了 ${orangeCount} 颗橘子，累计 ${totalOrangeCount} 颗，分数 ${score}，CG ${unlockedCgCount}/4。`
    const isCopied = await copyText(shareText)

    if (isCopied) {
      setHasCopied(true)
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 px-6">
      <div className="w-full max-w-xs rounded-lg bg-white/92 p-5 text-center shadow-xl backdrop-blur">
        <p className="text-sm font-bold text-orange-600">猫meme的告白跑酷</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">游戏结束</h2>
        <p className="mt-2 text-sm font-bold text-emerald-700">{rating}</p>

        <div className="mt-4 overflow-hidden rounded-md bg-slate-100">
          <img src={meme} alt="失败结算表情包" className="h-32 w-full object-cover" draggable={false} />
        </div>

        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-bold leading-5 text-rose-700">
          {roastLine}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-md bg-orange-100 px-2 py-3">
            <p className="text-xs font-bold text-orange-700">本局橘子</p>
            <p className="mt-1 text-2xl font-black text-orange-900">{orangeCount}</p>
          </div>
          <div className="rounded-md bg-slate-100 px-2 py-3">
            <p className="text-xs font-bold text-slate-500">分数</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{score}</p>
          </div>
          <div className="rounded-md bg-amber-100 px-2 py-3">
            <p className="text-xs font-bold text-amber-700">CG</p>
            <p className="mt-1 text-2xl font-black text-amber-900">{unlockedCgCount}/4</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-md bg-white/75 px-3 py-2 text-xs font-bold text-slate-600">
          <span>累计橘子 {totalOrangeCount}</span>
          <span>最高分 {bestScore}</span>
        </div>

        {hasNewCg && (
          <button
            type="button"
            className="mt-5 w-full rounded-md bg-pink-500 px-4 py-3 text-base font-bold text-white shadow-sm transition duration-100 hover:bg-pink-600 active:scale-90 active:brightness-110"
            onClick={onShowCg}
          >
            查看新解锁CG
          </button>
        )}
        <button
          type="button"
          className={`${hasNewCg ? 'mt-3' : 'mt-5'} w-full rounded-md bg-orange-500 px-4 py-3 text-base font-bold text-white shadow-sm transition duration-100 hover:bg-orange-600 active:scale-90 active:brightness-110`}
          onClick={onRestart}
        >
          再玩一次
        </button>
        <button
          type="button"
          className="mt-3 w-full rounded-md bg-emerald-500 px-4 py-3 text-base font-bold text-white shadow-sm transition duration-100 hover:bg-emerald-600 active:scale-90 active:brightness-110"
          onClick={handleCopyScore}
        >
          {hasCopied ? '已复制战绩' : '复制战绩'}
        </button>
      </div>
    </div>
  )
}
