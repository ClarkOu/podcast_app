// 基础语法检查测试，无需API密钥
console.log('🧪 运行基础语法测试...');

// 检查主要模块是否可以加载
try {
  // 测试模块导入
  const path = require('path');
  const fs = require('fs');
  
  // 检查主要文件是否存在
  const requiredFiles = [
    'src/index.js',
    'src/podcast-generator.js', 
    'src/volcengine-tts-websocket.js',
    'src/openrouter-client.js',
    'package.json'
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} 存在`);
    } else {
      console.log(`❌ ${file} 不存在`);
      allFilesExist = false;
    }
  });
  
  // 检查package.json语法
  const pkg = require('../package.json');
  if (pkg.name && pkg.version && pkg.main) {
    console.log('✅ package.json 格式正确');
  } else {
    console.log('❌ package.json 格式有误');
    allFilesExist = false;
  }
  
  if (allFilesExist) {
    console.log('🎉 所有基础检查通过！');
    process.exit(0);
  } else {
    console.log('❌ 部分检查失败');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  process.exit(1);
}
