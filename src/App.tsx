import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { CgStoryPanel } from './components/CgStoryPanel'
import { GameCanvas } from './components/GameCanvas'
import { GameOverPanel } from './components/GameOverPanel'
import { HUD } from './components/HUD'
import { StartPanel } from './components/StartPanel'
import { getBgmMuted, initBgm, playBgm, playGameSound, setBgmMuted, stopBgm } from './game/audio'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './game/constants'
import { createInitialState, jump, resetGameToReady, startGame, togglePause, updateGame } from './game/engine'
import { loadLowPerformanceState, saveLowPerformanceState } from './game/settings'
import { getNewlyUnlockedCgChapters, getUnlockedCgChapters, type CgChapter } from './game/story'
import { useGameLoop } from './hooks/useGameLoop'

type ViewportState = {
  width: number
  height: number
  gameWidth: number
  gameHeight: number
  isLandscape: boolean
}

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
  const initialLowPerformance = useMemo(() => loadLowPerformanceState(), [])
  const [viewport, setViewport] = useState(initialViewport)
  const [state, setState] = useState(() => ({
    ...createInitialState(DESIGN_WIDTH, DESIGN_HEIGHT),
    lowPerformance: initialLowPerformance,
  }))
  const [showGuideTip, setShowGuideTip] = useState(false)
  const [isMuted, setIsMuted] = useState(() => getBgmMuted())
  const [showFps, setShowFps] = useState(false)
  const [fps, setFps] = useState(0)
  const [pendingCgChapters, setPendingCgChapters] = useState<CgChapter[]>([])
  const [activeCgChapter, setActiveCgChapter] = useState<CgChapter | null>(null)
  const fpsFramesRef = useRef(0)
  const fpsTimeRef = useRef(0)
  const runStartTotalOrangeRef = useRef(state.totalOrangeCount)
  const hasPreparedGameOverCgRef = useRef(false)

  const handleStart = useCallback(() => {
    setShowGuideTip(true)
    setActiveCgChapter(null)
    setPendingCgChapters([])
    hasPreparedGameOverCgRef.current = false
    playBgm()
    setState((current) => {
      runStartTotalOrangeRef.current = current.totalOrangeCount
      return startGame(current)
    })
  }, [])

  const handleRestartToStart = useCallback(() => {
    setShowGuideTip(false)
    setActiveCgChapter(null)
    setPendingCgChapters([])
    hasPreparedGameOverCgRef.current = false
    stopBgm()
    setState((current) => resetGameToReady(current))
  }, [])

  const requestJump = useCallback(() => {
    if (activeCgChapter) {
      return
    }

    playBgm()
    setState((current) => {
      if (current.status === 'gameOver' || current.status === 'ready') {
        setShowGuideTip(true)
        setActiveCgChapter(null)
        setPendingCgChapters([])
        hasPreparedGameOverCgRef.current = false
        runStartTotalOrangeRef.current = current.totalOrangeCount
        return startGame(current)
      }

      setShowGuideTip(false)

      if (current.status === 'paused') {
        return togglePause(current)
      }

      return jump(current)
    })
  }, [activeCgChapter])

  const handleGamePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.target instanceof HTMLElement && event.target.closest('button')) {
        return
      }

      event.preventDefault()
      requestJump()
    },
    [requestJump],
  )

  const handleTogglePause = useCallback(() => {
    setState((current) => togglePause(current))
  }, [])

  const handleShowCg = useCallback(() => {
    setPendingCgChapters((current) => {
      const [nextChapter, ...rest] = current
      setActiveCgChapter(nextChapter ?? null)
      return rest
    })
  }, [])

  const handleCloseCg = useCallback(() => {
    setActiveCgChapter(null)
  }, [])

  const handleShowCgRecords = useCallback(() => {
    setState((current) => {
      const unlockedChapters = getUnlockedCgChapters(current.totalOrangeCount)
      setActiveCgChapter(unlockedChapters.at(-1) ?? null)
      return current
    })
  }, [])

  useGameLoop((deltaSeconds) => {
    if (import.meta.env.DEV && showFps) {
      fpsFramesRef.current += 1
      fpsTimeRef.current += deltaSeconds

      if (fpsTimeRef.current >= 0.5) {
        setFps(Math.round(fpsFramesRef.current / fpsTimeRef.current))
        fpsFramesRef.current = 0
        fpsTimeRef.current = 0
      }
    }

    setState((current) => updateGame(current, deltaSeconds))
  }, !activeCgChapter && state.status !== 'paused' && (state.status === 'playing' || state.status === 'crashing' || state.shakeTimer > 0 || state.particles.length > 0))

  useEffect(() => {
    initBgm()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space') {
        return
      }

      event.preventDefault()

      if (activeCgChapter || event.repeat) {
        return
      }

      requestJump()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeCgChapter, requestJump])

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
    if (state.audioCue) {
      playGameSound(state.audioCue.type, isMuted)
    }
  }, [isMuted, state.audioCue])

  useEffect(() => {
    if (isMuted) {
      stopBgm()
    } else if (state.status === 'playing' || state.status === 'crashing' || state.status === 'paused') {
      playBgm()
    }
  }, [isMuted, state.status])

  useEffect(() => {
    if (state.status === 'gameOver') {
      stopBgm()
    }
  }, [state.status])

  useEffect(() => {
    if (state.status !== 'gameOver') {
      hasPreparedGameOverCgRef.current = false
      return
    }

    if (hasPreparedGameOverCgRef.current) {
      return
    }

    hasPreparedGameOverCgRef.current = true
    setPendingCgChapters(getNewlyUnlockedCgChapters(runStartTotalOrangeRef.current, state.totalOrangeCount))
  }, [state.status, state.totalOrangeCount])

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

  const handleToggleMute = useCallback(() => {
    setIsMuted((current) => {
      const next = !current
      setBgmMuted(next)
      if (next) {
        stopBgm()
      } else if (state.status === 'playing' || state.status === 'crashing' || state.status === 'paused') {
        playBgm()
      }
      return next
    })
  }, [state.status])

  const handleToggleLowPerformance = useCallback(() => {
    setState((current) => {
      const next = !current.lowPerformance
      saveLowPerformanceState(next)
      return { ...current, lowPerformance: next }
    })
  }, [])

  return (
    <main
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-950"
      style={{ width: viewport.width, height: viewport.height }}
    >
      {viewport.isLandscape && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950 px-8 text-center text-white">
          <div className="rounded-lg border border-white/15 bg-white/10 px-6 py-5 text-lg font-bold shadow-2xl backdrop-blur">
            竖屏玩会更适合猫meme跑酷
          </div>
        </div>
      )}
      <section
        className="relative touch-none overflow-hidden bg-sky-100 shadow-2xl"
        style={{ width: viewport.gameWidth, height: viewport.gameHeight }}
        onPointerDown={handleGamePointerDown}
      >
        <div className="absolute bottom-4 right-4 z-10 flex gap-2">
          {import.meta.env.DEV && (
            <button
              type="button"
              className="rounded-full bg-slate-950/55 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition active:scale-90"
              onClick={() => setShowFps((current) => !current)}
              onPointerDown={(event) => event.stopPropagation()}
            >
              FPS
            </button>
          )}
          {(state.status === 'playing' || state.status === 'paused') && (
            <button
              type="button"
              className="rounded-full bg-slate-950/55 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition active:scale-90"
              onClick={handleTogglePause}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {state.status === 'paused' ? '继续' : '暂停'}
            </button>
          )}
          <button
            type="button"
            className="rounded-full bg-slate-950/55 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition active:scale-90"
            onClick={handleToggleLowPerformance}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {state.lowPerformance ? '省电' : '流畅'}
          </button>
          <button
            type="button"
            className="rounded-full bg-slate-950/55 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition active:scale-90"
            onClick={handleToggleMute}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {isMuted ? '静音' : '声音'}
          </button>
        </div>
        {import.meta.env.DEV && showFps && (
          <div className="pointer-events-none absolute bottom-16 right-4 z-10 rounded-md bg-black/60 px-3 py-1.5 text-xs font-bold text-lime-200">
            {fps} FPS
          </div>
        )}
        <GameCanvas state={state} />
        <HUD
          score={state.score}
          bestScore={state.bestScore}
          orangeCount={state.orangeCount}
          totalOrangeCount={state.totalOrangeCount}
          level={state.level}
          combo={state.combo}
          activePowerUps={state.activePowerUps}
        />
        {state.levelUpTimer > 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg bg-slate-950/65 px-7 py-4 text-center text-white shadow-2xl backdrop-blur">
              <p className="text-3xl font-black">Level Up</p>
              <p className="mt-1 text-sm font-bold">Level {state.level}</p>
            </div>
          </div>
        )}
        {state.status === 'playing' && showGuideTip && (
          <div className="pointer-events-none absolute inset-x-5 top-24 rounded-lg bg-slate-950/45 px-4 py-3 text-center text-sm font-bold leading-6 text-white shadow-lg backdrop-blur">
            点按跳跃，收集橘子，躲开酸柠檬路障
          </div>
        )}
        {state.status === 'paused' && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 px-6"
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <div className="w-full max-w-xs rounded-lg bg-white/92 p-6 text-center shadow-xl backdrop-blur">
              <p className="text-sm font-black text-orange-600">游戏已暂停</p>
              <h2 className="mt-2 text-3xl font-black text-slate-900">猫猫歇一下</h2>
              <button
                type="button"
                className="mt-6 w-full rounded-md bg-orange-500 px-4 py-3 text-base font-bold text-white shadow-sm transition duration-100 hover:bg-orange-600 active:scale-90 active:brightness-110"
                onClick={handleTogglePause}
              >
                继续跑
              </button>
            </div>
          </div>
        )}
        {state.status === 'ready' && (
          <StartPanel
            bestScore={state.bestScore}
            unlockedCgCount={getUnlockedCgChapters(state.totalOrangeCount).length}
            onShowCgRecords={handleShowCgRecords}
            onStart={handleStart}
          />
        )}
        {state.status === 'gameOver' && (
          <GameOverPanel
            score={state.score}
            bestScore={state.bestScore}
            orangeCount={state.orangeCount}
            totalOrangeCount={state.totalOrangeCount}
            hasNewCg={pendingCgChapters.length > 0}
            onShowCg={handleShowCg}
            onRestart={handleRestartToStart}
          />
        )}
        {activeCgChapter && <CgStoryPanel chapter={activeCgChapter} onClose={handleCloseCg} />}
      </section>
    </main>
  )
}

export default App
