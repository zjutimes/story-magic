# Story Magic - AI 儿童绘本生成器

## 项目概述

Story Magic 是一款基于"英雄之旅"框架的 AI 儿童绘本生成器，能够根据用户输入的主题，自动生成完整的12页绘本故事，包含配套插图描述词。

## 技术栈

- **前端**: Vite + TypeScript + Tailwind CSS
- **后端**: Express + TypeScript
- **AI 能力**: coze-coding-dev-sdk (LLM, 图片生成, 视频生成, TTS)
- **认证**: Supabase Auth

## 目录结构

```
├── server/                 # Express 后端
│   ├── server.ts          # 服务入口
│   ├── vite.ts            # Vite 中间件
│   └── routes/index.ts    # API 路由
├── src/                    # 前端源码
├── scripts/                # 构建脚本
├── dist/                   # 构建产物
└── dist-server/            # 后端构建产物
```

## 启动命令

```bash
# 开发环境
pnpm dev

# 生产环境
pnpm build && pnpm start
```

## API 接口

| 接口 | 方法 | 功能 |
|-----|------|------|
| `/api/story/generate` | POST | 生成英雄之旅故事 |
| `/api/story/generate-illustrations` | POST | 生成故事插图 |
| `/api/story/generate-video` | POST | 生成视频 |
| `/api/story/text-to-speech` | POST | 文字转语音 |
| `/api/story/generate-story-videos` | POST | 批量生成故事视频 |
| `/api/story/generate-story-audio` | POST | 批量生成故事语音 |

### 生成故事示例

```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"theme": "小兔子去上学", "language": "zh"}' \
  http://localhost:5000/api/story/generate
```

## 英雄之旅12阶段

1. 平凡世界
2. 冒险召唤
3. 拒绝召唤
4. 遇见导师
5. 跨越门槛
6. 考验与盟友
7. 进入洞穴
8. 严峻考验
9. 获得奖赏
10. 归来之路
11. 复活
12. 带回万能药

## 开发说明

### 依赖安装
```bash
pnpm install
```

### 类型检查
```bash
pnpm ts-check
```

### 代码规范
```bash
pnpm lint
```
