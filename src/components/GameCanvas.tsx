import { useEffect, useRef } from 'react'
import { drawGame } from '../game/draw'
import type { GameState } from '../game/types'

type GameCanvasProps = {
  state: GameState
  onJump: () => void
}

export function GameCanvas({ state, onJump }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')

    if (!canvas || !ctx) {
      return
    }

    canvas.width = state.width
    canvas.height = state.height
    drawGame(ctx, state)
  }, [state])

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none select-none"
      aria-label="Cat Hop Rush game canvas"
      onPointerDown={onJump}
    />
  )
}
