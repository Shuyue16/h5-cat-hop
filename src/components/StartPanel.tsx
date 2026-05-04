type StartPanelProps = {
  bestScore: number
  onStart: () => void
}

export function StartPanel({ bestScore, onStart }: StartPanelProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-sky-950/25 px-6">
      <div className="w-full max-w-xs rounded-lg bg-white/92 p-6 text-center shadow-xl backdrop-blur">
        <p className="text-sm font-black text-orange-600">猫meme的告白跑酷</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">给duro的橘子</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          猫meme要一路收集橘子，躲开酸柠檬路障，把甜甜的心意送到duro面前。
        </p>
        <p className="mt-4 text-sm font-bold text-amber-700">最高分 {bestScore}</p>
        <button
          type="button"
          className="mt-6 w-full rounded-md bg-orange-500 px-4 py-3 text-base font-bold text-white shadow-sm transition duration-100 hover:bg-orange-600 active:scale-90 active:brightness-110"
          onClick={onStart}
        >
          出发收橘子
        </button>
      </div>
    </div>
  )
}
