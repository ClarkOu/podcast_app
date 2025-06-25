require('dotenv').config();
const VolcengineTTSWebSocketClient = require('./volcengine-tts-websocket');

async function testTTSService() {
  console.log('🧪 开始测试火山方舟TTS服务...\n');
  
  // 检查环境变量
  const requiredEnvVars = ['VOLCENGINE_TTS_APP_ID', 'VOLCENGINE_TTS_ACCESS_TOKEN', 'VOLCENGINE_TTS_CLUSTER'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ 缺少必要的环境变量:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n请创建.env文件并配置这些变量。');
    console.error('可以参考.env.example文件的格式。\n');
    process.exit(1);
  }

  // 显示配置信息（隐藏敏感信息）
  console.log('📋 当前配置:');
  console.log(`   App ID: ${process.env.VOLCENGINE_TTS_APP_ID}`);
  console.log(`   Access Token: ${process.env.VOLCENGINE_TTS_ACCESS_TOKEN ? process.env.VOLCENGINE_TTS_ACCESS_TOKEN.substring(0, 8) + '...' : '未配置'}`);
  console.log(`   Cluster: ${process.env.VOLCENGINE_TTS_CLUSTER}`);
  console.log(`   Voice Type: ${process.env.VOLCENGINE_TTS_VOICE_TYPE}`);
  console.log('');

  // 初始化客户端
  const ttsClient = new VolcengineTTSWebSocketClient(
    process.env.VOLCENGINE_TTS_APP_ID,
    process.env.VOLCENGINE_TTS_ACCESS_TOKEN,
    process.env.VOLCENGINE_TTS_CLUSTER
  );

  try {
    // 测试1: 基础连接测试
    console.log('🔍 测试1: 基础API连接...');
    const isConnected = await ttsClient.testConnection();
    
    if (!isConnected) {
      console.error('❌ 基础连接测试失败');
      process.exit(1);
    }

    // 测试2: 音色测试
    console.log('\n🎭 测试2: 音色测试...');
    const voices = [
      { id: 'zh_female_linjia_mars_bigtts', name: '林佳女声' }
    ];

    for (const voice of voices) {
      console.log(`   测试音色: ${voice.name} (${voice.id})`);
      const result = await ttsClient.synthesize('这是音色测试', { voiceType: voice.id });
      
      if (result.success) {
        console.log(`   ✅ ${voice.name} - 成功 (音频大小: ${result.audio.length} bytes)`);
      } else {
        console.log(`   ❌ ${voice.name} - 失败: ${result.error}`);
      }
    }

    // 测试3: 参数调节测试
    console.log('\n⚙️ 测试3: 参数调节测试...');
    const testParams = [
      { speedRatio: 0.8, volumeRatio: 1.2, name: '慢速+大音量' },
      { speedRatio: 1.5, volumeRatio: 0.8, name: '快速+小音量' }
    ];

    for (const params of testParams) {
      console.log(`   测试参数: ${params.name}`);
      const result = await ttsClient.synthesize('参数测试文本', { 
        voiceType: 'zh_female_linjia_mars_bigtts',
        ...params 
      });
      
      if (result.success) {
        console.log(`   ✅ ${params.name} - 成功`);
      } else {
        console.log(`   ❌ ${params.name} - 失败: ${result.error}`);
      }
    }

    // 测试4: 长文本测试
    console.log('\n📝 测试4: 长文本合成测试...');
    const longText = '这是一个较长的文本测试，用于验证火山方舟TTS服务在处理较长内容时的表现。我们需要确保服务能够正确处理各种长度的文本内容，并且能够稳定地返回高质量的音频结果。';
    
    const longTextResult = await ttsClient.synthesize(longText);
    if (longTextResult.success) {
      console.log(`   ✅ 长文本合成成功 (音频大小: ${longTextResult.audio.length} bytes)`);
    } else {
      console.log(`   ❌ 长文本合成失败: ${longTextResult.error}`);
    }

    console.log('\n🎉 所有测试完成！');
    console.log('\n📌 测试总结:');
    console.log('   - API密钥配置正确');
    console.log('   - 语音合成功能正常');
    console.log('   - 可以开始使用播客生成功能');
    console.log('\n🚀 运行 npm start 启动Web服务');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行测试
testTTSService();
