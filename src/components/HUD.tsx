import { useEffect, useRef, useState } from 'react'
import { getUnlockedCgChapters } from '../game/story'
import type { ActivePowerUps, PowerUpType } from '../game/types'

type HUDProps = {
  score: number
  bestScore: number
  orangeCount: number
  totalOrangeCount: number
  level: number
  combo: number
  activePowerUps: ActivePowerUps
}

const POWER_UP_LABELS: Record<PowerUpType, string> = {
  magnet: '吸橘磁铁',
  shield: '告白护盾',
  doubleScore: '双倍心意',
}

export function HUD({
  score,
  bestScore,
  orangeCount,
  totalOrangeCount,
  level,
  combo,
  activePowerUps,
}: HUDProps) {
  const previousOrangeRef = useRef(orangeCount)
  const [isOrangeBumping, setIsOrangeBumping] = useState(false)
  const activeEntries = (Object.entries(activePowerUps) as Array<[PowerUpType, number]>).filter(([, time]) => time > 0)
  const unlockedCgCount = getUnlockedCgChapters(totalOrangeCount).length

  useEffect(() => {
    if (orangeCount > previousOrangeRef.current) {
      setIsOrangeBumping(false)
      window.requestAnimationFrame(() => setIsOrangeBumping(true))
    }

    previousOrangeRef.current = orangeCount
  }, [orangeCount])

  return (
    <div className="pointer-events-none absolute left-0 top-0 w-full px-5 pt-5 text-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex items-center gap-2 rounded-md bg-white/80 px-3 py-2 text-sm font-black shadow-sm backdrop-blur ${
            isOrangeBumping ? 'animate-score-bump' : ''
          }`}
          onAnimationEnd={() => setIsOrangeBumping(false)}
        >
          <img src="/assets/images/orange.svg" alt="" className="h-6 w-6" draggable={false} />
          <span>本局 {orangeCount}</span>
        </div>
        <div className="rounded-md bg-white/80 px-3 py-2 text-sm font-bold shadow-sm backdrop-blur">
          最高 {bestScore}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <div className="rounded-md bg-white/75 px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur">
          累计橘子 {totalOrangeCount}
        </div>
        <div className="rounded-md bg-white/75 px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur">
          CG {unlockedCgCount}/4
        </div>
        <div className="rounded-md bg-white/75 px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur">
          分数 {score}
        </div>
        <div className="rounded-md bg-white/75 px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur">
          Level {level}
        </div>
        {combo >= 2 && (
          <div className="rounded-md bg-amber-400/85 px-3 py-1.5 text-xs font-black text-amber-950 shadow-sm">
            连收 x{combo}
          </div>
        )}
      </div>

      {activeEntries.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {activeEntries.map(([type, time]) => (
            <div
              key={type}
              className="rounded-md bg-slate-950/55 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur"
            >
              {POWER_UP_LABELS[type]} {Math.ceil(time)}s
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
