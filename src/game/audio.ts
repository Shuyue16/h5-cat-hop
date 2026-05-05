import { STORAGE_AUDIO_MUTED_KEY } from './constants'
import type { AudioCueType } from './types'

const BGM_SRC = '/assets/audio/bgm.mp3'
const BGM_VOLUME = 0.35

let audioContext: AudioContext | null = null
let bgmAudio: HTMLAudioElement | null = null

type AudioWindow = Window & {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

export function getBgmMuted() {
  try {
    return window.localStorage.getItem(STORAGE_AUDIO_MUTED_KEY) === 'true'
  } catch {
    return false
  }
}

export function setBgmMuted(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_AUDIO_MUTED_KEY, String(value))
  } catch {
    // localStorage 不可用时，只影响本次静音状态持久化，不影响游戏继续运行。
  }

  if (bgmAudio) {
    bgmAudio.muted = value
  }

  if (value) {
    stopBgm()
  }
}

export function initBgm() {
  if (bgmAudio) {
    return bgmAudio
  }

  const audio = new Audio(BGM_SRC)
  audio.loop = true
  audio.volume = BGM_VOLUME
  audio.muted = getBgmMuted()
  audio.preload = 'auto'
  bgmAudio = audio

  return bgmAudio
}

export function playBgm() {
  if (getBgmMuted()) {
    return
  }

  const audio = initBgm()
  audio.muted = false

  void audio.play().catch(() => {
    // 移动端或浏览器自动播放策略可能会拦截，静默处理，等待下一次用户交互再尝试。
  })
}

export function stopBgm() {
  if (!bgmAudio) {
    return
  }

  bgmAudio.pause()
  bgmAudio.currentTime = 0
}

// 兼容原有命名，短音效仍然沿用同一个静音状态。
export const loadMutedState = getBgmMuted
export const saveMutedState = setBgmMuted

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
