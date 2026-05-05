# Cat Hop Rush

一款竖屏 H5 跑酷小游戏：猫 meme 向前奔跑，收集橘子，躲开酸柠檬路障，把甜甜的心意送到 duro 面前。

## 当前功能

- 480x800 竖屏 Canvas 游戏画面，React 负责 HUD、开始页、暂停页、结算页和 CG 弹窗。
- 点击、触摸或按空格跳跃；现在支持一次空中二段跳。
- 游戏中可以暂停，再点击继续会从暂停处恢复。
- 结算页点击“再玩一次”会回到起点待命，再点“出发收橘子”才开始跑。
- 起点页显示 `CG记录 x/4`，已解锁时可点击查看具体 CG 内容。
- 橘子累计数量会解锁 4 段 CG 记录。
- 障碍物生成距离已放宽，连续双障碍更少、更晚出现，并保留更大的内部间距。
- 全程背景音乐使用 Web Audio 生成轻快循环旋律，音效和音乐都受静音按钮控制。
- 支持低性能模式，降低 DPR 和粒子数量。

## 操作方式

- `点击/触摸画面`：跳跃。
- `空格`：跳跃；在暂停状态下按空格继续。
- `暂停`：游戏中暂停或继续。
- `静音/开声`：切换背景音乐和音效。
- `省电/画质`：切换低性能模式。
- `CG记录 x/4`：在起点页查看已解锁的最新 CG。

## CG 解锁

CG 由累计橘子数解锁，数据保存在 `localStorage` 中。

- `1` 颗橘子：第一颗橘子。
- `100` 颗橘子：一百颗橘子。
- `520` 颗橘子：五百二十颗橘子。
- `1314` 颗橘子：一千三百一十四颗橘子。

## 核心实现

- 游戏循环：`src/hooks/useGameLoop.ts`
- 状态机与物理：`src/game/engine.ts`
- 参数配置：`src/game/constants.ts`
- Canvas 绘制：`src/game/draw.ts`
- 音效与背景音乐：`src/game/audio.ts`
- CG 数据：`src/game/story.ts`
- 开始页：`src/components/StartPanel.tsx`
- 结算页：`src/components/GameOverPanel.tsx`

## 开发

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

类型检查：

```bash
npx tsc -b
```

构建：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

## 验证记录

- `npx tsc -b` 已通过。
- 当前环境直接执行 `npm run build` 会被 PowerShell 执行策略和沙箱里的 Vite/Tailwind 原生依赖加载限制拦住；在本机正常权限终端里运行 `npm.cmd run build` 即可做完整打包验证。
