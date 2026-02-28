# 🎙️ Podcast Generator

**English** | [简体中文](./README.zh-CN.md)

An AI-powered podcast generation service built on Node.js. It uses [OpenRouter](https://openrouter.ai/) to generate scripts and [Volcengine Seed-TTS](https://www.volcengine.com/docs/6561/1719100) (V3 API) for high-quality speech synthesis.

## Features

- **AI Script Generation** — Automatically write podcast scripts via OpenRouter (Qwen3-32B by default)
- **Streaming Generation** — Real-time script streaming with Server-Sent Events
- **Streaming Synthesis Progress** — Real-time dialogue audio synthesis progress via SSE
- **Single & Dialogue Mode** — Solo host or two-host conversation formats
- **11 Voice Options** — Mandarin, Cantonese, and English voices
- **Batch Generation** — Generate multiple podcasts in one request
- **History & Playback** — Built-in generation history with inline audio preview
- **Web UI** — Built-in frontend for easy use without any API calls

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + Express |
| TTS | Volcengine Seed-TTS V3 (WebSocket) |
| AI | OpenRouter API / Qwen3-32B |
| SDK | openai ^5.7.0, ws ^8.18.2 |

## Prerequisites

- Node.js 18+
- A [Volcengine](https://www.volcengine.com/) account with TTS enabled
- An [OpenRouter](https://openrouter.ai/) API key (optional, for AI script generation)

## Getting Started

**1. Clone and install**

```bash
git clone https://github.com/ClarkOu/podcast_app.git
cd podcast_app
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
VOLCENGINE_TTS_APP_ID=your_app_id
VOLCENGINE_TTS_ACCESS_TOKEN=your_access_token
VOLCENGINE_TTS_RESOURCE_ID=seed-tts-1.0

OPENROUTER_API_KEY=your_openrouter_api_key   # optional
OPENROUTER_MODEL=qwen/qwen3-32b:free

PORT=3000
```

**3. Run**

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

Open `http://localhost:3000` in your browser.

## API Reference

### TTS

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/tts` | Synthesize text to speech |
| `GET` | `/api/voices` | List available voices |

**POST `/api/tts`**

```json
{
  "text": "Hello, welcome to my podcast.",
  "voice": "zh_female_linjia_mars_bigtts",
  "speed": 1.0,
  "volume": 1.0
}
```

Returns an MP3 audio file.

---

### Podcast

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/podcast/generate` | Generate script + audio in one step |
| `POST` | `/api/podcast/generate-script` | Generate script only |
| `POST` | `/api/podcast/generate-script-stream` | Stream script generation (SSE) |
| `POST` | `/api/podcast/synthesize-audio` | Synthesize audio from a given script |
| `POST` | `/api/podcast/synthesize-audio-stream` | Stream dialogue synthesis progress (SSE) |
| `POST` | `/api/podcast/batch` | Batch generate multiple podcasts |
| `GET`  | `/api/podcast/history` | Get generation history |
| `GET`  | `/api/podcast/download/:type/:filename` | Download audio or script file (API path) |
| `GET`  | `/download/:type/:filename` | Download audio or script file (web/UI path) |

**POST `/api/podcast/generate`**

```json
{
  "topic": "The Future of AI",
  "style": "informative",
  "duration": "medium",
  "segments": 3,
  "voiceType": "zh_female_linjia_mars_bigtts",
  "speedRatio": 1.0,
  "volumeRatio": 1.0,
  "useAI": true
}
```

**POST `/api/podcast/synthesize-audio` — Dialogue Mode**

```json
{
  "script": "主持人A: ...\n主持人B: ...",
  "topic": "Tech Weekly",
  "podcastMode": "dialogue",
  "voiceA": "zh_female_linjia_mars_bigtts",
  "voiceB": "ICL_zh_male_cixingnansang_tob"
}
```

---

### Utilities

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/test` | Test TTS connection |
| `GET` | `/api/ai/status` | Check AI configuration status |

## Available Voices

| ID | Name | Gender | Language |
|----|------|--------|----------|
| `zh_female_linjia_mars_bigtts` | 林佳 | Female | zh-CN |
| `zh_female_shuangkuaisisi_moon_bigtts` | 爽快思思 | Female | zh-CN |
| `zh_female_xiaoyue_mars_bigtts` | 晓悦 | Female | zh-CN |
| `zh_female_qingxin_mars_bigtts` | 清新小妹 | Female | zh-CN |
| `zh_female_cancan_mars_bigtts` | 灿灿 | Female | zh-CN |
| `zh_male_zhubo_mars_bigtts` | 专业主播 | Male | zh-CN |
| `zh_male_sunwukong_mars_bigtts` | 孙悟空 | Male | zh-CN |
| `ICL_zh_male_cixingnansang_tob` | 磁性男声 | Male | zh-CN |
| `zh_female_yueyue_mars_bigtts` | 粤语悦悦 | Female | zh-YUE |
| `en_female_sarah_mars_bigtts` | Sarah | Female | en-US |
| `en_male_adam_mars_bigtts` | Adam | Male | en-US |

## Project Structure

```
podcast_app/
├── src/
│   ├── index.js                    # Express server & API routes
│   ├── podcast-generator.js        # Podcast orchestration logic
│   ├── openrouter-client.js        # OpenRouter AI client
│   └── volcengine-tts-websocket.js # Volcengine Seed-TTS V3 WebSocket client
├── public/
│   ├── index.html                  # Main web UI
│   └── new-podcast.html            # Podcast creation UI
├── output/                         # Generated audio & scripts
├── temp/                           # Temporary TTS files
├── .env.example
└── package.json
```

## License

MIT
