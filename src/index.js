require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const VolcengineTTSWebSocketClient = require('./volcengine-tts-websocket');
const PodcastGenerator = require('./podcast-generator');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 确保临时目录存在
const tempDir = path.join(__dirname, '../temp');
fs.ensureDirSync(tempDir);

// 初始化TTS客户端
const ttsClient = new VolcengineTTSWebSocketClient(
  process.env.VOLCENGINE_TTS_APP_ID,
  process.env.VOLCENGINE_TTS_ACCESS_TOKEN,
  process.env.VOLCENGINE_TTS_CLUSTER
);

// 初始化播客生成器
const openRouterConfig = {
  apiKey: process.env.OPENROUTER_API_KEY,
  model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'
};

const podcastGenerator = new PodcastGenerator(ttsClient, openRouterConfig);

// 路由：主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 路由：测试API连接
app.get('/api/test', async (req, res) => {
  try {
    console.log('🔍 开始测试API连接...');
    
    // 检查环境变量
    if (!process.env.VOLCENGINE_TTS_APP_ID || !process.env.VOLCENGINE_TTS_ACCESS_TOKEN || !process.env.VOLCENGINE_TTS_CLUSTER) {
      return res.status(400).json({
        success: false,
        error: '请在.env文件中配置VOLCENGINE_TTS_APP_ID、VOLCENGINE_TTS_ACCESS_TOKEN和VOLCENGINE_TTS_CLUSTER'
      });
    }

    const isConnected = await ttsClient.testConnection();
    
    if (isConnected) {
      res.json({
        success: true,
        message: 'API连接测试成功！',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'API连接测试失败，请检查你的API密钥配置'
      });
    }
  } catch (error) {
    console.error('测试API时发生错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 路由：检查AI配置状态
app.get('/api/ai/status', (req, res) => {
  const hasApiKey = !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your_openrouter_api_key_here';
  
  res.json({
    success: true,
    data: {
      aiEnabled: hasApiKey,
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
      message: hasApiKey ? 'AI功能已启用' : '需要配置OPENROUTER_API_KEY以启用AI功能'
    }
  });
});

// 路由：语音合成
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice, speed, volume, pitch, emotion } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: '请提供要合成的文本内容'
      });
    }

    console.log('🎙️ 开始语音合成:', { text: text.substring(0, 50) + '...', voice });

    const result = await ttsClient.synthesize(text, {
      voiceType: voice || process.env.VOLCENGINE_TTS_VOICE_TYPE || 'zh_female_linjia_mars_bigtts',
      speedRatio: speed || parseFloat(process.env.DEFAULT_SPEED) || 1.0,
      volumeRatio: volume || parseFloat(process.env.DEFAULT_VOLUME) || 1.0,
      pitchRatio: pitch || 1.0,
      encoding: 'mp3'
    });

    if (result.success) {
      // 保存音频文件
      const filename = `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
      const filepath = path.join(tempDir, filename);
      
      await fs.writeFile(filepath, result.audio);
      
      console.log('✅ 语音合成成功，文件保存至:', filename);
      
      // 设置响应头并发送文件
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filepath);
      
      // 5分钟后删除临时文件
      setTimeout(() => {
        fs.remove(filepath).catch(console.error);
      }, 5 * 60 * 1000);
      
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('语音合成时发生错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 路由：获取支持的音色列表
app.get('/api/voices', (req, res) => {
  const voices = ttsClient.getAvailableVoices();
  
  res.json({
    success: true,
    voices
  });
});

// 路由：只生成播客脚本（不合成音频）
app.post('/api/podcast/generate-script', async (req, res) => {
  try {
    const { topic, style, duration, segments, useAI } = req.body;
    
    if (!topic) {
      return res.status(400).json({
        success: false,
        error: '请提供播客主题'
      });
    }

    console.log(`📝 开始生成播客脚本：${topic} (AI: ${useAI ? '启用' : '禁用'})`);

    const options = {
      style: style || 'informative',
      duration: duration || 'medium',
      segments: parseInt(segments) || 3,
      useAI: useAI && process.env.OPENROUTER_API_KEY // 只有配置了API Key才启用AI
    };

    const scriptResult = await podcastGenerator.generateScript(topic, options);
    
    res.json({
      success: true,
      message: '脚本生成成功！',
      data: {
        script: scriptResult.fullScript,
        metadata: scriptResult.metadata,
        segments: scriptResult.scripts.segments
      }
    });
    
  } catch (error) {
    console.error('脚本生成时发生错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 路由：根据脚本生成音频
app.post('/api/podcast/synthesize-audio', async (req, res) => {
  try {
    const { 
      script, 
      topic, 
      voiceType, 
      speedRatio, 
      volumeRatio,
      podcastMode,
      voiceA,
      voiceB 
    } = req.body;
    
    if (!script) {
      return res.status(400).json({
        success: false,
        error: '请提供播客脚本'
      });
    }

    console.log(`🎵 开始语音合成：${topic || '播客'} (${podcastMode === 'dialogue' ? '双人模式' : '单人模式'})`);

    let audioResult;
    
    if (podcastMode === 'dialogue') {
      // 双人对话模式
      audioResult = await synthesizeDialogueAudio(script, {
        voiceA: voiceA || 'zh_female_linjia_mars_bigtts',
        voiceB: voiceB || 'ICL_zh_male_cixingnansang_tob',
        speedRatio: parseFloat(speedRatio) || 1.0,
        volumeRatio: parseFloat(volumeRatio) || 1.0
      });
    } else {
      // 单人模式
      audioResult = await ttsClient.synthesize(script, {
        voiceType: voiceType || voiceA || 'zh_female_linjia_mars_bigtts',
        speedRatio: parseFloat(speedRatio) || 1.0,
        volumeRatio: parseFloat(volumeRatio) || 1.0
      });
    }
    
    if (!audioResult.success) {
      throw new Error('语音合成失败');
    }
    
    // 保存文件
    const sanitizedTopic = topic ? podcastGenerator.sanitizeFilename(topic) : 'podcast_' + Date.now();
    const audioPath = path.join(podcastGenerator.outputDir, `${sanitizedTopic}_audio.mp3`);
    const scriptPath = path.join(podcastGenerator.outputDir, `${sanitizedTopic}_script.txt`);
    
    await fs.writeFile(audioPath, audioResult.audio);
    await fs.writeFile(scriptPath, script, 'utf8');
    
    console.log(`🎵 音频已保存：${audioPath}`);
    
    res.json({
      success: true,
      message: '音频合成成功！',
      data: {
        audioPath: audioPath,
        scriptPath: scriptPath,
        audioSize: audioResult.audio.length,
        topic: topic || '播客',
        podcastMode: podcastMode || 'single',
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('音频合成时发生错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 路由：生成播客
app.post('/api/podcast/generate', async (req, res) => {
  try {
    const { topic, style, duration, segments, voiceType, speedRatio, volumeRatio, useAI } = req.body;
    
    if (!topic) {
      return res.status(400).json({
        success: false,
        error: '请提供播客主题'
      });
    }

    console.log(`🎙️ 开始生成播客：${topic} (AI: ${useAI ? '启用' : '禁用'})`);

    const options = {
      style: style || 'informative',
      duration: duration || 'medium',
      segments: parseInt(segments) || 3,
      voiceType: voiceType || 'zh_female_linjia_mars_bigtts',
      speedRatio: parseFloat(speedRatio) || 1.0,
      volumeRatio: parseFloat(volumeRatio) || 1.0,
      useAI: useAI && process.env.OPENROUTER_API_KEY // 只有配置了API Key才启用AI
    };

    const result = await podcastGenerator.generatePodcast(topic, options);
    
    if (result.success) {
      res.json({
        success: true,
        message: '播客生成成功！',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('播客生成时发生错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 路由：批量生成播客
app.post('/api/podcast/batch', async (req, res) => {
  try {
    const { topics, ...options } = req.body;
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供播客主题列表'
      });
    }

    console.log(`🎙️ 开始批量生成${topics.length}个播客`);

    const results = await podcastGenerator.generateBatchPodcasts(topics, options);
    
    res.json({
      success: true,
      message: `批量生成完成！成功：${results.filter(r => r.success).length}，失败：${results.filter(r => !r.success).length}`,
      data: results
    });
  } catch (error) {
    console.error('批量播客生成时发生错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 路由：获取播客历史
app.get('/api/podcast/history', async (req, res) => {
  try {
    const history = await podcastGenerator.getGenerationHistory();
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('获取播客历史时发生错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 路由：下载播客文件
app.get('/api/podcast/download/:type/:filename', (req, res) => {
  try {
    const { type, filename } = req.params;
    let filePath;
    let contentType;
    
    switch (type) {
      case 'audio':
        filePath = path.join(__dirname, '../output', filename);
        contentType = 'audio/mpeg';
        break;
      case 'script':
        filePath = path.join(__dirname, '../output', filename);
        contentType = 'text/plain; charset=utf-8';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '不支持的文件类型'
        });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('下载文件时发生错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 路由：下载文件
app.get('/download/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    const filePath = path.join(podcastGenerator.outputDir, filename);
    
    // 检查文件是否存在
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }
    
    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (type === 'audio') {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (type === 'script') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }
    
    // 发送文件
    res.sendFile(filePath);
  } catch (error) {
    console.error('下载文件错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 路由：流式生成播客脚本
app.post('/api/podcast/generate-script-stream', async (req, res) => {
  try {
    const { topic, style, duration, segments, useAI, podcastMode, hostARole, hostBRole } = req.body;
    
    if (!topic) {
      return res.status(400).json({
        success: false,
        error: '请提供播客主题'
      });
    }

    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    console.log(`📝 开始流式生成播客脚本：${topic} (AI: ${useAI ? '启用' : '禁用'}, 模式: ${podcastMode || 'single'})`);

    const options = {
      style: style || 'informative',
      duration: duration || 'medium',
      segments: parseInt(segments) || 3,
      useAI: useAI && process.env.OPENROUTER_API_KEY,
      podcastMode: podcastMode || 'single',
      hostARole: hostARole || '主持人',
      hostBRole: hostBRole || '嘉宾',
      onChunk: (chunk) => {
        // 发送流式数据块
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }
    };

    const scriptResult = await podcastGenerator.generateScript(topic, options);
    
    // 发送完成信号
    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      data: {
        script: scriptResult.fullScript,
        metadata: scriptResult.metadata,
        segments: scriptResult.scripts.segments
      }
    })}\n\n`);
    
    res.end();
    
  } catch (error) {
    console.error('流式脚本生成时发生错误:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: error.message 
    })}\n\n`);
    res.end();
  }
});

// 双人对话音频合成函数
async function synthesizeDialogueAudio(script, options) {
  try {
    const { voiceA, voiceB, speedRatio, volumeRatio } = options;
    
    // 解析双人对话脚本
    const segments = parseDialogueScript(script);
    if (segments.length === 0) {
      throw new Error('无法解析双人对话脚本');
    }
    
    console.log(`🎭 解析到 ${segments.length} 个对话段落`);
    
    const audioSegments = [];
    
    // 为每个对话段落生成音频
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const voiceType = segment.speaker === 'hostA' ? voiceA : voiceB;
      
      console.log(`🎤 合成第 ${i + 1}/${segments.length} 段 (${segment.speaker === 'hostA' ? '主持人A' : '主持人B'}): ${segment.content.substring(0, 30)}...`);
      
      const audioResult = await ttsClient.synthesize(segment.content, {
        voiceType,
        speedRatio,
        volumeRatio
      });
      
      if (!audioResult.success) {
        throw new Error(`第 ${i + 1} 段音频合成失败`);
      }
      
      audioSegments.push(audioResult.audio);
    }
    
    // 合并音频段落（简单拼接）
    const totalLength = audioSegments.reduce((sum, buffer) => sum + buffer.length, 0);
    const mergedAudio = Buffer.concat(audioSegments, totalLength);
    
    console.log(`🎵 双人对话音频合成完成，总长度: ${Math.round(totalLength / 1024)}KB`);
    
    return {
      success: true,
      audio: mergedAudio,
      segments: segments.length
    };
    
  } catch (error) {
    console.error('双人对话音频合成失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 解析双人对话脚本
function parseDialogueScript(script) {
  const segments = [];
  const lines = script.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    if (trimmedLine.startsWith('主持人A:') || trimmedLine.startsWith('主持人A：')) {
      const content = trimmedLine.replace(/^主持人A[：:]\s*/, '').trim();
      if (content) {
        segments.push({
          speaker: 'hostA',
          content: content
        });
      }
    } else if (trimmedLine.startsWith('主持人B:') || trimmedLine.startsWith('主持人B：')) {
      const content = trimmedLine.replace(/^主持人B[：:]\s*/, '').trim();
      if (content) {
        segments.push({
          speaker: 'hostB',
          content: content
        });
      }
    }
  }
  
  return segments;
}

// 启动服务器
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🎙️ 播客生成服务器已启动`);
    console.log(`🌐 服务地址: http://localhost:${PORT}`);
    console.log(`📱 API文档: http://localhost:${PORT}/api/test`);
    console.log(`🎨 前端页面: http://localhost:${PORT}/new-podcast.html`);
  });
}

module.exports = app;
