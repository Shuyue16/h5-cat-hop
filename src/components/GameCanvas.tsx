import { useEffect, useRef } from 'react'
import { drawGame } from '../game/draw'
import type { GameState } from '../game/types'

type GameCanvasProps = {
  state: GameState
}

export function GameCanvas({ state }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')

    if (!canvas || !ctx) {
      return
    }

    // 高清屏会有更高的 devicePixelRatio，按 DPR 放大真实画布可以避免 Canvas 发糊。
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = Math.round(state.width * dpr)
    canvas.height = Math.round(state.height * dpr)
    canvas.style.width = '100%'
    canvas.style.height = '100%'

    // 逻辑坐标仍然使用 480x800，绘制时由 Canvas 自动映射到高清像素。
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawGame(ctx, state)
  }, [state])

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none select-none"
      aria-label="Cat Hop Rush game canvas"
    />
  )
}
