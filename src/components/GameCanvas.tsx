import { useEffect, useRef } from 'react'
import { LOW_PERFORMANCE_DEVICE_PIXEL_RATIO, MAX_DEVICE_PIXEL_RATIO } from '../game/constants'
import { drawGame } from '../game/draw'
import type { GameState } from '../game/types'

type GameCanvasProps = {
  state: GameState
}

export function GameCanvas({ state }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')

    if (!canvas || !ctx) {
      return
    }

    const maxDpr = state.lowPerformance ? LOW_PERFORMANCE_DEVICE_PIXEL_RATIO : MAX_DEVICE_PIXEL_RATIO
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
    const pixelWidth = Math.round(state.width * dpr)
    const pixelHeight = Math.round(state.height * dpr)
    const previous = canvasSizeRef.current

    // 只有尺寸或 DPR 变化时才重设 canvas.width/height，避免每帧重置画布导致额外开销。
    if (previous.width !== pixelWidth || previous.height !== pixelHeight || previous.dpr !== dpr) {
      canvas.width = pixelWidth
      canvas.height = pixelHeight
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvasSizeRef.current = { width: pixelWidth, height: pixelHeight, dpr }
    }

    // 逻辑坐标仍然使用 480x800，DPR 只影响实际像素密度。
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
