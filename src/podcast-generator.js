const VolcengineTTSWebSocketClient = require('./volcengine-tts-websocket');
const OpenRouterClient = require('./openrouter-client');
const fs = require('fs-extra');
const path = require('path');

class PodcastGenerator {
  constructor(ttsClient, openRouterConfig = null) {
    this.ttsClient = ttsClient;
    this.outputDir = path.join(__dirname, '../output');
    fs.ensureDirSync(this.outputDir);
    
    // 初始化OpenRouter客户端
    if (openRouterConfig && openRouterConfig.apiKey) {
      this.openRouterClient = new OpenRouterClient(
        openRouterConfig.apiKey,
        openRouterConfig.model
      );
      this.useAI = true;
    } else {
      this.openRouterClient = null;
      this.useAI = false;
    }
  }

  // 生成播客脚本
  async generateScript(topic, options = {}) {
    const {
      style = 'informative', // informative, conversational, educational
      duration = 'medium', // short (2-3min), medium (5-8min), long (10-15min)
      segments = 3,
      includeIntro = true,
      includeOutro = true,
      useAI = this.useAI, // 可以通过参数覆盖默认设置
      onChunk = null, // 流式输出回调函数
      podcastMode = 'single', // 'single' 或 'dialogue'
      hostARole = 'expert', // 主持人A角色
      hostBRole = 'interviewer' // 主持人B角色
    } = options;

    let scripts;

    try {
      if (useAI && this.openRouterClient && onChunk) {
        console.log(`使用AI流式生成${podcastMode === 'dialogue' ? '双人对话' : '单人'}播客脚本: ${topic}`);
        
        let aiResult;
        if (podcastMode === 'dialogue') {
          // 双人对话模式
          aiResult = await this.openRouterClient.generateDialoguePodcastScriptStream(topic, {
            style,
            duration,
            segments,
            hostARole,
            hostBRole
          }, onChunk);
        } else {
          // 单人模式
          aiResult = await this.openRouterClient.generatePodcastScriptStream(topic, {
            style,
            duration,
            segments
          }, onChunk);
        }
        
        scripts = {
          intro: includeIntro ? aiResult.intro : '',
          segments: aiResult.segments,
          outro: includeOutro ? aiResult.outro : ''
        };
        
        // 添加AI生成标记
        scripts.metadata = aiResult.metadata;
        scripts.podcastMode = podcastMode;
      } else if (useAI && this.openRouterClient) {
        console.log(`使用AI生成${podcastMode === 'dialogue' ? '双人对话' : '单人'}播客脚本: ${topic}`);
        
        let aiResult;
        if (podcastMode === 'dialogue') {
          // 双人对话模式
          aiResult = await this.openRouterClient.generateDialoguePodcastScript(topic, {
            style,
            duration,
            segments,
            hostARole,
            hostBRole
          });
        } else {
          // 单人模式
          aiResult = await this.openRouterClient.generatePodcastScript(topic, {
            style,
            duration,
            segments
          });
        }
        
        scripts = {
          intro: includeIntro ? aiResult.intro : '',
          segments: aiResult.segments,
          outro: includeOutro ? aiResult.outro : ''
        };
        
        // 添加AI生成标记
        scripts.metadata = aiResult.metadata;
        scripts.podcastMode = podcastMode;
      } else {
        console.log(`使用模板生成播客脚本: ${topic}`);
        scripts = {
          intro: includeIntro ? this.generateIntro(topic) : '',
          segments: this.generateSegments(topic, segments, style),
          outro: includeOutro ? this.generateOutro(topic) : ''
        };
      }
    } catch (error) {
      console.warn('AI生成失败，回退到模板生成:', error.message);
      scripts = {
        intro: includeIntro ? this.generateIntro(topic) : '',
        segments: this.generateSegments(topic, segments, style),
        outro: includeOutro ? this.generateOutro(topic) : ''
      };
    }

    let fullScript = '';
    
    if (scripts.intro) {
      fullScript += scripts.intro + '\n\n';
    }
    
    scripts.segments.forEach((segment, index) => {
      fullScript += `## 第${index + 1}部分：${segment.title}\n\n`;
      fullScript += segment.content + '\n\n';
    });
    
    if (scripts.outro) {
      fullScript += scripts.outro;
    }

    return {
      fullScript,
      scripts,
      metadata: {
        topic,
        style,
        duration,
        segments: scripts.segments.length,
        estimatedLength: this.estimateLength(fullScript),
        generatedBy: scripts.metadata ? scripts.metadata.generatedBy : 'template',
        ...(scripts.metadata || {})
      }
    };
  }

  // 生成开场白
  generateIntro(topic) {
    const intros = [
      `欢迎收听我们的播客节目！我是你的主播。今天我们要聊的话题是：${topic}。这是一个非常有趣且值得深入探讨的主题，让我们一起来了解一下。`,
      `大家好！欢迎来到今天的播客时间。我是主播，很高兴又和大家见面了。今天我们要讨论的是${topic}，相信这个话题会给大家带来很多启发。`,
      `各位听众朋友们，大家好！欢迎收听本期播客。我是你们的老朋友主播。今天我们的主题是${topic}，这个话题最近备受关注，让我们深入了解一下。`
    ];
    
    return intros[Math.floor(Math.random() * intros.length)];
  }

  // 生成节目段落
  generateSegments(topic, count, style) {
    const segments = [];
    
    for (let i = 0; i < count; i++) {
      let title, content;
      
      switch (i) {
        case 0:
          title = `${topic}的基本概念`;
          content = this.generateBasicContent(topic, style);
          break;
        case 1:
          title = `深入了解${topic}`;
          content = this.generateDetailedContent(topic, style);
          break;
        case 2:
          title = `${topic}的实际应用`;
          content = this.generateApplicationContent(topic, style);
          break;
        default:
          title = `${topic}的其他方面`;
          content = this.generateAdditionalContent(topic, style);
      }
      
      segments.push({ title, content });
    }
    
    return segments;
  }

  // 生成基础内容
  generateBasicContent(topic, style) {
    if (style === 'conversational') {
      return `首先，让我们来聊聊什么是${topic}。可能很多朋友对这个概念还不太熟悉，没关系，我们从最基础的地方开始说起。${topic}其实就是...（这里可以根据具体话题展开详细介绍）。简单来说，它影响着我们生活的方方面面，值得我们深入了解。`;
    } else if (style === 'educational') {
      return `在开始深入讨论之前，我们需要先了解${topic}的基本定义和核心概念。从学术角度来看，${topic}是一个多层面的概念，涉及多个维度的内容。让我们系统性地梳理一下相关的基础知识。`;
    } else {
      return `${topic}是一个重要且复杂的主题。为了帮助大家更好地理解，我们首先需要明确几个关键概念。${topic}的核心特征包括...（具体特征可根据话题调整）。了解这些基础知识将有助于我们后续的深入讨论。`;
    }
  }

  // 生成详细内容
  generateDetailedContent(topic, style) {
    if (style === 'conversational') {
      return `现在我们对${topic}有了基本认识，接下来让我们深入探讨一下。你知道吗？${topic}其实有很多有趣的细节，比如说...（可以举例说明）。这些细节往往被人忽视，但实际上非常重要。`;
    } else if (style === 'educational') {
      return `接下来我们将从理论和实践两个角度来分析${topic}。从理论层面，我们需要考虑...从实践角度，我们可以观察到...这种理论与实践的结合为我们提供了全面的视角。`;
    } else {
      return `深入了解${topic}，我们会发现它的复杂性远超想象。专家研究表明，${topic}涉及多个相互关联的因素。通过分析这些因素之间的关系，我们可以更好地把握${topic}的本质。`;
    }
  }

  // 生成应用内容
  generateApplicationContent(topic, style) {
    if (style === 'conversational') {
      return `说了这么多理论，现在让我们看看${topic}在现实生活中是怎么应用的。举个例子，在我们的日常工作中...在家庭生活里...这些实际应用让${topic}变得更加贴近我们的生活。`;
    } else if (style === 'educational') {
      return `理论学习的目的是为了更好的实践应用。${topic}在不同领域都有着广泛的应用前景。在技术领域，它可以...在社会管理方面，它能够...这些应用展示了${topic}的实用价值。`;
    } else {
      return `${topic}的实际应用非常广泛，涵盖了多个行业和领域。通过具体案例分析，我们可以看到${topic}如何在实践中发挥作用。这些成功案例为我们提供了宝贵的经验和启示。`;
    }
  }

  // 生成额外内容
  generateAdditionalContent(topic, style) {
    return `除了我们前面讨论的内容，${topic}还有很多值得关注的方面。随着时代的发展，${topic}也在不断演进和完善。我们需要保持开放的心态，持续学习和探索。`;
  }

  // 生成结尾
  generateOutro(topic) {
    const outros = [
      `好了，今天关于${topic}的分享就到这里。希望通过我们的讨论，大家对这个话题有了更深入的了解。如果你有任何想法或问题，欢迎与我们互动。感谢收听，我们下期再见！`,
      `时间过得真快，今天的${topic}话题就和大家聊到这里。相信每个人都有自己的思考和感悟。期待在评论区看到大家的分享。谢谢大家的陪伴，下期节目再会！`,
      `以上就是今天关于${topic}的全部内容。希望这期播客能给大家带来一些收获和启发。如果觉得有用，别忘了关注我们。我是主播，感谢收听，我们下次见！`
    ];
    
    return outros[Math.floor(Math.random() * outros.length)];
  }

  // 估算音频长度（基于文字数量）
  estimateLength(text) {
    // 中文大约每分钟200-250字
    const charactersPerMinute = 220;
    const characters = text.length;
    const minutes = Math.ceil(characters / charactersPerMinute);
    return `约${minutes}分钟`;
  }

  // 生成完整播客
  async generatePodcast(topic, options = {}) {
    console.log(`🎙️ 开始生成播客：${topic}`);
    
    try {
      // 1. 生成脚本
      console.log('📝 正在生成播客脚本...');
      const scriptResult = await this.generateScript(topic, options);
      
      // 2. 保存脚本
      const scriptPath = path.join(this.outputDir, `${this.sanitizeFilename(topic)}_script.txt`);
      await fs.writeFile(scriptPath, scriptResult.fullScript, 'utf8');
      console.log(`📄 脚本已保存：${scriptPath}`);
      
      // 3. 语音合成
      console.log('🎵 正在进行语音合成...');
      const audioResult = await this.ttsClient.synthesize(scriptResult.fullScript, {
        voiceType: options.voiceType || 'zh_female_linjia_mars_bigtts',
        speedRatio: options.speedRatio || 1.0,
        volumeRatio: options.volumeRatio || 1.0
      });
      
      if (!audioResult.success) {
        throw new Error('语音合成失败');
      }
      
      // 4. 保存音频
      const audioPath = path.join(this.outputDir, `${this.sanitizeFilename(topic)}_podcast.mp3`);
      await fs.writeFile(audioPath, audioResult.audio);
      console.log(`🎵 音频已保存：${audioPath}`);
      
      // 5. 生成元数据
      const metadata = {
        ...scriptResult.metadata,
        generatedAt: new Date().toISOString(),
        audioPath,
        scriptPath,
        audioSize: audioResult.audio.length
      };
      
      const metadataPath = path.join(this.outputDir, `${this.sanitizeFilename(topic)}_metadata.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log('✅ 播客生成完成！');
      
      return {
        success: true,
        metadata,
        files: {
          script: scriptPath,
          audio: audioPath,
          metadata: metadataPath
        }
      };
      
    } catch (error) {
      console.error('❌ 播客生成失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 批量生成播客
  async generateBatchPodcasts(topics, options = {}) {
    console.log(`🎙️ 开始批量生成${topics.length}个播客`);
    const results = [];
    
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      console.log(`\n[${i + 1}/${topics.length}] 正在处理：${topic}`);
      
      const result = await this.generatePodcast(topic, options);
      results.push({
        topic,
        ...result
      });
      
      // 避免请求过于频繁
      if (i < topics.length - 1) {
        console.log('⏱️ 等待2秒后处理下一个...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 批量生成完成！成功：${results.filter(r => r.success).length}，失败：${results.filter(r => !r.success).length}`);
    return results;
  }

  // 清理文件名
  sanitizeFilename(filename) {
    return filename.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').substring(0, 50);
  }

  // 获取生成历史
  async getGenerationHistory() {
    try {
      const files = await fs.readdir(this.outputDir);
      const metadataFiles = files.filter(f => f.endsWith('_metadata.json'));
      
      const history = [];
      for (const file of metadataFiles) {
        const metadata = await fs.readJson(path.join(this.outputDir, file));
        history.push(metadata);
      }
      
      return history.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    } catch (error) {
      console.error('获取历史记录失败:', error);
      return [];
    }
  }
}

module.exports = PodcastGenerator;
