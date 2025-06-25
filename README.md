# 火山方舟语音合成播客生成器

基于豆包火山方舟TTS的智能播客生成平台，支持AI内容生成和语音合成。

## 功能特性

- 🎙️ **智能播客生成**：支持AI和模板两种内容生成方式
- 🤖 **AI内容生成**：集成OpenRouter大模型，生成高质量播客脚本
- 🎵 **高质量语音合成**：基于火山方舟TTS引擎
- 🎨 **多种播客风格**：信息性、对话式、教育性
- ⚡ **实时流式处理**：WebSocket协议，快速响应
- 📱 **现代Web界面**：直观易用的播客生成界面
- 🔄 **批量生成**：支持多主题批量处理
- � **历史记录**：生成历史查看和下载
- �🔧 **灵活配置**：支持多种音色、语速、音量调节

## 内容生成方式

### 🤖 AI生成（推荐）
- 使用OpenRouter API调用大模型
- 支持Llama 3.1、GPT、Claude等知名模型
- 根据主题智能生成相关、准确的内容
- 自然流畅，适合口播

### 📝 模板生成（默认）
- 内置JavaScript模板
- 无需额外配置，开箱即用
- 结构化内容，生成稳定

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

### 3. 启动服务

```bash
npm start
```

服务将在 http://localhost:3002 启动。

### 4. 访问应用

- **主页**: http://localhost:3002 - TTS测试界面
- **播客生成器**: http://localhost:3002/podcast.html - 播客生成界面

### 5. 测试功能

```bash
# 测试TTS基础功能
npm run test

# 测试AI播客生成功能
node src/test-ai.js
```

## 使用指南

### Web界面使用

1. **播客生成**
   - 访问播客生成器页面
   - 输入播客主题
   - 选择是否使用AI生成（需配置API Key）
   - 调整播客风格、时长、段落数等参数
   - 设置语音参数（音色、语速、音量）
   - 点击生成播客

2. **批量生成**
   - 切换到"批量生成"标签
   - 添加多个播客主题
   - 统一设置参数
   - 批量生成所有播客

3. **历史记录**
   - 查看已生成的播客
   - 下载音频和脚本文件
   - 管理生成历史

### API接口

#### 检查AI配置状态
```bash
GET /api/ai/status
```

#### 生成播客
```bash
POST /api/podcast/generate
```

**请求参数：**
```json
{
  "topic": "人工智能的发展趋势",
  "style": "conversational",        // informative, conversational, educational
  "duration": "medium",             // short, medium, long
  "segments": 3,                    // 内容段落数
  "useAI": true,                    // 是否使用AI生成
  "voiceType": "zh_female_linjia_mars_bigtts",
  "speedRatio": 1.0,
  "volumeRatio": 1.0
}
```

#### 批量生成播客
```bash
POST /api/podcast/batch
```

#### TTS语音合成
```bash
POST /api/tts
```
{
  "text": "要合成的文本内容",
  "voice": "BV700_streaming",
  "speed": 1.0,
  "volume": 1.0
}
```

**响应：**
返回生成的音频文件

## 支持的音色

- `BV700_streaming`: 通用女声
- `BV701_streaming`: 通用男声  
- `BV009_streaming`: 情感女声
- `BV102_streaming`: 温柔女声
- `BV103_streaming`: 成熟男声
- `BV104_streaming`: 温暖男声

## 技术栈

- Node.js + Express
- WebSocket连接
- 火山方舟TTS WebSocket API
- HTML/CSS/JavaScript

## 注意事项

1. 请确保你的火山方舟账户有足够的调用额度
2. API密钥请妥善保管，不要提交到代码仓库
3. 生成的音频文件会临时保存在 `temp` 目录下
