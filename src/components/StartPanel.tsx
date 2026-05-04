type StartPanelProps = {
  bestScore: number
  onStart: () => void
}

export function StartPanel({ bestScore, onStart }: StartPanelProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-sky-950/25 px-6">
      <div className="w-full max-w-xs rounded-lg bg-white/90 p-6 text-center shadow-xl backdrop-blur">
        <h1 className="text-3xl font-black text-slate-900">Cat Hop Rush</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          点击、触摸或按空格跳跃，躲开障碍物，收集小鱼加分。
        </p>
        <p className="mt-4 text-sm font-bold text-amber-700">最高分 {bestScore}</p>
        <button
          type="button"
          className="mt-6 w-full rounded-md bg-emerald-500 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
          onClick={onStart}
        >
          开始游戏
        </button>
      </div>
    </div>
  )
}
