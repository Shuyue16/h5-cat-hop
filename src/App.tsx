import { useCallback, useEffect, useMemo, useState } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { GameOverPanel } from './components/GameOverPanel'
import { HUD } from './components/HUD'
import { StartPanel } from './components/StartPanel'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './game/constants'
import { createInitialState, jump, resizeGame, startGame, updateGame } from './game/engine'
import { useGameLoop } from './hooks/useGameLoop'

function App() {
  const gameSize = useMemo(() => {
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const scale = Math.min(windowWidth / DESIGN_WIDTH, windowHeight / DESIGN_HEIGHT)

    return {
      width: Math.round(DESIGN_WIDTH * scale),
      height: Math.round(DESIGN_HEIGHT * scale),
    }
  }, [])

  const [state, setState] = useState(() => createInitialState(gameSize.width, gameSize.height))

  const handleStart = useCallback(() => {
    setState((current) => startGame(current))
  }, [])

  const handleJump = useCallback(() => {
    setState((current) => jump(current))
  }, [])

  useGameLoop((deltaSeconds) => {
    setState((current) => updateGame(current, deltaSeconds))
  }, state.status === 'playing' || state.shakeTimer > 0 || state.particles.length > 0)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === 'Space') {
        event.preventDefault()
        handleJump()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleJump])

  useEffect(() => {
    function handleResize() {
      const scale = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT)
      setState((current) =>
        resizeGame(current, Math.round(DESIGN_WIDTH * scale), Math.round(DESIGN_HEIGHT * scale)),
      )
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950">
      <section
        className="relative overflow-hidden bg-sky-100 shadow-2xl"
        style={{ width: state.width, height: state.height }}
      >
        <GameCanvas state={state} onJump={handleJump} />
        <HUD score={state.score} bestScore={state.bestScore} />
        {state.status === 'ready' && <StartPanel bestScore={state.bestScore} onStart={handleStart} />}
        {state.status === 'gameOver' && (
          <GameOverPanel score={state.score} bestScore={state.bestScore} onRestart={handleStart} />
        )}
      </section>
    </main>
  )
}

export default App
