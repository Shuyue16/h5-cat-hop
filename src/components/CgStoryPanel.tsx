import type { CgChapter } from '../game/story'

type CgStoryPanelProps = {
  chapter: CgChapter
  onClose: () => void
}

export function CgStoryPanel({ chapter, onClose }: CgStoryPanelProps) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/45 px-6"
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <div className="w-full max-w-xs overflow-hidden rounded-lg bg-white shadow-2xl">
        <img src={chapter.image} alt={chapter.title} className="h-52 w-full object-cover" draggable={false} />
        <div className="p-5 text-center">
          <p className="text-xs font-black uppercase tracking-wide text-orange-500">
            CG解锁 · 累计{chapter.threshold}颗橘子
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">{chapter.title}</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{chapter.body}</p>
          <button
            type="button"
            className="mt-5 w-full rounded-md bg-slate-900 px-4 py-3 text-base font-bold text-white shadow-sm transition duration-100 hover:bg-slate-800 active:scale-90 active:brightness-110"
            onClick={onClose}
          >
            回到结算
          </button>
        </div>
      </div>
    </div>
  )
}
