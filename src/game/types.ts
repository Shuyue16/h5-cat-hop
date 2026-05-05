export type GameStatus = 'ready' | 'playing' | 'paused' | 'crashing' | 'gameOver'

export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type Cat = Rect & {
  velocityY: number
  isOnGround: boolean
  squashTimer: number
  remainingAirJumps: number
}

export type Obstacle = Rect & {
  id: number
  passed: boolean
}

export type Fish = Rect & {
  id: number
  collected: boolean
}

export type PowerUpType = 'magnet' | 'shield' | 'doubleScore'
export type AudioCueType = 'jump' | 'fish' | 'hit'

export type PowerUp = Rect & {
  id: number
  type: PowerUpType
  collected: boolean
}

export type ActivePowerUps = {
  magnet: number
  shield: number
  doubleScore: number
}

export type Particle = {
  id: number
  x: number
  y: number
  velocityX: number
  velocityY: number
  size: number
  life: number
  maxLife: number
  color: string
}

export type AudioCue = {
  id: number
  type: AudioCueType
}

export type GameState = {
  status: GameStatus
  width: number
  height: number
  groundY: number
  cat: Cat
  obstacles: Obstacle[]
  fish: Fish[]
  powerUps: PowerUp[]
  activePowerUps: ActivePowerUps
  particles: Particle[]
  score: number
  bestScore: number
  orangeCount: number
  totalOrangeCount: number
  level: number
  levelUpTimer: number
  combo: number
  comboTimer: number
  speed: number
  elapsedTime: number
  slowMotionTimer: number
  shakeTimer: number
  shakeStrength: number
  obstacleTimer: number
  obstacleNextInterval: number
  fishTimer: number
  powerUpTimer: number
  powerUpNextInterval: number
  audioCue: AudioCue | null
  lowPerformance: boolean
  nextId: number
}
