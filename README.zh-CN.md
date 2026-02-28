# 🎙️ 播客生成器

[English](./README.md) | **简体中文**

基于 Node.js 的 AI 驱动播客生成服务。使用 [OpenRouter](https://openrouter.ai/) 生成脚本，使用[火山引擎 Seed-TTS](https://www.volcengine.com/docs/6561/1719100)（V3 API）进行高质量语音合成。

## 功能特性

- **AI 脚本生成** — 通过 OpenRouter（默认使用 Qwen3-32B）自动撰写播客脚本
- **流式生成** — 基于 SSE 的实时脚本流式输出
- **流式合成进度** — 双人模式下基于 SSE 的实时音频合成进度
- **单人 & 双人模式** — 支持单主持人或双主持人对话两种格式
- **11 种音色** — 普通话、粤语及英文音色
- **批量生成** — 一次请求生成多期播客
- **历史记录与回放** — 内置生成历史列表，支持页面内音频试听
- **Web 界面** — 内置前端，无需手动调用 API

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Node.js + Express |
| TTS | 火山引擎 Seed-TTS V3（WebSocket） |
| AI | OpenRouter API / Qwen3-32B |
| SDK | openai ^5.7.0, ws ^8.18.2 |

## 前置条件

- Node.js 18+
- 已开通 TTS 服务的[火山引擎](https://www.volcengine.com/)账号
- [OpenRouter](https://openrouter.ai/) API Key（可选，用于 AI 脚本生成）

## 快速开始

**1. 克隆并安装依赖**

```bash
git clone https://github.com/ClarkOu/podcast_app.git
cd podcast_app
npm install
```

**2. 配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env`，填入你的凭证：

```env
VOLCENGINE_TTS_APP_ID=你的App_ID
VOLCENGINE_TTS_ACCESS_TOKEN=你的Access_Token
VOLCENGINE_TTS_RESOURCE_ID=seed-tts-1.0

OPENROUTER_API_KEY=你的OpenRouter_API_Key   # 可选
OPENROUTER_MODEL=qwen/qwen3-32b:free

PORT=3000
```

**3. 启动**

```bash
# 生产模式
npm start

# 开发模式（自动重载）
npm run dev
```

在浏览器中打开 `http://localhost:3000`。

## API 参考

### TTS

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/tts` | 文本转语音 |
| `GET` | `/api/voices` | 获取可用音色列表 |

**POST `/api/tts`**

```json
{
  "text": "欢迎收听本期播客。",
  "voice": "zh_female_linjia_mars_bigtts",
  "speed": 1.0,
  "volume": 1.0
}
```

返回 MP3 音频文件。

---

### 播客

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/podcast/generate` | 一步生成脚本 + 音频 |
| `POST` | `/api/podcast/generate-script` | 仅生成脚本 |
| `POST` | `/api/podcast/generate-script-stream` | 流式生成脚本（SSE） |
| `POST` | `/api/podcast/synthesize-audio` | 根据脚本合成音频 |
| `POST` | `/api/podcast/synthesize-audio-stream` | 流式返回双人合成进度（SSE） |
| `POST` | `/api/podcast/batch` | 批量生成多期播客 |
| `GET`  | `/api/podcast/history` | 获取生成历史 |
| `GET`  | `/api/podcast/download/:type/:filename` | 下载音频或脚本文件（API路径） |
| `GET`  | `/download/:type/:filename` | 下载音频或脚本文件（Web页面路径） |

**POST `/api/podcast/generate`**

```json
{
  "topic": "人工智能的未来",
  "style": "informative",
  "duration": "medium",
  "segments": 3,
  "voiceType": "zh_female_linjia_mars_bigtts",
  "speedRatio": 1.0,
  "volumeRatio": 1.0,
  "useAI": true
}
```

`style` 可选值：`informative`（信息性）、`conversational`（对话式）、`educational`（教育性）  
`duration` 可选值：`short`（短）、`medium`（中）、`long`（长）

**POST `/api/podcast/synthesize-audio` — 双人模式**

```json
{
  "script": "主持人A: ...\n主持人B: ...",
  "topic": "科技周刊",
  "podcastMode": "dialogue",
  "voiceA": "zh_female_linjia_mars_bigtts",
  "voiceB": "ICL_zh_male_cixingnansang_tob"
}
```

---

### 工具

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/test` | 测试 TTS 连接 |
| `GET` | `/api/ai/status` | 检查 AI 配置状态 |

## 可用音色

| ID | 名称 | 性别 | 语言 |
|----|------|------|------|
| `zh_female_linjia_mars_bigtts` | 林佳 | 女 | 普通话 |
| `zh_female_shuangkuaisisi_moon_bigtts` | 爽快思思 | 女 | 普通话 |
| `zh_female_xiaoyue_mars_bigtts` | 晓悦 | 女 | 普通话 |
| `zh_female_qingxin_mars_bigtts` | 清新小妹 | 女 | 普通话 |
| `zh_female_cancan_mars_bigtts` | 灿灿 | 女 | 普通话 |
| `zh_male_zhubo_mars_bigtts` | 专业主播 | 男 | 普通话 |
| `zh_male_sunwukong_mars_bigtts` | 孙悟空 | 男 | 普通话 |
| `ICL_zh_male_cixingnansang_tob` | 磁性男声 | 男 | 普通话 |
| `zh_female_yueyue_mars_bigtts` | 粤语悦悦 | 女 | 粤语 |
| `en_female_sarah_mars_bigtts` | Sarah | 女 | 英语 |
| `en_male_adam_mars_bigtts` | Adam | 男 | 英语 |

## 项目结构

```
podcast_app/
├── src/
│   ├── index.js                    # Express 服务器 & API 路由
│   ├── podcast-generator.js        # 播客编排逻辑
│   ├── openrouter-client.js        # OpenRouter AI 客户端
│   └── volcengine-tts-websocket.js # 火山引擎 Seed-TTS V3 WebSocket 客户端
├── public/
│   ├── index.html                  # 主 Web 界面
│   └── new-podcast.html            # 播客创建界面
├── output/                         # 生成的音频与脚本
├── temp/                           # TTS 临时文件
├── .env.example
└── package.json
```

## 许可证

MIT
