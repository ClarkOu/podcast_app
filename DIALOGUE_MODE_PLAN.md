# 🎭 双人互动播客模式实现计划

## 📋 需要准备的工作

### 1. 🎤 音色准备工作
在火山方舟控制台需要开通第二个音色：

#### 推荐的音色组合：
- **主持人A（现有）**: `zh_female_linjia_mars_bigtts` (林佳女声 - 温和、专业)
- **主持人B（需开通）**: `zh_male_qiushan_mars_bigtts` (秋山男声 - 沉稳、权威)

#### 或者其他组合：
- `zh_female_xiaowei_mars_bigtts` (小薇女声 - 活泼、年轻)
- `zh_male_bohao_mars_bigtts` (博豪男声 - 磁性、成熟)

### 2. 🎯 实现步骤规划

#### 第一阶段：脚本生成优化
1. **修改AI提示词**：让LLM生成双人对话格式的脚本
2. **脚本解析**：识别对话中的角色标记（如 "主持人A:" "主持人B:"）
3. **脚本预览**：在界面中区分显示不同角色的对话

#### 第二阶段：音频合成升级  
1. **脚本分段**：按角色自动分割对话内容
2. **多音色合成**：为不同角色使用不同音色
3. **音频拼接**：将多段音频合成为连续的对话

#### 第三阶段：用户界面改进
1. **模式选择**：添加"单人模式"/"双人互动模式"选项
2. **角色设定**：让用户选择主持人角色设定
3. **音色配置**：让用户为每个角色选择音色

## 🛠️ 技术实现方案

### 前端改进点：
```html
<!-- 新增播客模式选择 -->
<div class="form-group">
    <label for="podcastMode">播客模式</label>
    <select id="podcastMode" onchange="togglePodcastMode()">
        <option value="single">单人播客</option>
        <option value="dialogue">双人互动</option>
    </select>
</div>

<!-- 双人模式时显示的角色设定 -->
<div id="dialogueSettings" style="display: none;">
    <div class="form-row">
        <div class="form-group">
            <label for="hostA">主持人A角色</label>
            <select id="hostA">
                <option value="expert">专家学者</option>
                <option value="interviewer">采访主持</option>
                <option value="narrator">旁白叙述</option>
            </select>
        </div>
        <div class="form-group">
            <label for="hostB">主持人B角色</label>
            <select id="hostB">
                <option value="guest">嘉宾访谈</option>
                <option value="questioner">提问者</option>
                <option value="discussant">讨论伙伴</option>
            </select>
        </div>
    </div>
    
    <div class="form-row">
        <div class="form-group">
            <label for="voiceA">主持人A音色</label>
            <select id="voiceA">
                <option value="zh_female_linjia_mars_bigtts">林佳女声</option>
                <option value="zh_male_qiushan_mars_bigtts">秋山男声</option>
            </select>
        </div>
        <div class="form-group">
            <label for="voiceB">主持人B音色</label>
            <select id="voiceB">
                <option value="zh_male_qiushan_mars_bigtts">秋山男声</option>
                <option value="zh_female_linjia_mars_bigtts">林佳女声</option>
            </select>
        </div>
    </div>
</div>
```

### 后端改进点：

#### 1. AI提示词优化（OpenRouter）
```javascript
// 双人对话模式的系统提示词
const dialogueSystemPrompt = `
你是一位专业的播客内容创作者。请生成双人互动播客脚本，格式要求：

格式要求：
- 使用 "主持人A:" 和 "主持人B:" 标记不同角色
- 主持人A: ${hostARole} 角色
- 主持人B: ${hostBRole} 角色  
- 对话要自然流畅，有来有回
- 避免单方面长篇大论
- 适当加入互动元素和情感表达

示例格式：
主持人A: 大家好，欢迎收听本期节目...
主持人B: 没错，今天我们要聊的话题确实很有趣...
主持人A: 那你觉得这个问题的核心是什么呢？
主持人B: 我认为...
`;
```

#### 2. 脚本解析器
```javascript
// 解析双人对话脚本
function parseDialogueScript(script) {
    const segments = [];
    const lines = script.split('\n');
    
    for (const line of lines) {
        if (line.startsWith('主持人A:')) {
            segments.push({
                speaker: 'hostA',
                content: line.replace('主持人A:', '').trim()
            });
        } else if (line.startsWith('主持人B:')) {
            segments.push({
                speaker: 'hostB', 
                content: line.replace('主持人B:', '').trim()
            });
        }
    }
    
    return segments;
}
```

#### 3. 多音色TTS合成
```javascript
// 双人对话音频合成
async function synthesizeDialogueAudio(segments, voiceConfig) {
    const audioSegments = [];
    
    for (const segment of segments) {
        const voiceType = segment.speaker === 'hostA' ? 
            voiceConfig.voiceA : voiceConfig.voiceB;
            
        const audio = await this.ttsClient.synthesize(segment.content, {
            voiceType,
            speedRatio: voiceConfig.speedRatio,
            volumeRatio: voiceConfig.volumeRatio
        });
        
        audioSegments.push(audio);
    }
    
    // 拼接音频（需要使用音频处理库如 ffmpeg）
    return await this.concatenateAudio(audioSegments);
}
```

## 🎬 用户体验流程

### 双人模式流程：
1. **选择模式**：用户选择"双人互动"模式
2. **角色设定**：设定两个主持人的角色（专家/嘉宾、主持/访谈等）
3. **脚本生成**：AI生成双人对话格式的脚本
4. **脚本预览**：不同角色的对话用不同颜色区分显示
5. **音色选择**：为每个角色选择不同音色
6. **音频合成**：生成双人对话音频

### 脚本预览优化：
```css
.dialogue-hostA {
    background: #e3f2fd;
    border-left: 4px solid #2196f3;
    padding: 10px;
    margin: 5px 0;
}

.dialogue-hostB {
    background: #f3e5f5;
    border-left: 4px solid #9c27b0;
    padding: 10px;
    margin: 5px 0;
}

.speaker-label {
    font-weight: bold;
    color: #333;
    margin-bottom: 5px;
}
```

## 🔧 开发优先级

### 高优先级（马上做）：
1. ✅ 确认并开通第二个音色
2. ✅ 修改前端添加模式选择
3. ✅ 优化AI提示词支持对话生成

### 中优先级（接下来做）：
1. 📝 实现脚本解析和角色分离  
2. 🎵 升级TTS合成支持多音色
3. 🎨 优化脚本预览界面

### 低优先级（最后做）：
1. 🔀 音频拼接和后处理
2. ⚙️ 高级音色参数调节
3. 📊 音频质量优化

## 🚀 下一步行动

1. **首先**：去火山方舟控制台开通第二个音色（推荐 `zh_male_qiushan_mars_bigtts`）
2. **然后**：我来帮您实现前端的模式选择界面
3. **接着**：修改AI提示词，让LLM生成对话格式
4. **最后**：实现多音色合成和音频拼接

您觉得这个方案如何？需要我先实现哪个部分？
