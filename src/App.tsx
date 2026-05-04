import { useCallback, useEffect, useMemo, useState, type TouchEvent } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { GameOverPanel } from './components/GameOverPanel'
import { HUD } from './components/HUD'
import { StartPanel } from './components/StartPanel'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './game/constants'
import { createInitialState, jump, startGame, updateGame } from './game/engine'
import { useGameLoop } from './hooks/useGameLoop'

type ViewportState = {
  width: number
  height: number
  gameWidth: number
  gameHeight: number
  isLandscape: boolean
}

// 读取当前可视区域。visualViewport 对 iPhone Safari 地址栏收起/展开更友好。
function getViewportState(): ViewportState {
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const scale = Math.min(viewportWidth / DESIGN_WIDTH, viewportHeight / DESIGN_HEIGHT)

  return {
    width: viewportWidth,
    height: viewportHeight,
    gameWidth: Math.round(DESIGN_WIDTH * scale),
    gameHeight: Math.round(DESIGN_HEIGHT * scale),
    isLandscape: viewportWidth > viewportHeight,
  }
}

function App() {
  const initialViewport = useMemo(() => getViewportState(), [])
  const [viewport, setViewport] = useState(initialViewport)
  const [state, setState] = useState(() => createInitialState(DESIGN_WIDTH, DESIGN_HEIGHT))
  const [showGuideTip, setShowGuideTip] = useState(false)

  const handleStart = useCallback(() => {
    setShowGuideTip(true)
    setState((current) => startGame(current))
  }, [])

  const handleJump = useCallback(() => {
    setShowGuideTip(false)
    setState((current) => jump(current))
  }, [])

  useGameLoop((deltaSeconds) => {
    setState((current) => updateGame(current, deltaSeconds))
  }, state.status === 'playing' || state.shakeTimer > 0 || state.particles.length > 0)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === 'Space') {
        event.preventDefault()
        setState((current) => {
          if (current.status === 'gameOver' || current.status === 'ready') {
            setShowGuideTip(true)
            return startGame(current)
          }

          setShowGuideTip(false)
          return jump(current)
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (state.status !== 'playing' || !showGuideTip) {
      return
    }

    const timer = window.setTimeout(() => {
      setShowGuideTip(false)
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [showGuideTip, state.status])

  useEffect(() => {
    function handleResize() {
      setViewport(getViewportState())
    }

    window.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [])

  // touchstart 覆盖整块游戏区域，手机上点任意位置都能触发跳跃。
  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (event.target instanceof HTMLElement && event.target.closest('button')) {
        return
      }

      event.preventDefault()
      handleJump()
    },
    [handleJump],
  )

  return (
    <main
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-950"
      style={{ width: viewport.width, height: viewport.height }}
    >
      {viewport.isLandscape && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950 px-8 text-center text-white">
          <div className="rounded-lg border border-white/15 bg-white/10 px-6 py-5 text-lg font-bold shadow-2xl backdrop-blur">
            请旋转手机竖屏游玩
          </div>
        </div>
      )}
      <section
        className="relative overflow-hidden bg-sky-100 shadow-2xl"
        style={{ width: viewport.gameWidth, height: viewport.gameHeight }}
        onPointerDown={handleJump}
        onTouchStart={handleTouchStart}
      >
        <GameCanvas state={state} />
        <HUD score={state.score} bestScore={state.bestScore} />
        {state.status === 'playing' && showGuideTip && (
          <div className="pointer-events-none absolute inset-x-5 top-24 rounded-lg bg-slate-950/45 px-4 py-3 text-center text-sm font-bold leading-6 text-white shadow-lg backdrop-blur">
            点击屏幕让猫猫跳跃，躲开箱子，吃小鱼加分
          </div>
        )}
        {state.status === 'ready' && <StartPanel bestScore={state.bestScore} onStart={handleStart} />}
        {state.status === 'gameOver' && (
          <GameOverPanel score={state.score} bestScore={state.bestScore} onRestart={handleStart} />
        )}
      </section>
    </main>
  )
}

export default App
