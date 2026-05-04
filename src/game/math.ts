import type { Rect } from './types'

// 把数值限制在最小值和最大值之间，避免速度或位置变得失控。
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

// 生成一个指定范围内的随机整数，用来随机障碍物高度和小鱼位置。
export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 生成指定范围内的随机小数，适合用来做“不完全固定”的生成间隔。
export function randomFloat(min: number, max: number) {
  return Math.random() * (max - min) + min
}

// 线性插值：每帧让当前值靠近目标值，速度变化会更顺滑。
export function lerp(current: number, target: number, amount: number) {
  return current + (target - current) * amount
}

// 判断两个矩形是否发生碰撞，Canvas 小游戏里最常用的是 AABB 碰撞。
export function isRectColliding(a: Rect, b: Rect) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}
