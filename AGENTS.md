# 项目上下文

## 技术栈

- **核心**: Vite 7, TypeScript, Express
- **UI**: Tailwind CSS

## 目录结构

```
├── scripts/            # 构建与启动脚本
│   ├── build.sh        # 构建脚本
│   ├── dev.sh          # 开发环境启动脚本
│   ├── prepare.sh      # 预处理脚本
│   └── start.sh        # 生产环境启动脚本
├── server/             # 服务端逻辑
│   ├── routes/         # API 路由
│   ├── server.ts       # Express 服务入口
│   └── vite.ts         # Vite 中间件集成
├── src/                # 前端源码
│   ├── index.css       # 全局样式
│   ├── index.ts        # 客户端入口
│   └── main.ts         # 主逻辑
├── index.html          # 入口 HTML
├── package.json        # 项目依赖管理
├── tsconfig.json       # TypeScript 配置
└── vite.config.ts      # Vite 配置
```

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

- 使用 Tailwind CSS 进行样式开发

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、Express `req`/`res`、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

## AI 积木能力

本项目使用 `coze-coding-dev-sdk` 提供 AI 能力，集成在服务端（Express）。

### 可用积木

| 积木类型 | 能力 | 使用方式 |
|---------|------|---------|
| **大脑积木** | LLM（对话/生成） | `LLMClient` from `coze-coding-dev-sdk` |
| **大脑积木** | 图片生成 | `ImageGenerationClient` from `coze-coding-dev-sdk` |
| **大脑积木** | 视频生成 | `VideoGenerationClient` from `coze-coding-dev-sdk` |
| **大脑积木** | 语音合成 (TTS) | `TTSClient` from `coze-coding-dev-sdk` |

## 用户认证

本项目使用 Supabase Auth 进行用户认证。

### 认证 API

| 接口 | 方法 | 功能 |
|-----|------|------|
| `/api/story/auth/signup` | POST | 用户注册 |
| `/api/story/auth/login` | POST | 用户登录 |
| `/api/story/auth/user` | GET | 获取当前用户信息 |
| `/api/story/auth/logout` | POST | 用户登出 |

### 认证使用示例

```typescript
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 登录
const { data, error } = await client.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// 获取用户信息
const { data: { user } } = await client.auth.getUser();

// 登出
await client.auth.signOut();
```

### LLM 使用示例

```typescript
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 初始化
const config = new Config();
const client = new LLMClient(config);

// 调用
const messages = [{ role: 'user' as const, content: '你的问题' }];
const response = await client.invoke(messages, { 
  model: 'doubao-seed-1-6-251015',
  temperature: 0.8 
});
```

### 图片生成使用示例

```typescript
import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';

// 初始化
const config = new Config();
const client = new ImageGenerationClient(config);

// 生成图片
const response = await client.generate({
  prompt: '儿童绘本风格的可爱插图',
  size: '2K',
});

const helper = client.getResponseHelper(response);
if (helper.success) {
  const imageUrl = helper.imageUrls[0];
}
```

### 视频生成使用示例

```typescript
import { VideoGenerationClient, Config } from 'coze-coding-dev-sdk';

// 初始化
const config = new Config();
const client = new VideoGenerationClient(config);

// 构建内容：图片作为首帧 + 文字描述动画效果
const contentItems = [
  {
    type: 'image_url' as const,
    image_url: { url: imageUrl },
    role: 'first_frame' as const,
  },
  {
    type: 'text' as const,
    text: 'A gentle animation. Soft camera movement, warm lighting transitions.',
  },
];

// 生成视频
const response = await client.videoGeneration(contentItems, {
  model: 'doubao-seedance-1-5-pro-251215',
  duration: 5,
  resolution: '720p',
  ratio: '4:3',
  returnLastFrame: true, // 返回尾帧用于下一段视频
  generateAudio: true,   // 生成音效
});

if (response.videoUrl) {
  const videoUrl = response.videoUrl;
  const lastFrameUrl = response.lastFrameUrl; // 尾帧
}
```

### TTS 语音合成使用示例

```typescript
import { TTSClient, Config } from 'coze-coding-dev-sdk';

// 初始化
const config = new Config();
const client = new TTSClient(config);

// 文字转语音
const response = await client.synthesize({
  uid: `story_${Date.now()}`,
  text: '故事文字内容',
  speaker: 'zh_female_xueayi_saturn_bigtts', // 儿童有声书风格
  audioFormat: 'mp3',
  sampleRate: 24000,
});

if (response.audioUri) {
  const audioUrl = response.audioUri;
}
```

## API 接口

| 接口 | 方法 | 功能 |
|-----|------|------|
| `/api/story/generate` | POST | 生成儿童故事内容（支持中英文） |
| `/api/story/generate-illustrations` | POST | 为故事生成配套插图 |
| `/api/story/generate-image` | POST | 根据故事文字生成单张插图 |
| `/api/story/generate-batch-images` | POST | 批量生成多张插图 |
| `/api/story/generate-video` | POST | 根据插图生成视频 |
| `/api/story/generate-story-videos` | POST | 为故事每页生成视频 |
| `/api/story/text-to-speech` | POST | 文字转语音（TTS） |
| `/api/story/generate-story-audio` | POST | 为故事每页生成语音 |

### 接口详细说明

#### 1. 生成故事内容
- **端点**: `POST /api/story/generate`
- **参数**:
  - `theme` (string, 必填): 故事主题
  - `language` (string, 可选): 语言，"zh"（中文，默认）或 "en"（英文）
- **示例**:
```bash
# 中文故事
curl -X POST -H 'Content-Type: application/json' \
  -d '{"theme": "小兔子去上学", "language": "zh"}' \
  http://localhost:5000/api/story/generate

# 英文故事
curl -X POST -H 'Content-Type: application/json' \
  -d '{"theme": "Little Rabbit Goes to School", "language": "en"}' \
  http://localhost:5000/api/story/generate
```

#### 2. 生成视频
- **端点**: `POST /api/story/generate-video`
- **参数**:
  - `imageUrl` (string, 必填): 插图URL
- **示例**:
```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"imageUrl": "https://example.com/illustration.jpg"}' \
  http://localhost:5000/api/story/generate-video
```

#### 3. 文字转语音
- **端点**: `POST /api/story/text-to-speech`
- **参数**:
  - `text` (string, 必填): 要转换的文字
  - `language` (string, 可选): 语言，"zh" 或 "en"
- **示例**:
```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"text": "从前有一只小兔子", "language": "zh"}' \
  http://localhost:5000/api/story/text-to-speech
```
