import {
  BASE_SPEED,
  CAT_HEIGHT,
  CAT_SQUASH_TIME,
  CAT_WIDTH,
  CAT_X,
  AIR_JUMP_COUNT,
  DOUBLE_JUMP_FORCE,
  DOUBLE_SCORE_DURATION,
  EASY_START_SECONDS,
  FALL_GRAVITY_MULTIPLIER,
  FISH_INTERVAL,
  FISH_PARTICLE_COUNT,
  FISH_SCORE,
  FISH_SIZE,
  COMBO_SCORE_STEP,
  COMBO_WINDOW,
  GRAVITY,
  GROUND_HEIGHT,
  JUMP_FORCE,
  JUMP_PARTICLE_COUNT,
  LEVEL_SPEED_BONUS,
  LEVEL_UP_TIP_TIME,
  LOW_PERFORMANCE_PARTICLE_RATE,
  MAGNET_DURATION,
  MAGNET_PULL_SPEED,
  MAGNET_RADIUS,
  MAX_OBSTACLE_HEIGHT,
  MAX_OBSTACLE_INTERVAL,
  MAX_POWER_UP_INTERVAL,
  MAX_SPEED,
  MIN_OBSTACLE_GAP,
  MIN_OBSTACLE_HEIGHT,
  MIN_OBSTACLE_INTERVAL,
  MIN_POWER_UP_INTERVAL,
  OBSTACLE_WIDTH,
  POWER_UP_SIZE,
  SHAKE_STRENGTH,
  SHAKE_TIME,
  SHIELD_DURATION,
  SLOW_MOTION_SCALE,
  SLOW_MOTION_TIME,
  MAX_COMBO_MULTIPLIER,
  SCORE_PER_LEVEL,
  SPEED_PER_SCORE,
  SPEED_SMOOTHING,
  STORAGE_BEST_SCORE_KEY,
  STORAGE_TOTAL_ORANGE_KEY,
  TIME_SPEED_RAMP_SECONDS,
} from './constants'
import { clamp, isRectColliding, lerp, randomFloat, randomInt } from './math'
import type { ActivePowerUps, Fish, GameState, Obstacle, Particle, PowerUp, PowerUpType } from './types'

const POWER_UP_TYPES: PowerUpType[] = ['magnet', 'shield', 'doubleScore']

// 低性能模式减少粒子数量，保留反馈但降低每帧绘制和对象数量。
function getParticleCount(baseCount: number, state: GameState) {
  return state.lowPerformance ? Math.max(2, Math.round(baseCount * LOW_PERFORMANCE_PARTICLE_RATE)) : baseCount
}

// 从浏览器本地缓存读取最高分；读取失败时返回 0，避免隐私模式影响游戏启动。
export function loadBestScore() {
  try {
    const saved = window.localStorage.getItem(STORAGE_BEST_SCORE_KEY)
    const score = saved ? Number(saved) : 0
    return Number.isFinite(score) ? Math.max(0, score) : 0
  } catch {
    return 0
  }
}

// 把最高分保存到 localStorage；保存失败时静默跳过，游戏仍然可以继续玩。
export function saveBestScore(score: number) {
  try {
    window.localStorage.setItem(STORAGE_BEST_SCORE_KEY, String(score))
  } catch {
    // 某些浏览器隐私模式会禁用 localStorage，这里不让错误中断游戏。
  }
}

export function loadTotalOrangeCount() {
  try {
    const saved = window.localStorage.getItem(STORAGE_TOTAL_ORANGE_KEY)
    const count = saved ? Number(saved) : 0
    return Number.isFinite(count) ? Math.max(0, count) : 0
  } catch {
    return 0
  }
}

function saveTotalOrangeCount(count: number) {
  try {
    window.localStorage.setItem(STORAGE_TOTAL_ORANGE_KEY, String(count))
  } catch {
    // Ignore storage failures in private browsing or restricted WebViews.
  }
}

// 创建一局新的游戏状态，所有初始数值都集中在这里，方便继续调参。
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
      airJumpsRemaining: AIR_JUMP_COUNT,
    },
    obstacles: [],
    fish: [],
    powerUps: [],
    activePowerUps: {
      magnet: 0,
      shield: 0,
      doubleScore: 0,
    },
    particles: [],
    score: 0,
    bestScore,
    orangeCount: 0,
    totalOrangeCount: loadTotalOrangeCount(),
    level: 1,
    levelUpTimer: 0,
    combo: 0,
    comboTimer: 0,
    speed: BASE_SPEED,
    elapsedTime: 0,
    slowMotionTimer: 0,
    shakeTimer: 0,
    shakeStrength: 0,
    obstacleTimer: 0,
    obstacleNextInterval: randomFloat(MIN_OBSTACLE_INTERVAL, MAX_OBSTACLE_INTERVAL),
    fishTimer: 0,
    powerUpTimer: 0,
    powerUpNextInterval: randomFloat(MIN_POWER_UP_INTERVAL, MAX_POWER_UP_INTERVAL),
    audioCue: null,
    lowPerformance: false,
    nextId: 1,
  }
}

// 开始游戏时保留最高分，其它运行数据重置。
export function startGame(state: GameState): GameState {
  return {
    ...createInitialState(state.width, state.height, state.bestScore),
    lowPerformance: state.lowPerformance,
    status: 'playing',
  }
}

export function resetGameToReady(state: GameState): GameState {
  return {
    ...createInitialState(state.width, state.height, state.bestScore),
    totalOrangeCount: state.totalOrangeCount,
    lowPerformance: state.lowPerformance,
  }
}

export function togglePause(state: GameState): GameState {
  if (state.status === 'playing') {
    return { ...state, status: 'paused' }
  }

  if (state.status === 'paused') {
    return { ...state, status: 'playing' }
  }

  return state
}

// 画布尺寸变化时重建状态，避免手机屏幕旋转或窗口变化后坐标错位。
export function resizeGame(state: GameState, width: number, height: number): GameState {
  const next = createInitialState(width, height, state.bestScore)
  return {
    ...next,
    status: state.status === 'playing' ? 'gameOver' : state.status,
    score: state.score,
    bestScore: state.bestScore,
    orangeCount: state.orangeCount,
    totalOrangeCount: state.totalOrangeCount,
    lowPerformance: state.lowPerformance,
  }
}

// 跳跃成功时在脚下生成一点尘粒，点击反馈会更明显。
function createJumpParticles(state: GameState, startId: number): { particles: Particle[]; nextId: number } {
  const particles: Particle[] = []
  const baseX = state.cat.x + state.cat.width * 0.45
  const baseY = state.cat.y + state.cat.height

  const count = getParticleCount(JUMP_PARTICLE_COUNT, state)

  for (let index = 0; index < count; index += 1) {
    particles.push({
      id: startId + index,
      x: baseX + randomFloat(-18, 16),
      y: baseY + randomFloat(-2, 6),
      velocityX: randomFloat(-95, -25),
      velocityY: randomFloat(-80, -25),
      size: randomFloat(3, 6),
      life: 0.24,
      maxLife: 0.24,
      color: '#f2d2a2',
    })
  }

  return { particles, nextId: startId + count }
}

// 玩家输入时让猫跳起来；只有在地面上才允许起跳，长按不会连续跳。
export function jump(state: GameState): GameState {
  if (state.status !== 'playing') {
    return state
  }

  const isGroundJump = state.cat.isOnGround
  const canAirJump = !state.cat.isOnGround && state.cat.airJumpsRemaining > 0

  if (!isGroundJump && !canAirJump) {
    return state
  }

  const dust = createJumpParticles(state, state.nextId)

  return {
    ...state,
    cat: {
      ...state.cat,
      velocityY: isGroundJump ? JUMP_FORCE : DOUBLE_JUMP_FORCE,
      isOnGround: false,
      squashTimer: CAT_SQUASH_TIME,
      airJumpsRemaining: isGroundJump ? AIR_JUMP_COUNT : state.cat.airJumpsRemaining - 1,
    },
    particles: [...state.particles, ...dust.particles],
    audioCue: { id: state.nextId, type: 'jump' },
    nextId: dust.nextId,
  }
}

// 速度曲线：前 10 秒更温和，之后同时根据时间和分数逐渐增加。
function getTargetSpeed(state: GameState) {
  const scoreSpeed = state.score * SPEED_PER_SCORE
  const timeAfterEasyStart = Math.max(0, state.elapsedTime - EASY_START_SECONDS)
  const timeProgress = clamp(timeAfterEasyStart / TIME_SPEED_RAMP_SECONDS, 0, 1)
  const easyScoreRate = state.elapsedTime < EASY_START_SECONDS ? 0.35 : 1
  const timeSpeed = (MAX_SPEED - BASE_SPEED) * 0.62 * timeProgress
  const levelSpeed = (state.level - 1) * LEVEL_SPEED_BONUS

  return clamp(BASE_SPEED + scoreSpeed * easyScoreRate + timeSpeed + levelSpeed, BASE_SPEED, MAX_SPEED)
}

// 每 10 分提升一个阶段；用分数计算可以保证阶段和玩家表现绑定。
function getLevelByScore(score: number) {
  return Math.floor(score / SCORE_PER_LEVEL) + 1
}

// combo 越高，小鱼得分越高；倍率有上限，避免分数失控。
function getComboMultiplier(combo: number) {
  return clamp(1 + Math.max(0, combo - 1) * COMBO_SCORE_STEP, 1, MAX_COMBO_MULTIPLIER)
}

// 给下一次障碍物生成随机间隔，同时用最小像素距离兜底，避免出现无解间距。
function getNextObstacleInterval(state: GameState, speed: number) {
  const timeAfterEasyStart = Math.max(0, state.elapsedTime - EASY_START_SECONDS)
  const difficulty = clamp(timeAfterEasyStart / TIME_SPEED_RAMP_SECONDS, 0, 1)
  const minInterval = lerp(MIN_OBSTACLE_INTERVAL + 0.2, MIN_OBSTACLE_INTERVAL, difficulty)
  const maxInterval = lerp(MAX_OBSTACLE_INTERVAL + 0.25, MAX_OBSTACLE_INTERVAL, difficulty)
  const randomInterval = randomFloat(minInterval, maxInterval)
  const safeInterval = MIN_OBSTACLE_GAP / Math.max(speed, 1)

  return Math.max(randomInterval, safeInterval)
}

// 障碍高度加入随时间增长的随机范围：前期偏矮，后期允许更高一点。
function createObstacle(state: GameState): Obstacle {
  const difficulty = clamp((state.elapsedTime - EASY_START_SECONDS) / TIME_SPEED_RAMP_SECONDS, 0, 1)
  const levelDifficulty = clamp((state.level - 1) / 8, 0, 1)
  const minHeight = Math.round(lerp(MIN_OBSTACLE_HEIGHT, MIN_OBSTACLE_HEIGHT + 14, Math.max(difficulty, levelDifficulty)))
  const maxHeight = Math.round(lerp(MAX_OBSTACLE_HEIGHT - 30, MAX_OBSTACLE_HEIGHT, Math.max(difficulty, levelDifficulty)))
  const height = randomInt(minHeight, maxHeight)

  return {
    id: state.nextId,
    x: state.width + OBSTACLE_WIDTH,
    y: state.groundY - height,
    width: OBSTACLE_WIDTH,
    height,
    passed: false,
  }
}

// 阶段越高，偶尔生成“双箱组合”，但间距保守，避免突然无解。
function createObstacleGroup(state: GameState): { obstacles: Obstacle[]; nextId: number } {
  const first = createObstacle(state)
  const comboChance = clamp((state.level - 2) * 0.04, 0, 0.18)

  if (state.level < 3 || Math.random() > comboChance) {
    return { obstacles: [first], nextId: state.nextId + 1 }
  }

  const gap = randomInt(260, 360)
  const heightScale = randomFloat(0.58, 0.88)
  const secondHeight = Math.round(clamp(first.height * heightScale, MIN_OBSTACLE_HEIGHT, MAX_OBSTACLE_HEIGHT))
  const second: Obstacle = {
    id: state.nextId + 1,
    x: first.x + first.width + gap,
    y: state.groundY - secondHeight,
    width: OBSTACLE_WIDTH,
    height: secondHeight,
    passed: false,
  }

  return { obstacles: [first, second], nextId: state.nextId + 2 }
}

// 生成一条小鱼，小鱼悬浮在空中，鼓励玩家主动跳跃收集。
function createFish(state: GameState): Fish {
  const minY = Math.max(82, state.groundY - 265)
  const maxY = Math.max(minY, state.groundY - 125)

  return {
    id: state.nextId,
    x: state.width + FISH_SIZE,
    y: randomInt(minY, maxY),
    width: FISH_SIZE,
    height: FISH_SIZE,
    collected: false,
  }
}

// 随机生成一种道具；道具频率较低，避免喧宾夺主。
function createPowerUp(state: GameState): PowerUp {
  const type = POWER_UP_TYPES[randomInt(0, POWER_UP_TYPES.length - 1)]
  const minY = Math.max(92, state.groundY - 280)
  const maxY = Math.max(minY, state.groundY - 145)

  return {
    id: state.nextId,
    type,
    x: state.width + POWER_UP_SIZE,
    y: randomInt(minY, maxY),
    width: POWER_UP_SIZE,
    height: POWER_UP_SIZE,
    collected: false,
  }
}

// 小鱼被吃掉时生成一组小粒子，让反馈更明显但不遮挡画面。
function createFishParticles(fish: Fish, startId: number, state: GameState): { particles: Particle[]; nextId: number } {
  const particles: Particle[] = []
  const centerX = fish.x + fish.width / 2
  const centerY = fish.y + fish.height / 2
  const count = getParticleCount(FISH_PARTICLE_COUNT, state)

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + randomFloat(-0.25, 0.25)
    const speed = randomFloat(85, 185)
    particles.push({
      id: startId + index,
      x: centerX,
      y: centerY,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed - 25,
      size: randomFloat(2.5, 5),
      life: 0.38,
      maxLife: 0.38,
      color: index % 2 === 0 ? '#ffdf3d' : '#ff8f3d',
    })
  }

  return { particles, nextId: startId + count }
}

// 道具吃到时给一点轻量粒子反馈，颜色按道具类型区分。
function createPowerUpParticles(powerUp: PowerUp, startId: number, state: GameState): { particles: Particle[]; nextId: number } {
  const colorByType: Record<PowerUpType, string> = {
    magnet: '#ef4444',
    shield: '#38bdf8',
    doubleScore: '#a855f7',
  }
  const particles: Particle[] = []
  const centerX = powerUp.x + powerUp.width / 2
  const centerY = powerUp.y + powerUp.height / 2

  const count = getParticleCount(8, state)

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count
    const speed = randomFloat(70, 145)
    particles.push({
      id: startId + index,
      x: centerX,
      y: centerY,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      size: randomFloat(3, 5),
      life: 0.34,
      maxLife: 0.34,
      color: colorByType[powerUp.type],
    })
  }

  return { particles, nextId: startId + particles.length }
}

// 更新粒子的位置和生命值，生命值归零后会被移除。
function updateParticles(particles: Particle[], deltaSeconds: number) {
  const aliveParticles: Particle[] = []

  for (const particle of particles) {
    particle.x += particle.velocityX * deltaSeconds
    particle.y += particle.velocityY * deltaSeconds
    particle.velocityY += GRAVITY * 0.18 * deltaSeconds
    particle.life -= deltaSeconds

    if (particle.life > 0) {
      aliveParticles.push(particle)
    }
  }

  return aliveParticles
}

// 更新猫的跳跃物理；上升干脆，下落用更大的重力，落地更利落。
function updateCat(state: GameState, deltaSeconds: number) {
  const gravity = state.cat.velocityY > 0 ? GRAVITY * FALL_GRAVITY_MULTIPLIER : GRAVITY
  const nextVelocityY = state.cat.velocityY + gravity * deltaSeconds
  const nextCatY = state.cat.y + nextVelocityY * deltaSeconds
  const groundCatY = state.groundY - state.cat.height
  const hasLanded = nextCatY >= groundCatY

  return {
    ...state.cat,
    y: hasLanded ? groundCatY : nextCatY,
    velocityY: hasLanded ? 0 : nextVelocityY,
    isOnGround: hasLanded,
    airJumpsRemaining: hasLanded ? AIR_JUMP_COUNT : state.cat.airJumpsRemaining,
    squashTimer: Math.max(0, state.cat.squashTimer - deltaSeconds),
  }
}

// 所有持续性道具每帧递减剩余时间，减到 0 后自动失效。
function updateActivePowerUps(activePowerUps: ActivePowerUps, deltaSeconds: number): ActivePowerUps {
  return {
    magnet: Math.max(0, activePowerUps.magnet - deltaSeconds),
    shield: Math.max(0, activePowerUps.shield - deltaSeconds),
    doubleScore: Math.max(0, activePowerUps.doubleScore - deltaSeconds),
  }
}

// 根据吃到的道具刷新持续时间；重复吃到同类道具会续满时间。
function activatePowerUp(activePowerUps: ActivePowerUps, type: PowerUpType): ActivePowerUps {
  if (type === 'magnet') {
    return { ...activePowerUps, magnet: MAGNET_DURATION }
  }

  if (type === 'shield') {
    return { ...activePowerUps, shield: SHIELD_DURATION }
  }

  return { ...activePowerUps, doubleScore: DOUBLE_SCORE_DURATION }
}

// 磁铁生效时，范围内的小鱼会平滑靠近猫，而不是瞬间飞过去。
function pullFishWithMagnet(fish: Fish[], cat: GameState['cat'], deltaSeconds: number) {
  const catCenterX = cat.x + cat.width / 2
  const catCenterY = cat.y + cat.height / 2
  const pullAmount = clamp(deltaSeconds * MAGNET_PULL_SPEED, 0, 1)

  return fish.map((item) => {
    const fishCenterX = item.x + item.width / 2
    const fishCenterY = item.y + item.height / 2
    const distance = Math.hypot(catCenterX - fishCenterX, catCenterY - fishCenterY)

    if (distance > MAGNET_RADIUS) {
      return item
    }

    return {
      ...item,
      x: lerp(item.x, catCenterX - item.width / 2, pullAmount),
      y: lerp(item.y, catCenterY - item.height / 2, pullAmount),
    }
  })
}

// 双倍分数生效时，所有得分都乘 2。
function getScoreMultiplier(activePowerUps: ActivePowerUps) {
  return activePowerUps.doubleScore > 0 ? 2 : 1
}

// 慢动作阶段只持续很短时间，结束后再展示 Game Over 面板。
function updateCrashingState(state: GameState, safeDelta: number): GameState {
  const slowDelta = safeDelta * SLOW_MOTION_SCALE
  const slowMotionTimer = Math.max(0, state.slowMotionTimer - safeDelta)
  const shakeTimer = Math.max(0, state.shakeTimer - safeDelta)
  const movedObstacles = state.obstacles
    .map((obstacle) => ({ ...obstacle, x: obstacle.x - state.speed * slowDelta }))
    .filter((obstacle) => obstacle.x + obstacle.width > -20)
  const movedFish = state.fish
    .map((item) => ({ ...item, x: item.x - state.speed * slowDelta }))
    .filter((item) => item.x + item.width > -20)
  const movedPowerUps = state.powerUps
    .map((powerUp) => ({ ...powerUp, x: powerUp.x - state.speed * slowDelta }))
    .filter((powerUp) => powerUp.x + powerUp.width > -20)

  return {
    ...state,
    status: slowMotionTimer <= 0 ? 'gameOver' : 'crashing',
    cat: updateCat(state, slowDelta),
    obstacles: movedObstacles,
    fish: movedFish,
    powerUps: movedPowerUps,
    particles: updateParticles(state.particles, slowDelta),
    slowMotionTimer,
    levelUpTimer: Math.max(0, state.levelUpTimer - safeDelta),
    shakeTimer,
    shakeStrength: shakeTimer > 0 ? state.shakeStrength : 0,
  }
}

// 非游玩状态下也更新震屏和粒子，死亡瞬间的反馈不会被游戏暂停吃掉。
function updateFeedbackOnly(state: GameState, safeDelta: number): GameState {
  const shakeTimer = Math.max(0, state.shakeTimer - safeDelta)

  return {
    ...state,
    particles: updateParticles(state.particles, safeDelta),
    levelUpTimer: Math.max(0, state.levelUpTimer - safeDelta),
    shakeTimer,
    shakeStrength: shakeTimer > 0 ? state.shakeStrength : 0,
  }
}

// 每一帧更新游戏状态：移动物体、道具计时、加分、碰撞、死亡反馈。
export function updateGame(state: GameState, deltaSeconds: number): GameState {
  const safeDelta = Math.min(deltaSeconds, 0.033)

  if (state.status === 'crashing') {
    return updateCrashingState(state, safeDelta)
  }

  if (state.status === 'paused') {
    return state
  }

  if (state.status !== 'playing') {
    return updateFeedbackOnly(state, safeDelta)
  }

  const elapsedTime = state.elapsedTime + safeDelta
  const comboTimer = Math.max(0, state.comboTimer - safeDelta)
  const combo = comboTimer > 0 ? state.combo : 0
  const activePowerUps = updateActivePowerUps(state.activePowerUps, safeDelta)
  const stateWithTime = { ...state, elapsedTime, activePowerUps, combo, comboTimer }
  const targetSpeed = getTargetSpeed(stateWithTime)
  const speed = lerp(state.speed, targetSpeed, clamp(safeDelta * SPEED_SMOOTHING, 0, 1))
  const cat = updateCat(state, safeDelta)
  const scoreMultiplier = getScoreMultiplier(activePowerUps)

  let nextScore = state.score
  let nextOrangeCount = state.orangeCount
  let nextTotalOrangeCount = state.totalOrangeCount
  let nextLevel = state.level
  let levelUpTimer = Math.max(0, state.levelUpTimer - safeDelta)
  let nextCombo = combo
  let nextComboTimer = comboTimer
  let audioCue: GameState['audioCue'] = null
  let nextId = state.nextId
  let nextActivePowerUps = activePowerUps
  let obstacleTimer = state.obstacleTimer + safeDelta
  let obstacleNextInterval = state.obstacleNextInterval
  let fishTimer = state.fishTimer + safeDelta
  let powerUpTimer = state.powerUpTimer + safeDelta
  let powerUpNextInterval = state.powerUpNextInterval
  let particles = updateParticles(state.particles, safeDelta)
  let obstacles = state.obstacles.map((obstacle) => ({
    ...obstacle,
    x: obstacle.x - speed * safeDelta,
  }))
  let fish = state.fish.map((item) => ({
    ...item,
    x: item.x - speed * safeDelta,
  }))
  let powerUps = state.powerUps.map((powerUp) => ({
    ...powerUp,
    x: powerUp.x - speed * safeDelta,
  }))

  if (obstacleTimer >= obstacleNextInterval) {
    const group = createObstacleGroup({ ...stateWithTime, nextId })
    obstacles = [...obstacles, ...group.obstacles]
    obstacleTimer = 0
    obstacleNextInterval = getNextObstacleInterval(stateWithTime, speed)
    nextId = group.nextId
  }

  if (fishTimer >= FISH_INTERVAL) {
    fish = [...fish, createFish({ ...stateWithTime, nextId })]
    fishTimer = 0
    nextId += 1
  }

  if (powerUpTimer >= powerUpNextInterval) {
    powerUps = [...powerUps, createPowerUp({ ...stateWithTime, nextId })]
    powerUpTimer = 0
    powerUpNextInterval = randomFloat(MIN_POWER_UP_INTERVAL, MAX_POWER_UP_INTERVAL)
    nextId += 1
  }

  if (nextActivePowerUps.magnet > 0) {
    fish = pullFishWithMagnet(fish, cat, safeDelta)
  }

  obstacles = obstacles.map((obstacle) => {
    if (!obstacle.passed && obstacle.x + obstacle.width < cat.x) {
      nextScore += 1 * scoreMultiplier
      return { ...obstacle, passed: true }
    }

    return obstacle
  })

  fish = fish.map((item) => {
    if (!item.collected && isRectColliding(cat, item)) {
      const burst = createFishParticles(item, nextId, state)
      const comboAfterEat = nextCombo + 1
      const comboMultiplier = getComboMultiplier(comboAfterEat)
      particles = [...particles, ...burst.particles]
      nextId = burst.nextId
      nextCombo = comboAfterEat
      nextComboTimer = COMBO_WINDOW
      nextOrangeCount += 1
      nextTotalOrangeCount += 1
      nextScore += Math.round(FISH_SCORE * scoreMultiplier * comboMultiplier)
      audioCue = { id: item.id, type: 'fish' }
      return { ...item, collected: true }
    }

    return item
  })

  powerUps = powerUps.map((item) => {
    if (!item.collected && isRectColliding(cat, item)) {
      const burst = createPowerUpParticles(item, nextId, state)
      particles = [...particles, ...burst.particles]
      nextId = burst.nextId
      nextActivePowerUps = activatePowerUp(nextActivePowerUps, item.type)
      return { ...item, collected: true }
    }

    return item
  })

  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -20)
  fish = fish.filter((item) => !item.collected && item.x + item.width > -20)
  powerUps = powerUps.filter((item) => !item.collected && item.x + item.width > -20)

  const hitObstacle = obstacles.some((obstacle) => isRectColliding(cat, obstacle))
  const hasShield = nextActivePowerUps.shield > 0

  if (hitObstacle && hasShield) {
    nextActivePowerUps = { ...nextActivePowerUps, shield: 0 }
    obstacles = obstacles.filter((obstacle) => !isRectColliding(cat, obstacle))
  }

  if (hitObstacle) {
    audioCue = { id: nextId, type: 'hit' }
  }

  const shouldCrash = hitObstacle && !hasShield
  const calculatedLevel = getLevelByScore(nextScore)
  if (calculatedLevel > state.level) {
    nextLevel = calculatedLevel
    levelUpTimer = LEVEL_UP_TIP_TIME
  } else {
    nextLevel = calculatedLevel
  }
  const isNewBestScore = nextScore > state.bestScore
  const bestScore = isNewBestScore ? nextScore : state.bestScore

  if (shouldCrash && isNewBestScore) {
    saveBestScore(nextScore)
  }

  if (nextTotalOrangeCount > state.totalOrangeCount) {
    saveTotalOrangeCount(nextTotalOrangeCount)
  }

  return {
    ...state,
    status: shouldCrash ? 'crashing' : 'playing',
    cat,
    obstacles,
    fish,
    powerUps,
    activePowerUps: nextActivePowerUps,
    particles,
    score: nextScore,
    bestScore,
    orangeCount: nextOrangeCount,
    totalOrangeCount: nextTotalOrangeCount,
    level: nextLevel,
    levelUpTimer,
    combo: nextCombo,
    comboTimer: nextComboTimer,
    speed,
    elapsedTime,
    slowMotionTimer: shouldCrash ? SLOW_MOTION_TIME : 0,
    shakeTimer: hitObstacle ? SHAKE_TIME : Math.max(0, state.shakeTimer - safeDelta),
    shakeStrength: hitObstacle ? SHAKE_STRENGTH : state.shakeStrength,
    obstacleTimer,
    obstacleNextInterval,
    fishTimer,
    powerUpTimer,
    powerUpNextInterval,
    audioCue,
    nextId,
  }
}
