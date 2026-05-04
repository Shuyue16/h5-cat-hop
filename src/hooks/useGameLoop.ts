import { useEffect, useRef } from 'react'

// 使用 requestAnimationFrame 驱动游戏循环，并把毫秒差换算成秒。
export function useGameLoop(onFrame: (deltaSeconds: number) => void, isRunning: boolean) {
  const frameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const onFrameRef = useRef(onFrame)

  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useEffect(() => {
    if (!isRunning) {
      lastTimeRef.current = null
      return
    }

    function tick(time: number) {
      const lastTime = lastTimeRef.current ?? time
      const deltaSeconds = (time - lastTime) / 1000
      lastTimeRef.current = time
      onFrameRef.current(deltaSeconds)
      frameRef.current = window.requestAnimationFrame(tick)
    }

    frameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [isRunning])
}
