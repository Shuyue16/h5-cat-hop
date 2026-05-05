# Cat Hop Rush

一款 React + TypeScript + Vite + Canvas 实现的竖屏 H5 跑酷小游戏：猫 meme 向前奔跑，收集橘子，躲开酸柠檬路障，把甜甜的心意送到 duro 面前。

## 当前功能

- 480x800 竖屏 Canvas 游戏画面，React 负责 HUD、开始页、暂停页、结算页和 CG 弹窗。
- 点击、触摸或按空格跳跃；离地后还能额外进行 1 次二段跳。
- 游戏中可以暂停，再点击继续会从暂停处恢复。
- 结算页点击“再玩一次”会回到起点待命，再点“出发收橘子”才开始跑。
- 起点页显示 `CG记录 x/4`，已解锁时可点击查看具体 CG 内容。
- 橘子累计数量会解锁 4 段 CG 记录。
- 背景音乐使用 `/assets/audio/bgm.mp3`，通过 HTMLAudioElement 循环播放，默认音量 0.35。
- jump、fish、hit 短音效继续使用原有 Web Audio API 逻辑。
- 支持低性能模式，降低 DPR 和粒子数量。

## 操作方式

- `点击/触摸画面`：跳跃；空中最多再触发 1 次二段跳。
- `空格`：跳跃；在暂停状态下按空格继续。
- `暂停`：游戏中暂停或继续。
- `静音/声音`：切换背景音乐和短音效静音状态，状态保存到 localStorage。
- `省电/流畅`：切换低性能模式。
- `CG记录 x/4`：在起点页查看已解锁的最新 CG。

## 音频系统

- BGM 文件位置：`public/assets/audio/bgm.mp3`
- BGM 引用路径：`/assets/audio/bgm.mp3`
- BGM 初始化：`src/game/audio.ts` 的 `initBgm()`
- BGM 播放：开始游戏或游戏中第一次触摸时调用 `playBgm()`
- BGM 停止：进入结算状态或回到起点时调用 `stopBgm()`
- 静音持久化：复用 `STORAGE_AUDIO_MUTED_KEY`

## 手感参数

主要参数集中在 `src/game/constants.ts`：

- 前 12 秒为更友好的上手期。
- 速度随时间和分数平滑增长，吃鱼得分降低，避免速度突然暴涨。
- 障碍高度和生成间距更保守，最小安全间距更大。
- 二段跳使用 `DOUBLE_JUMP_FORCE`，落地后恢复 `AIR_JUMP_COUNT`。
- 撞击震屏和慢动作反馈已调轻。

## 核心文件

- 游戏循环：`src/hooks/useGameLoop.ts`
- 状态机与物理：`src/game/engine.ts`
- 参数配置：`src/game/constants.ts`
- Canvas 绘制：`src/game/draw.ts`
- 音效与 BGM：`src/game/audio.ts`
- CG 数据：`src/game/story.ts`
- 开始页：`src/components/StartPanel.tsx`
- 结算页：`src/components/GameOverPanel.tsx`

## 开发

```bash
npm install
npm run dev
npm run build
```
