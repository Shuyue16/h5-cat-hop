import {
  BASE_SPEED,
  CAT_HEIGHT,
  CAT_SQUASH_TIME,
  CAT_WIDTH,
  CAT_X,
  FISH_INTERVAL,
  FISH_PARTICLE_COUNT,
  FISH_SCORE,
  FISH_SIZE,
  GRAVITY,
  GROUND_HEIGHT,
  JUMP_FORCE,
  MAX_OBSTACLE_HEIGHT,
  MAX_OBSTACLE_INTERVAL,
  MAX_SPEED,
  MIN_OBSTACLE_HEIGHT,
  MIN_OBSTACLE_INTERVAL,
  OBSTACLE_WIDTH,
  SHAKE_STRENGTH,
  SHAKE_TIME,
  SPEED_PER_SCORE,
  SPEED_SMOOTHING,
  STORAGE_BEST_SCORE_KEY,
} from './constants'
import { clamp, isRectColliding, lerp, randomFloat, randomInt } from './math'
import type { Fish, GameState, Obstacle, Particle } from './types'

// 从浏览器本地缓存读取最高分；读取失败时返回 0，避免影响游戏启动。
export function loadBestScore() {
  const saved = window.localStorage.getItem(STORAGE_BEST_SCORE_KEY)
  return saved ? Number(saved) || 0 : 0
}

// 把最高分保存到 localStorage，刷新页面后也能保留。
export function saveBestScore(score: number) {
  window.localStorage.setItem(STORAGE_BEST_SCORE_KEY, String(score))
}

// 创建一局新的游戏状态，所有初始数值都集中在这里，方便新手调参。
export function createInitialState(width: number, height: number, bestScore = loadBestScore()): GameState {
  const groundY = height - GROUND_HEIGHT

  return {
    status: 'ready',
    width,
    height,
    groundY,
    cat: {
      x: CAT_X,
      y: groundY - CAT_HEIGHT,
      width: CAT_WIDTH,
      height: CAT_HEIGHT,
      velocityY: 0,
      isOnGround: true,
      squashTimer: 0,
    },
    obstacles: [],
    fish: [],
    particles: [],
    score: 0,
    bestScore,
    speed: BASE_SPEED,
    shakeTimer: 0,
    shakeStrength: 0,
    obstacleTimer: 0,
    obstacleNextInterval: randomFloat(MIN_OBSTACLE_INTERVAL, MAX_OBSTACLE_INTERVAL),
    fishTimer: 0,
    nextId: 1,
  }
}

// 开始游戏时保留最高分，其它运行数据重置。
export function startGame(state: GameState): GameState {
  return {
    ...createInitialState(state.width, state.height, state.bestScore),
    status: 'playing',
  }
}

// 画布尺寸变化时重建状态，避免手机屏幕旋转或窗口变化后坐标错位。
export function resizeGame(state: GameState, width: number, height: number): GameState {
  const next = createInitialState(width, height, state.bestScore)
  return {
    ...next,
    status: state.status === 'playing' ? 'gameOver' : state.status,
    score: state.score,
    bestScore: state.bestScore,
  }
}

// 玩家输入时让猫跳起来；只有在地面上才允许起跳，防止无限连跳。
export function jump(state: GameState): GameState {
  if (state.status !== 'playing' || !state.cat.isOnGround) {
    return state
  }

  return {
    ...state,
    cat: {
      ...state.cat,
      velocityY: JUMP_FORCE,
      isOnGround: false,
      squashTimer: CAT_SQUASH_TIME,
    },
  }
}

// 根据分数计算目标速度，真正使用的速度会在 updateGame 里平滑靠近它。
function getTargetSpeedByScore(score: number) {
  return clamp(BASE_SPEED + score * SPEED_PER_SCORE, BASE_SPEED, MAX_SPEED)
}

// 给下一次障碍物生成一个随机间隔；最小值保守一点，避免连续障碍物过近。
function getNextObstacleInterval(speed: number) {
  const speedRate = (speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)
  const minInterval = clamp(MIN_OBSTACLE_INTERVAL - speedRate * 0.12, 1.03, MIN_OBSTACLE_INTERVAL)
  const maxInterval = clamp(MAX_OBSTACLE_INTERVAL - speedRate * 0.18, 1.38, MAX_OBSTACLE_INTERVAL)
  return randomFloat(minInterval, maxInterval)
}

// 生成一个新的障碍物，从画面右侧进入。
function createObstacle(state: GameState): Obstacle {
  const height = randomInt(MIN_OBSTACLE_HEIGHT, MAX_OBSTACLE_HEIGHT)

  return {
    id: state.nextId,
    x: state.width + OBSTACLE_WIDTH,
    y: state.groundY - height,
    width: OBSTACLE_WIDTH,
    height,
    passed: false,
  }
}

// 生成一条小鱼，小鱼悬浮在空中，鼓励玩家主动跳跃收集。
function createFish(state: GameState): Fish {
  const minY = Math.max(82, state.groundY - 260)
  const maxY = Math.max(minY, state.groundY - 130)

  return {
    id: state.nextId,
    x: state.width + FISH_SIZE,
    y: randomInt(minY, maxY),
    width: FISH_SIZE,
    height: FISH_SIZE,
    collected: false,
  }
}

// 小鱼被吃掉时生成一组粒子，让反馈更明显。
function createFishParticles(fish: Fish, startId: number): { particles: Particle[]; nextId: number } {
  const particles: Particle[] = []
  const centerX = fish.x + fish.width / 2
  const centerY = fish.y + fish.height / 2

  for (let index = 0; index < FISH_PARTICLE_COUNT; index += 1) {
    const angle = (Math.PI * 2 * index) / FISH_PARTICLE_COUNT + randomFloat(-0.25, 0.25)
    const speed = randomFloat(90, 210)
    particles.push({
      id: startId + index,
      x: centerX,
      y: centerY,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed - 30,
      size: randomFloat(3, 6),
      life: 0.45,
      maxLife: 0.45,
      color: index % 2 === 0 ? '#ffdf3d' : '#ff8f3d',
    })
  }

  return { particles, nextId: startId + FISH_PARTICLE_COUNT }
}

// 更新粒子的位置和生命值，生命值归零后会被移除。
function updateParticles(particles: Particle[], deltaSeconds: number) {
  return particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.velocityX * deltaSeconds,
      y: particle.y + particle.velocityY * deltaSeconds,
      velocityY: particle.velocityY + GRAVITY * 0.18 * deltaSeconds,
      life: particle.life - deltaSeconds,
    }))
    .filter((particle) => particle.life > 0)
}

// 非游玩状态下也更新震屏和粒子，死亡瞬间的反馈不会被游戏暂停吃掉。
function updateFeedbackOnly(state: GameState, safeDelta: number): GameState {
  const shakeTimer = Math.max(0, state.shakeTimer - safeDelta)

  return {
    ...state,
    particles: updateParticles(state.particles, safeDelta),
    shakeTimer,
    shakeStrength: shakeTimer > 0 ? state.shakeStrength : 0,
  }
}

// 每一帧更新游戏状态：移动物体、加分、碰撞、判断死亡，以及各种手感反馈。
export function updateGame(state: GameState, deltaSeconds: number): GameState {
  const safeDelta = Math.min(deltaSeconds, 0.033)

  if (state.status !== 'playing') {
    return updateFeedbackOnly(state, safeDelta)
  }

  const targetSpeed = getTargetSpeedByScore(state.score)
  const speed = lerp(state.speed, targetSpeed, clamp(safeDelta * SPEED_SMOOTHING, 0, 1))
  const groundCatY = state.groundY - state.cat.height
  const nextCatY = state.cat.y + state.cat.velocityY * safeDelta
  const nextVelocityY = state.cat.velocityY + GRAVITY * safeDelta
  const hasLanded = nextCatY >= groundCatY
  const cat = {
    ...state.cat,
    y: hasLanded ? groundCatY : nextCatY,
    velocityY: hasLanded ? 0 : nextVelocityY,
    isOnGround: hasLanded,
    squashTimer: Math.max(0, state.cat.squashTimer - safeDelta),
  }

  let nextScore = state.score
  let nextId = state.nextId
  let obstacleTimer = state.obstacleTimer + safeDelta
  let obstacleNextInterval = state.obstacleNextInterval
  let fishTimer = state.fishTimer + safeDelta
  let particles = updateParticles(state.particles, safeDelta)
  let obstacles = state.obstacles.map((obstacle) => ({
    ...obstacle,
    x: obstacle.x - speed * safeDelta,
  }))
  let fish = state.fish.map((item) => ({
    ...item,
    x: item.x - speed * safeDelta,
  }))

  if (obstacleTimer >= obstacleNextInterval) {
    obstacles = [...obstacles, createObstacle({ ...state, nextId })]
    obstacleTimer = 0
    obstacleNextInterval = getNextObstacleInterval(speed)
    nextId += 1
  }

  if (fishTimer >= FISH_INTERVAL) {
    fish = [...fish, createFish({ ...state, nextId })]
    fishTimer = 0
    nextId += 1
  }

  obstacles = obstacles.map((obstacle) => {
    if (!obstacle.passed && obstacle.x + obstacle.width < cat.x) {
      nextScore += 1
      return { ...obstacle, passed: true }
    }

    return obstacle
  })

  fish = fish.map((item) => {
    if (!item.collected && isRectColliding(cat, item)) {
      const burst = createFishParticles(item, nextId)
      particles = [...particles, ...burst.particles]
      nextId = burst.nextId
      nextScore += FISH_SCORE
      return { ...item, collected: true }
    }

    return item
  })

  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -20)
  fish = fish.filter((item) => !item.collected && item.x + item.width > -20)

  const hitObstacle = obstacles.some((obstacle) => isRectColliding(cat, obstacle))
  const bestScore = Math.max(state.bestScore, nextScore)

  if (hitObstacle) {
    saveBestScore(bestScore)
  }

  return {
    ...state,
    status: hitObstacle ? 'gameOver' : 'playing',
    cat,
    obstacles,
    fish,
    particles,
    score: nextScore,
    bestScore,
    speed,
    shakeTimer: hitObstacle ? SHAKE_TIME : Math.max(0, state.shakeTimer - safeDelta),
    shakeStrength: hitObstacle ? SHAKE_STRENGTH : state.shakeStrength,
    obstacleTimer,
    obstacleNextInterval,
    fishTimer,
    nextId,
  }
}
