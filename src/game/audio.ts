import { STORAGE_AUDIO_MUTED_KEY } from './constants'
import type { AudioCueType } from './types'

let audioContext: AudioContext | null = null
let musicGain: GainNode | null = null
let musicTimer: number | null = null
let musicStep = 0

type AudioWindow = Window & {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

export function loadMutedState() {
  try {
    return window.localStorage.getItem(STORAGE_AUDIO_MUTED_KEY) === 'true'
  } catch {
    return false
  }
}

export function saveMutedState(isMuted: boolean) {
  try {
    window.localStorage.setItem(STORAGE_AUDIO_MUTED_KEY, String(isMuted))
  } catch {
    // Ignore storage failures in private browsing or restricted WebViews.
  }
}

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

function getMusicGain(context: AudioContext) {
  if (!musicGain) {
    musicGain = context.createGain()
    musicGain.gain.value = 0.055
    musicGain.connect(context.destination)
  }

  return musicGain
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

function playMusicNote(frequency: number, duration: number, delay: number, volume = 0.85) {
  const context = getAudioContext()

  if (!context) {
    return
  }

  const output = getMusicGain(context)
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const now = context.currentTime + delay

  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(frequency, now)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(0.16 * volume, now + 0.025)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  oscillator.connect(gain)
  gain.connect(output)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.03)
}

function scheduleMusicBar() {
  const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 523.25, 392]
  const bass = [130.81, 196, 146.83, 196]

  for (let index = 0; index < notes.length; index += 1) {
    const beat = index * 0.18
    const melodyIndex = (musicStep + index) % notes.length
    playMusicNote(notes[melodyIndex], 0.14, beat, index % 2 === 0 ? 0.9 : 0.72)
  }

  for (let index = 0; index < bass.length; index += 1) {
    playMusicNote(bass[(Math.floor(musicStep / 2) + index) % bass.length], 0.18, index * 0.36, 0.38)
  }

  musicStep = (musicStep + 1) % notes.length
}

export function startBackgroundMusic(isMuted: boolean) {
  if (isMuted || musicTimer !== null) {
    return
  }

  const context = getAudioContext()

  if (!context) {
    return
  }

  getMusicGain(context)
  scheduleMusicBar()
  musicTimer = window.setInterval(scheduleMusicBar, 1440)
}

export function stopBackgroundMusic() {
  if (musicTimer !== null) {
    window.clearInterval(musicTimer)
    musicTimer = null
  }
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
