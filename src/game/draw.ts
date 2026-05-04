import { CAT_SQUASH_TIME, JUMP_FORCE, SHAKE_TIME } from './constants'
import type { Fish, GameState, Obstacle } from './types'

type ImageAsset = {
  image: HTMLImageElement
  isLoaded: boolean
  hasFailed: boolean
}

const IMAGE_PATHS = {
  bg: '/assets/images/bg.png',
  cat: '/assets/images/cat.png',
  fish: '/assets/images/fish.png',
  box: '/assets/images/box.png',
}

// 图片资源在模块加载时就开始异步下载；游戏绘制不会等待它们，避免卡住首帧。
const imageAssets: Record<keyof typeof IMAGE_PATHS, ImageAsset> = {
  bg: createImageAsset(IMAGE_PATHS.bg),
  cat: createImageAsset(IMAGE_PATHS.cat),
  fish: createImageAsset(IMAGE_PATHS.fish),
  box: createImageAsset(IMAGE_PATHS.box),
}

// 创建图片缓存对象，加载成功后才允许 Canvas 使用 drawImage。
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

// 判断图片是否真的可绘制；失败或没加载完时都会返回 false。
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

// 背景图未加载完成时，继续使用原来的几何背景兜底。
function drawFallbackBackground(ctx: CanvasRenderingContext2D, state: GameState) {
  const sky = ctx.createLinearGradient(0, 0, 0, state.height)
  sky.addColorStop(0, '#9be7ff')
  sky.addColorStop(0.68, '#f7fbff')
  sky.addColorStop(1, '#c8f0a5')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, state.width, state.height)

  ctx.fillStyle = '#8fd36b'
  ctx.fillRect(0, state.groundY, state.width, state.height - state.groundY)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.beginPath()
  ctx.ellipse(state.width * 0.22, 96, 42, 15, 0, 0, Math.PI * 2)
  ctx.ellipse(state.width * 0.68, 150, 54, 18, 0, 0, Math.PI * 2)
  ctx.fill()
}

// 背景优先使用图片素材，并铺满整个 480x800 游戏画面。
function drawBackground(ctx: CanvasRenderingContext2D, state: GameState) {
  const bg = imageAssets.bg

  if (canDrawImage(bg)) {
    drawImageCover(ctx, bg.image, state.width, state.height)
    return
  }

  drawFallbackBackground(ctx, state)
}

// 用简单图形画猫，作为图片未加载完成时的兜底。
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

  ctx.strokeStyle = '#2b2b2b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(centerX, centerY + 6, 6, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
}

// 猫图片绘制得比碰撞盒稍大一点，碰撞仍然只使用 state.cat 的小矩形。
function drawCatImage(ctx: CanvasRenderingContext2D, state: GameState) {
  const cat = state.cat
  const image = imageAssets.cat.image
  const drawWidth = cat.width + 22
  const drawHeight = cat.height + 24
  const drawX = cat.x - (drawWidth - cat.width) / 2
  const drawY = cat.y - (drawHeight - cat.height) + 8

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)
}

// 绘制猫时保留上一阶段的 squash/stretch 动效。
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

  if (canDrawImage(imageAssets.cat)) {
    drawCatImage(ctx, state)
  } else {
    drawFallbackCat(ctx, state)
  }

  ctx.restore()
}

// 障碍物图片未准备好时，用原来的木箱几何图形兜底。
function drawFallbackObstacle(ctx: CanvasRenderingContext2D, obstacle: Obstacle) {
  ctx.fillStyle = '#7b4f2f'
  ctx.beginPath()
  ctx.roundRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 6)
  ctx.fill()

  ctx.strokeStyle = '#5b351f'
  ctx.lineWidth = 3
  ctx.strokeRect(obstacle.x + 6, obstacle.y + 8, obstacle.width - 12, obstacle.height - 16)
}

// 障碍物图片绘制尺寸比碰撞盒略大，视觉更饱满，碰撞不变。
function drawObstacleImage(ctx: CanvasRenderingContext2D, obstacle: Obstacle) {
  const drawWidth = obstacle.width + 22
  const drawHeight = obstacle.height + 18
  const drawX = obstacle.x - (drawWidth - obstacle.width) / 2
  const drawY = obstacle.y - (drawHeight - obstacle.height)

  ctx.drawImage(imageAssets.box.image, drawX, drawY, drawWidth, drawHeight)
}

// 绘制所有障碍物，图片未加载完成时不会阻塞游戏。
function drawObstacles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const obstacle of state.obstacles) {
    if (canDrawImage(imageAssets.box)) {
      drawObstacleImage(ctx, obstacle)
    } else {
      drawFallbackObstacle(ctx, obstacle)
    }
  }
}

// 小鱼图片未准备好时，用原来的几何小鱼兜底。
function drawFallbackFish(ctx: CanvasRenderingContext2D, fish: Fish) {
  ctx.fillStyle = '#ffdf3d'
  ctx.beginPath()
  ctx.ellipse(fish.x + 14, fish.y + 15, 14, 9, 0, 0, Math.PI * 2)
  ctx.moveTo(fish.x + 27, fish.y + 15)
  ctx.lineTo(fish.x + 36, fish.y + 7)
  ctx.lineTo(fish.x + 36, fish.y + 23)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#2b2b2b'
  ctx.beginPath()
  ctx.arc(fish.x + 8, fish.y + 13, 2, 0, Math.PI * 2)
  ctx.fill()
}

// 小鱼视觉尺寸略大于碰撞盒，玩家看到吃到时会更自然。
function drawFishImage(ctx: CanvasRenderingContext2D, fish: Fish) {
  const drawWidth = fish.width + 16
  const drawHeight = fish.height + 16
  const drawX = fish.x - (drawWidth - fish.width) / 2
  const drawY = fish.y - (drawHeight - fish.height) / 2

  ctx.drawImage(imageAssets.fish.image, drawX, drawY, drawWidth, drawHeight)
}

// 小鱼是加分道具，优先画图片素材，图片没好就继续用几何图形。
function drawFish(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const fish of state.fish) {
    if (canDrawImage(imageAssets.fish)) {
      drawFishImage(ctx, fish)
    } else {
      drawFallbackFish(ctx, fish)
    }
  }
}

// 绘制小鱼爆开的粒子，透明度会随着生命值降低而淡出。
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

// 对外暴露的总绘制函数，React 组件只需要调用这一层。
export function drawGame(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, state.width, state.height)
  ctx.save()

  // 撞击时给整张画布一个很短的随机偏移，形成轻微震屏效果。
  if (state.shakeTimer > 0) {
    const shakeRate = state.shakeTimer / SHAKE_TIME
    const shake = state.shakeStrength * shakeRate
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)
  }

  drawBackground(ctx, state)
  drawFish(ctx, state)
  drawParticles(ctx, state)
  drawObstacles(ctx, state)
  drawCat(ctx, state)
  ctx.restore()
}
