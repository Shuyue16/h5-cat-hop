import { BASE_SPEED, CAT_SQUASH_TIME, JUMP_FORCE, MAGNET_RADIUS, MAX_SPEED, SHAKE_TIME } from './constants'
import type { Fish, GameState, Obstacle, PowerUp } from './types'

type ImageAsset = {
  image: HTMLImageElement
  isLoaded: boolean
  hasFailed: boolean
}

const IMAGE_PATHS = {
  bg: '/assets/images/bg.png',
  cat: '/assets/images/cat-run.png',
  fish: '/assets/images/orange.svg',
  box: '/assets/images/box.png',
}

const CAT_RUN_FRAME_COUNT = 18
const CAT_RUN_MIN_FPS = 10
const CAT_RUN_MAX_FPS = 24

// 图片资源异步加载；没加载好时继续用几何图形兜底，不阻塞游戏。
const imageAssets: Record<keyof typeof IMAGE_PATHS, ImageAsset> = {
  bg: createImageAsset(IMAGE_PATHS.bg),
  cat: createImageAsset(IMAGE_PATHS.cat),
  fish: createImageAsset(IMAGE_PATHS.fish),
  box: createImageAsset(IMAGE_PATHS.box),
}

function createImageAsset(src: string): ImageAsset {
  const image = new Image()
  const asset: ImageAsset = {
    image,
    isLoaded: false,
    hasFailed: false,
  }

  image.onload = () => {
    asset.isLoaded = true
  }

  image.onerror = () => {
    asset.hasFailed = true
  }

  image.src = src
  return asset
}

function canDrawImage(asset: ImageAsset) {
  return asset.isLoaded && !asset.hasFailed && asset.image.naturalWidth > 0
}

// 按 cover 模式铺满背景，类似 CSS background-size: cover。
function drawImageCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const imageRatio = image.naturalWidth / image.naturalHeight
  const canvasRatio = width / height
  let sourceX = 0
  let sourceY = 0
  let sourceWidth = image.naturalWidth
  let sourceHeight = image.naturalHeight

  if (imageRatio > canvasRatio) {
    sourceWidth = image.naturalHeight * canvasRatio
    sourceX = (image.naturalWidth - sourceWidth) / 2
  } else {
    sourceHeight = image.naturalWidth / canvasRatio
    sourceY = (image.naturalHeight - sourceHeight) / 2
  }

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)
}

function drawFallbackBackground(ctx: CanvasRenderingContext2D, state: GameState) {
  const sky = ctx.createLinearGradient(0, 0, 0, state.height)
  sky.addColorStop(0, '#9be7ff')
  sky.addColorStop(0.68, '#f7fbff')
  sky.addColorStop(1, '#c8f0a5')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, state.width, state.height)

  ctx.fillStyle = '#8fd36b'
  ctx.fillRect(0, state.groundY, state.width, state.height - state.groundY)
}

function drawBackground(ctx: CanvasRenderingContext2D, state: GameState) {
  if (canDrawImage(imageAssets.bg)) {
    drawImageCover(ctx, imageAssets.bg.image, state.width, state.height)
  } else {
    drawFallbackBackground(ctx, state)
  }

  const levelColors = ['rgba(14, 165, 233, 0)', 'rgba(34, 197, 94, 0.1)', 'rgba(249, 115, 22, 0.1)', 'rgba(168, 85, 247, 0.12)']
  const color = levelColors[(state.level - 1) % levelColors.length]
  ctx.fillStyle = color
  ctx.fillRect(0, 0, state.width, state.height)

  // 阶段越高，背景中移动装饰越多一点，给玩家“进入新阶段”的感觉。
  ctx.fillStyle = 'rgba(255, 255, 255, 0.36)'
  for (let index = 0; index < Math.min(state.level, 6); index += 1) {
    const x = (state.width - ((state.elapsedTime * 18 + index * 92) % (state.width + 80))) + 40
    const y = 78 + index * 42
    ctx.beginPath()
    ctx.ellipse(x, y, 28, 9, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 滚动云朵让背景有持续运动感，速度比地面慢，形成简单视差。
function drawScrollingClouds(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.lowPerformance) {
    return
  }

  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'

  for (let index = 0; index < 5; index += 1) {
    const baseX = state.width - ((state.elapsedTime * 28 + index * 125) % (state.width + 140))
    const y = 70 + (index % 3) * 58

    ctx.beginPath()
    ctx.ellipse(baseX, y, 26, 10, 0, 0, Math.PI * 2)
    ctx.ellipse(baseX + 24, y - 3, 34, 13, 0, 0, Math.PI * 2)
    ctx.ellipse(baseX + 55, y, 25, 9, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

// 地面滚动线条强化“猫在向前冲”的感觉，线条速度跟随当前游戏速度。
function drawGroundSpeedLines(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save()
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)'
  ctx.lineWidth = 3

  const lineCount = state.lowPerformance ? 5 : 12

  for (let index = 0; index < lineCount; index += 1) {
    const x = state.width - ((state.elapsedTime * state.speed + index * 72) % (state.width + 80))
    const y = state.groundY + 24 + (index % 3) * 18

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 34, y)
    ctx.stroke()
  }

  ctx.restore()
}

function drawFallbackCat(ctx: CanvasRenderingContext2D, state: GameState) {
  const cat = state.cat
  const centerX = cat.x + cat.width / 2
  const centerY = cat.y + cat.height / 2

  ctx.fillStyle = '#ffb347'
  ctx.beginPath()
  ctx.roundRect(cat.x, cat.y + 8, cat.width, cat.height - 8, 14)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(cat.x + 10, cat.y + 13)
  ctx.lineTo(cat.x + 18, cat.y)
  ctx.lineTo(cat.x + 26, cat.y + 13)
  ctx.moveTo(cat.x + 30, cat.y + 13)
  ctx.lineTo(cat.x + 39, cat.y)
  ctx.lineTo(cat.x + 47, cat.y + 13)
  ctx.fill()

  ctx.fillStyle = '#2b2b2b'
  ctx.beginPath()
  ctx.arc(centerX - 10, centerY, 3, 0, Math.PI * 2)
  ctx.arc(centerX + 10, centerY, 3, 0, Math.PI * 2)
  ctx.fill()
}

function drawCatImage(ctx: CanvasRenderingContext2D, state: GameState) {
  const cat = state.cat
  const image = imageAssets.cat.image
  const speedProgress = Math.max(0, Math.min(1, (state.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)))
  const runFps = CAT_RUN_MIN_FPS + (CAT_RUN_MAX_FPS - CAT_RUN_MIN_FPS) * speedProgress
  const frameIndex =
    state.status === 'playing' && cat.isOnGround ? Math.floor(state.elapsedTime * runFps) % CAT_RUN_FRAME_COUNT : 0
  const sourceWidth = image.naturalWidth / CAT_RUN_FRAME_COUNT
  const sourceHeight = image.naturalHeight
  const drawWidth = cat.width + 42
  const drawHeight = cat.height + 64
  const drawX = cat.x - (drawWidth - cat.width) / 2
  const drawY = cat.y + cat.height - drawHeight + 8

  ctx.drawImage(image, frameIndex * sourceWidth, 0, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight)
}

// 护盾激活时在猫周围画半透明圆环，碰撞盒本身不变。
function drawShieldRing(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.activePowerUps.shield <= 0) {
    return
  }

  const cat = state.cat
  const centerX = cat.x + cat.width / 2
  const centerY = cat.y + cat.height / 2

  ctx.save()
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.72)'
  ctx.fillStyle = 'rgba(56, 189, 248, 0.12)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(centerX, centerY, 43, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawCat(ctx: CanvasRenderingContext2D, state: GameState) {
  const cat = state.cat
  const centerX = cat.x + cat.width / 2
  const centerY = cat.y + cat.height / 2
  const squashProgress = cat.squashTimer > 0 ? cat.squashTimer / CAT_SQUASH_TIME : 0
  const stretchByVelocity = Math.max(0, Math.min(1, cat.velocityY / JUMP_FORCE)) * 0.08
  const scaleX = 1 + squashProgress * 0.12 - stretchByVelocity
  const scaleY = 1 - squashProgress * 0.1 + stretchByVelocity

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.scale(scaleX, scaleY)
  ctx.translate(-centerX, -centerY)
  drawShieldRing(ctx, state)

  if (canDrawImage(imageAssets.cat)) {
    drawCatImage(ctx, state)
  } else {
    drawFallbackCat(ctx, state)
  }

  ctx.restore()
}

function drawSourLemonObstacle(ctx: CanvasRenderingContext2D, obstacle: Obstacle) {
  const centerX = obstacle.x + obstacle.width / 2
  const lemonRadius = Math.min(31, obstacle.width * 0.76)
  const lemonY = obstacle.y + lemonRadius + 4
  const baseY = obstacle.y + obstacle.height - 18

  ctx.save()
  ctx.fillStyle = '#7c2d12'
  ctx.beginPath()
  ctx.roundRect(obstacle.x - 6, baseY, obstacle.width + 12, 18, 5)
  ctx.fill()

  ctx.strokeStyle = '#fff7ed'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(obstacle.x - 1, baseY + 15)
  ctx.lineTo(obstacle.x + obstacle.width + 7, baseY + 3)
  ctx.stroke()

  ctx.fillStyle = '#facc15'
  ctx.strokeStyle = '#ca8a04'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.ellipse(centerX, lemonY, lemonRadius, lemonRadius * 0.82, -0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#84cc16'
  ctx.beginPath()
  ctx.ellipse(centerX + lemonRadius * 0.28, lemonY - lemonRadius * 0.9, 11, 6, -0.45, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#713f12'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(centerX - 11, lemonY - 3)
  ctx.lineTo(centerX - 5, lemonY + 2)
  ctx.moveTo(centerX + 11, lemonY - 3)
  ctx.lineTo(centerX + 5, lemonY + 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(centerX, lemonY + 10, 7, Math.PI, 0)
  ctx.stroke()
  ctx.restore()
}

function drawObstacles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const obstacle of state.obstacles) {
    drawSourLemonObstacle(ctx, obstacle)
  }
}

function drawFallbackFish(ctx: CanvasRenderingContext2D, fish: Fish) {
  const centerX = fish.x + fish.width / 2
  const centerY = fish.y + fish.height / 2

  ctx.fillStyle = '#fb923c'
  ctx.beginPath()
  ctx.arc(centerX, centerY, fish.width * 0.46, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#22c55e'
  ctx.beginPath()
  ctx.ellipse(centerX + 3, fish.y + 2, 8, 4, -0.45, 0, Math.PI * 2)
  ctx.fill()
}

function drawFishImage(ctx: CanvasRenderingContext2D, fish: Fish) {
  const drawWidth = fish.width + 16
  const drawHeight = fish.height + 16
  const drawX = fish.x - (drawWidth - fish.width) / 2
  const drawY = fish.y - (drawHeight - fish.height) / 2

  ctx.drawImage(imageAssets.fish.image, drawX, drawY, drawWidth, drawHeight)
}

function drawFish(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const fish of state.fish) {
    if (canDrawImage(imageAssets.fish)) {
      drawFishImage(ctx, fish)
    } else {
      drawFallbackFish(ctx, fish)
    }
  }
}

// 磁铁范围用很淡的虚线提示，玩家能理解小鱼为什么会被吸过来。
function drawMagnetRange(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.activePowerUps.magnet <= 0 || state.lowPerformance) {
    return
  }

  const cat = state.cat
  ctx.save()
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.22)'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 8])
  ctx.beginPath()
  ctx.arc(cat.x + cat.width / 2, cat.y + cat.height / 2, MAGNET_RADIUS, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawPowerUpIcon(ctx: CanvasRenderingContext2D, powerUp: PowerUp) {
  const x = powerUp.x
  const y = powerUp.y
  const size = powerUp.width
  const centerX = x + size / 2
  const centerY = y + size / 2

  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)'
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, 9)
  ctx.fill()
  ctx.stroke()

  if (powerUp.type === 'magnet') {
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(centerX, centerY + 1, 10, 0.18 * Math.PI, 0.82 * Math.PI)
    ctx.stroke()
  } else if (powerUp.type === 'shield') {
    ctx.fillStyle = '#38bdf8'
    ctx.beginPath()
    ctx.moveTo(centerX, y + 7)
    ctx.lineTo(x + size - 8, y + 13)
    ctx.lineTo(centerX, y + size - 6)
    ctx.lineTo(x + 8, y + 13)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.fillStyle = '#a855f7'
    ctx.font = 'bold 15px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('x2', centerX, centerY + 1)
  }

  ctx.restore()
}

function drawPowerUps(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const powerUp of state.powerUps) {
    drawPowerUpIcon(ctx, powerUp)
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const particle of state.particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife)

    ctx.globalAlpha = alpha
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

export function drawGame(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, state.width, state.height)
  ctx.save()

  if (state.shakeTimer > 0) {
    const shakeRate = state.shakeTimer / SHAKE_TIME
    const shake = state.shakeStrength * shakeRate
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)
  }

  drawBackground(ctx, state)
  drawScrollingClouds(ctx, state)
  drawMagnetRange(ctx, state)
  drawFish(ctx, state)
  drawPowerUps(ctx, state)
  drawParticles(ctx, state)
  drawObstacles(ctx, state)
  drawGroundSpeedLines(ctx, state)
  drawCat(ctx, state)
  ctx.restore()
}
