require('dotenv').config();
const WebSocket = require('ws');
const zlib = require('zlib');
const crypto = require('crypto');
const fs = require('fs');

// 从环境变量读取配置
const appid = process.env.VOLCENGINE_TTS_APP_ID;
const token = process.env.VOLCENGINE_TTS_ACCESS_TOKEN;  
const cluster = process.env.VOLCENGINE_TTS_CLUSTER;
const voice_type = process.env.VOLCENGINE_TTS_VOICE_TYPE;

console.log('🔧 配置信息:');
console.log(`App ID: ${appid}`);
console.log(`Token: ${token ? token.substring(0, 8) + '...' : '未配置'}`);
console.log(`Cluster: ${cluster}`);
console.log(`Voice Type: ${voice_type}`);

const host = "openspeech.bytedance.com";
const api_url = `wss://${host}/api/v1/tts/ws_binary`;

// 默认头部 (与Python示例完全一致)
const default_header = Buffer.from([0x11, 0x10, 0x11, 0x00]);

const request_json = {
    "app": {
        "appid": appid,
        "token": "access_token",
        "cluster": cluster
    },
    "user": {
        "uid": "388808087185088"
    },
    "audio": {
        "voice_type": voice_type,
        "encoding": "mp3",
        "speed_ratio": 1.0,
        "volume_ratio": 1.0,
        "pitch_ratio": 1.0,
    },
    "request": {
        "reqid": crypto.randomUUID(),
        "text": "这是火山方舟语音合成测试，验证API是否正常工作。",
        "text_type": "plain",
        "operation": "submit"
    }
};

async function testTTS() {
    console.log('\n🧪 开始测试火山方舟TTS API...');
    
    if (!appid || !token || !cluster || !voice_type) {
        console.error('❌ 缺少必要的环境变量配置');
        return;
    }

    try {
        // 构建请求 (完全按照Python示例)
        const payload_bytes = Buffer.from(JSON.stringify(request_json), 'utf8');
        const compressed_payload = zlib.gzipSync(payload_bytes);
        
        const full_client_request = Buffer.alloc(default_header.length + 4 + compressed_payload.length);
        let offset = 0;
        
        // 复制头部
        default_header.copy(full_client_request, offset);
        offset += default_header.length;
        
        // 写入payload大小 (4字节, big endian)
        full_client_request.writeUInt32BE(compressed_payload.length, offset);
        offset += 4;
        
        // 复制压缩后的payload
        compressed_payload.copy(full_client_request, offset);
        
        console.log('📋 请求信息:');
        console.log('Request JSON:', JSON.stringify(request_json, null, 2));
        console.log(`Request bytes length: ${full_client_request.length}`);
        
        // 创建WebSocket连接 (完全按照Python示例的认证方式)
        const headers = {
            'Authorization': `Bearer; ${token}`
        };
        
        console.log('🔗 正在连接WebSocket...');
        const ws = new WebSocket(api_url, { headers });
        
        const audioChunks = [];
        let hasError = false;
        
        ws.on('open', () => {
            console.log('✅ WebSocket连接成功');
            console.log('📤 发送TTS请求...');
            ws.send(full_client_request);
        });
        
        ws.on('message', (data) => {
            console.log(`📥 收到响应数据: ${data.length} bytes`);
            
            try {
                const result = parseResponse(data);
                
                if (result.error) {
                    console.error('❌ 服务器错误:', result.error);
                    hasError = true;
                    ws.close();
                    return;
                }
                
                if (result.audioData) {
                    audioChunks.push(result.audioData);
                    console.log(`🎵 收到音频数据: ${result.audioData.length} bytes (序号: ${result.sequenceNumber})`);
                }
                
                if (result.isComplete) {
                    console.log('✅ 音频合成完成');
                    const finalAudio = Buffer.concat(audioChunks);
                    fs.writeFileSync('test_output.mp3', finalAudio);
                    console.log(`💾 音频已保存到 test_output.mp3 (总大小: ${finalAudio.length} bytes)`);
                    ws.close();
                }
            } catch (error) {
                console.error('❌ 解析响应失败:', error);
                hasError = true;
                ws.close();
            }
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket错误:', error);
            hasError = true;
        });
        
        ws.on('close', (code, reason) => {
            console.log(`🔚 连接已关闭: ${code} ${reason}`);
            if (!hasError && audioChunks.length > 0) {
                console.log('🎉 测试成功完成！');
            } else if (!hasError) {
                console.log('⚠️ 连接关闭但未收到音频数据');
            }
        });
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

function parseResponse(responseBuffer) {
    const protocolVersion = (responseBuffer[0] >> 4) & 0x0f;
    const headerSize = responseBuffer[0] & 0x0f;
    const messageType = (responseBuffer[1] >> 4) & 0x0f;
    const messageTypeSpecificFlags = responseBuffer[1] & 0x0f;
    const serializationMethod = (responseBuffer[2] >> 4) & 0x0f;
    const messageCompression = responseBuffer[2] & 0x0f;
    const reserved = responseBuffer[3];
    
    const headerExtensions = responseBuffer.slice(4, headerSize * 4);
    const payload = responseBuffer.slice(headerSize * 4);
    
    console.log(`📊 响应解析:`);
    console.log(`   Protocol version: ${protocolVersion}`);
    console.log(`   Message type: ${messageType} (${getMessageTypeName(messageType)})`);
    console.log(`   Message flags: ${messageTypeSpecificFlags}`);
    
    const result = {
        protocolVersion,
        headerSize,
        messageType,
        messageTypeSpecificFlags,
        serializationMethod,
        messageCompression,
        reserved,
        headerExtensions,
        payload,
        isComplete: false,
        audioData: null,
        error: null
    };

    if (messageType === 0xb) { // audio-only server response
        if (messageTypeSpecificFlags === 0) { // no sequence number as ACK
            console.log('   📝 收到确认消息 (无序号)');
            result.isComplete = false;
            return result;
        } else {
            const sequenceNumber = payload.readInt32BE(0);
            const payloadSize = payload.readUInt32BE(4);
            const audioData = payload.slice(8);
            
            result.sequenceNumber = sequenceNumber;
            result.payloadSize = payloadSize;
            result.audioData = audioData;
            result.isComplete = sequenceNumber < 0; // 负数表示最后一个包
            
            console.log(`   📦 音频数据包: 序号=${sequenceNumber}, 大小=${payloadSize}, 完成=${result.isComplete}`);
            return result;
        }
    } else if (messageType === 0xf) { // error message
        const code = payload.readUInt32BE(0);
        const msgSize = payload.readUInt32BE(4);
        let errorMsg = payload.slice(8);
        
        if (messageCompression === 1) {
            errorMsg = zlib.gunzipSync(errorMsg);
        }
        
        result.error = {
            code,
            message: errorMsg.toString('utf8')
        };
        result.isComplete = true;
        
        console.log(`   ❌ 错误消息: 代码=${code}, 消息=${result.error.message}`);
        return result;
    } else if (messageType === 0xc) { // frontend server response
        const msgSize = payload.readUInt32BE(0);
        let frontendMsg = payload.slice(4);
        
        if (messageCompression === 1) {
            frontendMsg = zlib.gunzipSync(frontendMsg);
        }
        
        result.frontendMessage = frontendMsg.toString('utf8');
        console.log(`   💬 前端消息: ${result.frontendMessage}`);
        return result;
    }
    
    console.log(`   ❓ 未知消息类型: ${messageType}`);
    return result;
}

function getMessageTypeName(type) {
    const types = {
        11: "audio-only server response",
        12: "frontend server response", 
        15: "error message from server"
    };
    return types[type] || "unknown";
}

// 运行测试
testTTS();
