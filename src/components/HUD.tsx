import { useEffect, useRef, useState } from 'react'

type HUDProps = {
  score: number
  bestScore: number
}

export function HUD({ score, bestScore }: HUDProps) {
  const previousScoreRef = useRef(score)
  const [isScoreBumping, setIsScoreBumping] = useState(false)

  useEffect(() => {
    if (score > previousScoreRef.current) {
      setIsScoreBumping(false)
      window.requestAnimationFrame(() => setIsScoreBumping(true))
    }

    previousScoreRef.current = score
  }, [score])

  return (
    <div className="pointer-events-none absolute left-0 top-0 flex w-full items-start justify-between px-5 pt-5 text-slate-900">
      <div
        className={`rounded-md bg-white/75 px-3 py-2 text-sm font-bold shadow-sm backdrop-blur ${
          isScoreBumping ? 'animate-score-bump' : ''
        }`}
        onAnimationEnd={() => setIsScoreBumping(false)}
      >
        分数 {score}
      </div>
      <div className="rounded-md bg-white/75 px-3 py-2 text-sm font-bold shadow-sm backdrop-blur">
        最高 {bestScore}
      </div>
    </div>
  )
}
