const OpenAI = require('openai');

class OpenRouterClient {
  constructor(apiKey, model = 'meta-llama/llama-3.1-8b-instruct:free') {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Podcast Generator'
      }
    });
    this.model = model;
  }

  async generatePodcastScript(topic, options = {}) {
    const {
      style = 'informative',
      duration = 'medium',
      segments = 3,
      language = 'chinese'
    } = options;

    const systemPrompt = this.buildSystemPrompt(style, duration, language);
    const userPrompt = this.buildUserPrompt(topic, segments);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      return this.parseScriptResponse(content, topic);
    } catch (error) {
      console.error('OpenRouter API调用失败:', error);
      throw new Error(`生成播客脚本失败: ${error.message}`);
    }
  }

  // 流式生成播客脚本
  async generatePodcastScriptStream(topic, options = {}, onChunk) {
    const {
      style = 'informative',
      duration = 'medium',
      segments = 3,
      language = 'chinese'
    } = options;

    const systemPrompt = this.buildSystemPrompt(style, duration, language);
    const userPrompt = this.buildUserPrompt(topic, segments);

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      });

      let fullContent = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          // 调用回调函数发送流式数据
          if (onChunk) {
            onChunk(content);
          }
        }
      }

      return this.parseScriptResponse(fullContent, topic);
    } catch (error) {
      console.error('OpenRouter 流式API调用失败:', error);
      throw new Error(`流式生成播客脚本失败: ${error.message}`);
    }
  }

  // 流式生成双人对话播客脚本
  async generateDialoguePodcastScriptStream(topic, options = {}, onChunk) {
    const {
      style = 'conversational',
      duration = 'medium',
      segments = 3,
      language = 'chinese',
      hostARole = '主持人',
      hostBRole = '嘉宾'
    } = options;

    const systemPrompt = this.buildDialogueSystemPrompt(style, duration, language, hostARole, hostBRole);
    const userPrompt = this.buildDialogueUserPrompt(topic, segments);

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2500,
        stream: true
      });

      let fullContent = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          // 调用回调函数发送流式数据
          if (onChunk) {
            onChunk(content);
          }
        }
      }

      return this.parseDialogueScriptResponse(fullContent, topic);
    } catch (error) {
      console.error('OpenRouter 双人对话流式API调用失败:', error);
      throw new Error(`流式生成双人对话播客脚本失败: ${error.message}`);
    }
  }

  buildSystemPrompt(style, duration, language) {
    const styleDescriptions = {
      informative: '专业、客观、信息丰富的新闻播客风格',
      conversational: '轻松、亲切、对话式的聊天播客风格',
      educational: '系统性、深入、教育性的知识播客风格'
    };

    const durationGuides = {
      short: '2-3分钟，约400-600字',
      medium: '5-8分钟，约1000-1600字',
      long: '10-15分钟，约2000-3000字'
    };

    return `你是一位专业的播客内容创作者。请根据以下要求生成播客脚本：

风格：${styleDescriptions[style]}
时长：${durationGuides[duration]}
语言：${language === 'chinese' ? '中文' : '英文'}

要求：
1. 生成结构化的播客脚本，包含：开场白、主要内容段落、结尾
2. 内容要准确、有趣、易懂
3. 语言自然流畅，适合口播
4. 避免过于书面化的表达
5. 适当加入互动元素和情感表达

请按以下JSON格式返回：
{
  "intro": "开场白内容",
  "segments": [
    {
      "title": "段落标题",
      "content": "段落内容"
    }
  ],
  "outro": "结尾内容"
}`;
  }

  buildUserPrompt(topic, segments) {
    return `请为以下主题生成播客脚本：

主题：${topic}
段落数量：${segments}个主要段落

请确保内容准确、有价值，并且适合中文听众。每个段落应该有明确的主题和丰富的内容。`;
  }

  // 构建双人对话系统提示词
  buildDialogueSystemPrompt(style, duration, language, hostARole, hostBRole) {
    const styleDescriptions = {
      informative: '专业、客观、信息丰富的新闻播客风格',
      conversational: '轻松、亲切、对话式的聊天播客风格',
      educational: '系统性、深入、教育性的知识播客风格'
    };

    const durationGuides = {
      short: '2-3分钟，约400-800字',
      medium: '5-8分钟，约1000-1800字',
      long: '10-15分钟，约2000-3500字'
    };

    return `你是一位专业的播客内容创作者。请生成双人互动播客脚本：

风格：${styleDescriptions[style]}
时长：${durationGuides[duration]}
语言：${language === 'chinese' ? '中文' : '英文'}

角色设定：
- 主持人A: ${hostARole}
- 主持人B: ${hostBRole}

格式要求：
1. 使用 "主持人A:" 和 "主持人B:" 标记不同角色
2. 对话要自然流畅，有来有回，避免单方面长篇大论
3. 每次发言控制在1-3句话，保持对话节奏
4. 适当加入互动元素、提问、呼应等
5. 内容要准确、有趣、易懂
6. 语言自然流畅，适合口播

示例格式：
主持人A: 大家好，欢迎收听本期节目...
主持人B: 没错，今天我们要聊的话题确实很有趣...
主持人A: 那你觉得这个问题的核心是什么呢？
主持人B: 我认为...

请直接返回对话内容，不需要JSON格式。`;
  }

  // 构建双人对话用户提示词
  buildDialogueUserPrompt(topic, segments) {
    return `请为以下主题生成双人互动播客脚本：

主题：${topic}
对话轮次：约${segments * 6}轮对话（每个主要观点包含6轮左右的问答互动）

要求：
1. 开场要有吸引力，介绍主题
2. 围绕主题展开${segments}个主要观点的讨论
3. 每个观点都要有双方的互动问答
4. 结尾要有总结和展望
5. 确保内容准确、有价值，适合中文听众`;
  }

  parseScriptResponse(content, topic) {
    try {
      // 尝试解析JSON格式的响应
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const scriptData = JSON.parse(jsonMatch[0]);
        return {
          intro: scriptData.intro,
          segments: scriptData.segments,
          outro: scriptData.outro,
          fullScript: this.buildFullScript(scriptData),
          metadata: {
            topic,
            generatedBy: 'openrouter',
            model: this.model,
            timestamp: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.warn('JSON解析失败，使用文本解析:', error);
    }

    // 如果JSON解析失败，尝试文本解析
    return this.parseTextResponse(content, topic);
  }

  parseTextResponse(content, topic) {
    const lines = content.split('\n').filter(line => line.trim());
    
    // 简单的文本解析逻辑
    let intro = '';
    let outro = '';
    const segments = [];
    
    let currentSection = 'intro';
    let currentSegment = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.includes('开场') || trimmedLine.includes('intro')) {
        currentSection = 'intro';
        continue;
      } else if (trimmedLine.includes('结尾') || trimmedLine.includes('outro')) {
        currentSection = 'outro';
        continue;
      } else if (trimmedLine.includes('段落') || trimmedLine.includes('第') || trimmedLine.startsWith('#')) {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          title: trimmedLine.replace(/[#\d\s\.\-]/g, ''),
          content: ''
        };
        currentSection = 'segment';
        continue;
      }
      
      if (currentSection === 'intro') {
        intro += trimmedLine + ' ';
      } else if (currentSection === 'outro') {
        outro += trimmedLine + ' ';
      } else if (currentSection === 'segment' && currentSegment) {
        currentSegment.content += trimmedLine + ' ';
      }
    }
    
    if (currentSegment) {
      segments.push(currentSegment);
    }
    
    // 如果解析结果为空，提供默认内容
    if (!intro && segments.length === 0 && !outro) {
      return {
        intro: `欢迎收听今天的播客，我们来聊聊${topic}这个话题。`,
        segments: [{
          title: topic,
          content: content.substring(0, 500) + '...'
        }],
        outro: '感谢收听，我们下期再见！',
        fullScript: content,
        metadata: {
          topic,
          generatedBy: 'openrouter-fallback',
          model: this.model,
          timestamp: new Date().toISOString()
        }
      };
    }

    return {
      intro: intro.trim(),
      segments,
      outro: outro.trim(),
      fullScript: this.buildFullScript({ intro: intro.trim(), segments, outro: outro.trim() }),
      metadata: {
        topic,
        generatedBy: 'openrouter',
        model: this.model,
        timestamp: new Date().toISOString()
      }
    };
  }

  // 解析双人对话脚本响应
  parseDialogueScriptResponse(content, topic) {
    try {
      // 清理内容，移除可能的markdown标记
      let cleanContent = content.replace(/```[\s\S]*?```/g, '').trim();
      
      // 统计基本信息
      const lines = cleanContent.split('\n').filter(line => line.trim());
      const hostALines = lines.filter(line => line.includes('主持人A:')).length;
      const hostBLines = lines.filter(line => line.includes('主持人B:')).length;
      
      return {
        intro: '双人互动播客开场',
        segments: [{
          title: '双人对话内容',
          content: cleanContent
        }],
        outro: '双人互动播客结尾',
        metadata: {
          topic: topic,
          generatedBy: 'openrouter',
          model: this.model,
          hostALines: hostALines,
          hostBLines: hostBLines,
          totalLines: hostALines + hostBLines,
          estimatedLength: this.estimateLength(cleanContent),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('解析双人对话脚本失败:', error);
      // 返回原始内容作为备选
      return {
        intro: '',
        segments: [{
          title: '播客内容',
          content: content
        }],
        outro: '',
        metadata: {
          topic: topic,
          generatedBy: 'openrouter-fallback',
          estimatedLength: this.estimateLength(content),
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  buildFullScript(scriptData) {
    let fullScript = '';
    
    if (scriptData.intro) {
      fullScript += scriptData.intro + '\n\n';
    }
    
    if (scriptData.segments && scriptData.segments.length > 0) {
      scriptData.segments.forEach((segment, index) => {
        fullScript += `## ${segment.title}\n\n`;
        fullScript += segment.content + '\n\n';
      });
    }
    
    if (scriptData.outro) {
      fullScript += scriptData.outro;
    }
    
    return fullScript;
  }

  // 生成多个主题的批量脚本
  async generateBatchScripts(topics, options = {}) {
    const results = [];
    
    for (const topic of topics) {
      try {
        console.log(`正在生成主题: ${topic}`);
        const script = await this.generatePodcastScript(topic, options);
        results.push({
          topic,
          success: true,
          script
        });
        
        // 添加延迟避免API频率限制
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`生成主题 "${topic}" 失败:`, error);
        results.push({
          topic,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // 获取可用模型列表
  async getAvailableModels() {
    try {
      const response = await this.client.models.list();
      return response.data.filter(model => 
        model.id.includes('llama') || 
        model.id.includes('gpt') || 
        model.id.includes('claude')
      );
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return [];
    }
  }

  // 估算播客时长
  estimateLength(content) {
    if (!content || typeof content !== 'string') {
      return '未知';
    }
    
    const charCount = content.length;
    const avgCharsPerMinute = 400; // 中文播客平均每分钟400字符
    const estimatedMinutes = Math.round(charCount / avgCharsPerMinute);
    
    if (estimatedMinutes < 1) {
      return '1分钟以内';
    } else if (estimatedMinutes < 60) {
      return `${estimatedMinutes}分钟`;
    } else {
      const hours = Math.floor(estimatedMinutes / 60);
      const minutes = estimatedMinutes % 60;
      return `${hours}小时${minutes}分钟`;
    }
  }
}

module.exports = OpenRouterClient;
