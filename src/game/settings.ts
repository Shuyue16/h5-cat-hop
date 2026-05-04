import { STORAGE_LOW_PERFORMANCE_KEY } from './constants'

// 读取低性能模式；localStorage 不可用时默认关闭，保持最佳视觉效果。
export function loadLowPerformanceState() {
  try {
    return window.localStorage.getItem(STORAGE_LOW_PERFORMANCE_KEY) === 'true'
  } catch {
    return false
  }
}

// 保存低性能模式；保存失败时只影响下次打开，不影响本局设置。
export function saveLowPerformanceState(isLowPerformance: boolean) {
  try {
    window.localStorage.setItem(STORAGE_LOW_PERFORMANCE_KEY, String(isLowPerformance))
  } catch {
    // 某些浏览器会禁用 localStorage，这里静默降级。
  }
}
