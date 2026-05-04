import { CAT_SQUASH_TIME, JUMP_FORCE, SHAKE_TIME } from './constants'
import type { GameState } from './types'

// 每一帧先清空画布并画背景，避免上一帧的图像残留。
function drawBackground(ctx: CanvasRenderingContext2D, state: GameState) {
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

// 用简单图形画猫，先不依赖外部素材，方便理解 Canvas 绘制流程。
function drawCat(ctx: CanvasRenderingContext2D, state: GameState) {
  const cat = state.cat
  const centerX = cat.x + cat.width / 2
  const centerY = cat.y + cat.height / 2
  const squashProgress = cat.squashTimer > 0 ? cat.squashTimer / CAT_SQUASH_TIME : 0
  const stretchByVelocity = Math.max(0, Math.min(1, cat.velocityY / JUMP_FORCE)) * 0.08
  const scaleX = 1 + squashProgress * 0.12 - stretchByVelocity
  const scaleY = 1 - squashProgress * 0.1 + stretchByVelocity

  // 猫跳起瞬间做轻微压扁拉伸，视觉上会更有弹性，但碰撞盒不变。
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.scale(scaleX, scaleY)
  ctx.translate(-centerX, -centerY)

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
  ctx.restore()
}

// 障碍物目前用小木箱表示，后续可以替换成仙人掌、石头等素材。
function drawObstacles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const obstacle of state.obstacles) {
    ctx.fillStyle = '#7b4f2f'
    ctx.beginPath()
    ctx.roundRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 6)
    ctx.fill()

    ctx.strokeStyle = '#5b351f'
    ctx.lineWidth = 3
    ctx.strokeRect(obstacle.x + 6, obstacle.y + 8, obstacle.width - 12, obstacle.height - 16)
  }
}

// 小鱼是加分道具，使用高对比颜色让玩家容易看见。
function drawFish(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const fish of state.fish) {
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
