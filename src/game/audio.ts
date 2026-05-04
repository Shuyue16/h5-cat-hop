import { STORAGE_AUDIO_MUTED_KEY } from './constants'
import type { AudioCueType } from './types'

let audioContext: AudioContext | null = null

type AudioWindow = Window & {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

// 读取静音状态；localStorage 不可用时默认不静音。
export function loadMutedState() {
  try {
    return window.localStorage.getItem(STORAGE_AUDIO_MUTED_KEY) === 'true'
  } catch {
    return false
  }
}

// 保存静音状态；保存失败不影响游戏继续运行。
export function saveMutedState(isMuted: boolean) {
  try {
    window.localStorage.setItem(STORAGE_AUDIO_MUTED_KEY, String(isMuted))
  } catch {
    // 隐私模式可能禁止 localStorage，静音按钮仍然在当前页面生效。
  }
}

// Web Audio 需要在用户交互后创建或恢复，所以这里做懒加载。
function getAudioContext() {
  const audioWindow = window as AudioWindow
  const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext

  if (!AudioContextClass) {
    return null
  }

  const context = audioContext ?? new AudioContextClass()
  audioContext = context

  if (context.state === 'suspended') {
    void context.resume()
  }

  return context
}

// 使用振荡器和包络生成短音效，不依赖任何外部音频文件。
function playTone(startFrequency: number, endFrequency: number, duration: number, type: OscillatorType, volume: number) {
  const context = getAudioContext()

  if (!context) {
    return
  }

  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const now = context.currentTime

  oscillator.type = type
  oscillator.frequency.setValueAtTime(startFrequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.02)
}

export function playGameSound(type: AudioCueType, isMuted: boolean) {
  if (isMuted) {
    return
  }

  if (type === 'jump') {
    playTone(360, 740, 0.12, 'triangle', 0.08)
  } else if (type === 'fish') {
    playTone(880, 1320, 0.1, 'sine', 0.07)
  } else {
    playTone(150, 58, 0.22, 'sawtooth', 0.09)
  }
}
