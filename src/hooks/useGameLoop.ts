import { useEffect, useRef } from 'react'

// requestAnimationFrame 是浏览器做游戏循环的标准方式，比 setInterval 更平滑。
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
