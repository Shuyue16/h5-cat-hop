export type GameStatus = 'ready' | 'playing' | 'gameOver'

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
}

export type Obstacle = Rect & {
  id: number
  passed: boolean
}

export type Fish = Rect & {
  id: number
  collected: boolean
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

export type GameState = {
  status: GameStatus
  width: number
  height: number
  groundY: number
  cat: Cat
  obstacles: Obstacle[]
  fish: Fish[]
  particles: Particle[]
  score: number
  bestScore: number
  speed: number
  shakeTimer: number
  shakeStrength: number
  obstacleTimer: number
  obstacleNextInterval: number
  fishTimer: number
  nextId: number
}
