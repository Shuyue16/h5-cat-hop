type GameOverPanelProps = {
  score: number
  bestScore: number
  onRestart: () => void
}

export function GameOverPanel({ score, bestScore, onRestart }: GameOverPanelProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 px-6">
      <div className="w-full max-w-xs rounded-lg bg-white/92 p-6 text-center shadow-xl backdrop-blur">
        <h2 className="text-2xl font-black text-slate-900">游戏结束</h2>
        <p className="mt-4 text-lg font-bold text-slate-800">本局分数 {score}</p>
        <p className="mt-2 text-sm font-bold text-amber-700">最高分 {bestScore}</p>
        <button
          type="button"
          className="mt-6 w-full rounded-md bg-sky-500 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-sky-600 active:scale-95"
          onClick={onRestart}
        >
          再玩一次
        </button>
      </div>
    </div>
  )
}
