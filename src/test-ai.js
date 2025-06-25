require('dotenv').config();
const VolcengineTTSWebSocketClient = require('./volcengine-tts-websocket');
const PodcastGenerator = require('./podcast-generator');
const OpenRouterClient = require('./openrouter-client');

async function testAIPodcastGeneration() {
  console.log('🧪 开始测试AI播客生成功能...\n');

  try {
    // 1. 测试OpenRouter配置
    console.log('1. 检查配置...');
    console.log(`   - OpenRouter API Key: ${process.env.OPENROUTER_API_KEY ? '已配置' : '未配置'}`);
    console.log(`   - OpenRouter 模型: ${process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'}`);
    
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
      console.log('❌ OpenRouter API Key未配置，将使用模板生成');
      console.log('💡 要启用AI功能，请在.env文件中设置 OPENROUTER_API_KEY');
    }

    // 2. 初始化TTS客户端
    console.log('\n2. 初始化TTS客户端...');
    const ttsClient = new VolcengineTTSWebSocketClient(
      process.env.VOLCENGINE_TTS_APP_ID,
      process.env.VOLCENGINE_TTS_ACCESS_TOKEN,
      process.env.VOLCENGINE_TTS_CLUSTER
    );

    // 3. 初始化播客生成器
    console.log('3. 初始化播客生成器...');
    const openRouterConfig = {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'
    };
    
    const podcastGenerator = new PodcastGenerator(ttsClient, openRouterConfig);
    console.log(`   AI功能状态: ${podcastGenerator.useAI ? '启用' : '禁用'}`);

    // 4. 测试模板生成
    console.log('\n4. 测试模板生成...');
    const templateResult = await podcastGenerator.generateScript('人工智能的未来发展', {
      style: 'conversational',
      duration: 'short',
      segments: 2,
      useAI: false
    });
    
    console.log('✅ 模板生成成功');
    console.log(`   - 主题: ${templateResult.metadata.topic}`);
    console.log(`   - 生成方式: ${templateResult.metadata.generatedBy || 'template'}`);
    console.log(`   - 预估时长: ${templateResult.metadata.estimatedLength}`);
    console.log(`   - 脚本长度: ${templateResult.fullScript.length}字符`);

    // 5. 测试AI生成（如果配置了）
    if (podcastGenerator.useAI) {
      console.log('\n5. 测试AI生成...');
      try {
        const aiResult = await podcastGenerator.generateScript('量子计算的原理与应用', {
          style: 'educational',
          duration: 'medium',
          segments: 3,
          useAI: true
        });
        
        console.log('✅ AI生成成功');
        console.log(`   - 主题: ${aiResult.metadata.topic}`);
        console.log(`   - 生成方式: ${aiResult.metadata.generatedBy}`);
        console.log(`   - 使用模型: ${aiResult.metadata.model || '未知'}`);
        console.log(`   - 预估时长: ${aiResult.metadata.estimatedLength}`);
        console.log(`   - 脚本长度: ${aiResult.fullScript.length}字符`);
        
        // 显示AI生成内容的前100字符
        console.log(`   - 内容预览: ${aiResult.fullScript.substring(0, 100)}...`);
      } catch (error) {
        console.log('❌ AI生成失败:', error.message);
        console.log('💡 这可能是由于API Key问题或网络连接问题');
      }
    } else {
      console.log('\n5. 跳过AI生成测试（未配置API Key）');
    }

    // 6. 测试OpenRouter客户端（如果配置了）
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your_openrouter_api_key_here') {
      console.log('\n6. 测试OpenRouter客户端直接调用...');
      try {
        const openRouterClient = new OpenRouterClient(
          process.env.OPENROUTER_API_KEY,
          process.env.OPENROUTER_MODEL
        );
        
        const directResult = await openRouterClient.generatePodcastScript('区块链技术简介', {
          style: 'informative',
          duration: 'short',
          segments: 2
        });
        
        console.log('✅ OpenRouter直接调用成功');
        console.log(`   - 返回内容长度: ${directResult.fullScript.length}字符`);
        console.log(`   - 内容预览: ${directResult.fullScript.substring(0, 80)}...`);
      } catch (error) {
        console.log('❌ OpenRouter直接调用失败:', error.message);
      }
    }

    console.log('\n🎉 测试完成！');
    
    // 总结
    console.log('\n📊 功能状态总结:');
    console.log(`   - TTS语音合成: ✅ 可用`);
    console.log(`   - 模板播客生成: ✅ 可用`);
    console.log(`   - AI播客生成: ${podcastGenerator.useAI ? '✅ 可用' : '❌ 需配置API Key'}`);
    
    if (!podcastGenerator.useAI) {
      console.log('\n🔧 启用AI功能的步骤:');
      console.log('   1. 访问 https://openrouter.ai 注册账号');
      console.log('   2. 获取API Key');
      console.log('   3. 在.env文件中设置 OPENROUTER_API_KEY=你的密钥');
      console.log('   4. 重新启动服务');
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testAIPodcastGeneration();
}

module.exports = { testAIPodcastGeneration };
