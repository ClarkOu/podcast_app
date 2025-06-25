# 🎙️ AI播客生成器

> 基于豆包火山方舟大模型的智能播客制作工具，支持单人与双人对话模式

[![Build Status](https://github.com/ClarkOu/podcast_app/actions/workflows/deploy.yml/badge.svg)](https://github.com/ClarkOu/podcast_app/actions)
[![Docker](https://img.shields.io/docker/v/clarkou/podcast_app?label=Docker)](https://hub.docker.com/r/clarkou/podcast_app)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ 功能特性

### 🤖 AI驱动的内容生成
- 基于OpenRouter API的智能脚本生成
- 支持多种大模型（Qwen、GPT等）
- 流式输出，实时查看生成过程

### 🎙️ 双人对话模式
- 支持主持人A/B角色设定
- 双音色TTS合成
- 智能对话脚本生成
- 音频自动拼接

### 🔊 高质量语音合成
- 豆包火山方舟TTS集成
- WebSocket流式音频合成
- 多种音色选择
- 自定义语速和音量

### 🌐 现代化Web界面
- 响应式设计
- 两步式播客制作流程
- 实时进度显示
- 脚本预览与编辑

### 🐳 容器化部署
- Docker一键部署
- CI/CD自动化流程
- 多平台镜像支持

## 🚀 快速开始

### 方式一：Docker部署（推荐）

```bash
# 克隆仓库
git clone https://github.com/ClarkOu/podcast_app.git
cd podcast_app

# 配置环境变量
cp .env.example .env
# 编辑.env文件，填入你的API密钥

# 启动服务
docker-compose up -d

# 访问应用
open http://localhost:3000
```

### 方式二：本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 启动开发服务器
npm start

# 访问应用
open http://localhost:3002
```

## 📝 环境变量配置

```bash
# 豆包火山方舟TTS配置
VOLCENGINE_TTS_APP_ID=你的应用ID
VOLCENGINE_TTS_ACCESS_TOKEN=你的访问令牌
VOLCENGINE_TTS_CLUSTER=volcano_tts
VOLCENGINE_TTS_VOICE_TYPE=zh_female_linjia_mars_bigtts
VOLCENGINE_TTS_SECRET_KEY=你的密钥

# OpenRouter AI配置
OPENROUTER_API_KEY=你的API密钥
OPENROUTER_MODEL=qwen/qwen3-32b:free

# 服务器配置
PORT=3002
```

## 🎯 使用流程

### 单人播客模式
1. 访问播客制作页面
2. 选择"单人播客"模式
3. 输入播客主题
4. 选择音色
5. 点击"生成脚本"
6. 预览并编辑脚本
7. 点击"合成音频"
8. 下载生成的播客

### 双人对话模式
1. 选择"双人互动"模式
2. 设定主持人A/B角色
3. 为每个角色选择音色
4. AI生成对话脚本
5. 预览对话内容
6. 合成双人音频
7. 下载完整播客

## 🛠️ 技术架构

### 后端技术栈
- **Node.js** + **Express** - 服务器框架
- **WebSocket** - 实时通信
- **豆包火山方舟** - TTS语音合成
- **OpenRouter** - AI大模型API

### 前端技术栈
- **原生JavaScript** - 交互逻辑
- **HTML5** + **CSS3** - 用户界面
- **WebSocket** - 实时数据传输

### 部署技术
- **Docker** - 容器化
- **GitHub Actions** - CI/CD
- **Docker Hub** - 镜像仓库

## 📁 项目结构

```
podcast_app/
├── src/                    # 源代码
│   ├── index.js           # 主服务器
│   ├── podcast-generator.js   # 播客生成器
│   ├── volcengine-tts-websocket.js  # TTS客户端
│   └── openrouter-client.js      # AI客户端
├── public/                # 静态文件
│   ├── new-podcast.html   # 播客制作页面
│   └── podcast.html       # 历史记录页面
├── output/                # 生成的音频文件
├── docs/                  # 项目文档
├── Dockerfile             # Docker配置
├── docker-compose.yml     # Docker编排
└── .github/workflows/     # CI/CD配置
```

## 🔧 服务器部署

### 自动化部署

```bash
# 服务器上运行
curl -o deploy.sh https://raw.githubusercontent.com/ClarkOu/podcast_app/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

### 手动部署

```bash
# 安装Docker
curl -fsSL https://get.docker.com | sh

# 克隆项目
git clone https://github.com/ClarkOu/podcast_app.git
cd podcast_app

# 配置环境变量
cp .env.example .env
nano .env

# 启动服务
docker-compose up -d
```

## 📊 API接口

### 播客生成
```http
POST /api/podcast/generate-script
Content-Type: application/json

{
  "topic": "人工智能与未来教育",
  "mode": "dialogue",
  "useAI": true,
  "hostA": "AI专家",
  "hostB": "教育学者"
}
```

### 音频合成
```http
POST /api/podcast/synthesize-audio
Content-Type: application/json

{
  "script": "播客脚本内容",
  "voiceType": "zh_female_linjia_mars_bigtts",
  "mode": "single"
}
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [豆包火山方舟](https://volcengine.com/) - 提供高质量TTS服务
- [OpenRouter](https://openrouter.ai/) - 提供AI模型API服务
- [Docker](https://docker.com/) - 容器化技术支持

## 📞 联系方式

- 作者：ClarkOu
- 项目链接：[https://github.com/ClarkOu/podcast_app](https://github.com/ClarkOu/podcast_app)
- 问题反馈：[Issues](https://github.com/ClarkOu/podcast_app/issues)

---

⭐ 如果这个项目对您有帮助，请给它一个星标！
