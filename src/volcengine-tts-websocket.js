const WebSocket = require('ws');
const crypto = require('crypto');
const zlib = require('zlib');

class VolcengineTTSWebSocketClient {
  constructor(appId, token, cluster) {
    this.appId = appId;
    this.token = token;
    this.cluster = cluster;
    this.host = 'openspeech.bytedance.com';
    this.apiUrl = `wss://${this.host}/api/v1/tts/ws_binary`;
    
    // 消息类型定义
    this.MESSAGE_TYPES = {
      11: "audio-only server response", 
      12: "frontend server response", 
      15: "error message from server"
    };
    
    // 默认头部 (version: 1, header size: 1, message type: 1, flags: 0, serialization: 1, compression: 1, reserved: 0)
    this.defaultHeader = Buffer.from([0x11, 0x10, 0x11, 0x00]);
  }

  // 创建WebSocket连接
  createConnection() {
    const headers = {
      'Authorization': `Bearer; ${this.token}`
    };
    
    return new WebSocket(this.apiUrl, { headers });
  }

  // 构建请求数据
  buildRequest(text, options = {}) {
    const {
      voiceType = 'zh_female_linjia_mars_bigtts',
      encoding = 'mp3',
      speedRatio = 1.0,
      volumeRatio = 1.0,
      pitchRatio = 1.0,
      operation = 'submit'
    } = options;

    const requestJson = {
      app: {
        appid: this.appId,
        token: "access_token",
        cluster: this.cluster
      },
      user: {
        uid: "388808087185088"
      },
      audio: {
        voice_type: voiceType,
        encoding: encoding,
        speed_ratio: speedRatio,
        volume_ratio: volumeRatio,
        pitch_ratio: pitchRatio,
      },
      request: {
        reqid: crypto.randomUUID(),
        text: text,
        text_type: "plain",
        operation: operation
      }
    };

    // 转换为JSON并压缩
    const payloadBytes = Buffer.from(JSON.stringify(requestJson), 'utf8');
    const compressedPayload = zlib.gzipSync(payloadBytes);
    
    // 构建完整请求
    const fullRequest = Buffer.alloc(this.defaultHeader.length + 4 + compressedPayload.length);
    let offset = 0;
    
    // 复制头部
    this.defaultHeader.copy(fullRequest, offset);
    offset += this.defaultHeader.length;
    
    // 写入payload大小 (4字节, big endian)
    fullRequest.writeUInt32BE(compressedPayload.length, offset);
    offset += 4;
    
    // 复制payload
    compressedPayload.copy(fullRequest, offset);
    
    return fullRequest;
  }

  // 解析响应
  parseResponse(responseBuffer) {
    const protocolVersion = (responseBuffer[0] >> 4) & 0x0f;
    const headerSize = responseBuffer[0] & 0x0f;
    const messageType = (responseBuffer[1] >> 4) & 0x0f;
    const messageTypeSpecificFlags = responseBuffer[1] & 0x0f;
    const serializationMethod = (responseBuffer[2] >> 4) & 0x0f;
    const messageCompression = responseBuffer[2] & 0x0f;
    const reserved = responseBuffer[3];
    
    const headerExtensions = responseBuffer.slice(4, headerSize * 4);
    const payload = responseBuffer.slice(headerSize * 4);
    
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
      
      return result;
    } else if (messageType === 0xc) { // frontend server response
      const msgSize = payload.readUInt32BE(0);
      let frontendMsg = payload.slice(4);
      
      if (messageCompression === 1) {
        frontendMsg = zlib.gunzipSync(frontendMsg);
      }
      
      result.frontendMessage = frontendMsg.toString('utf8');
      return result;
    }
    
    return result;
  }

  // 语音合成主方法
  async synthesize(text, options = {}) {
    return new Promise((resolve, reject) => {
      const ws = this.createConnection();
      const audioChunks = [];
      let hasError = false;

      ws.on('open', () => {
        console.log('🔗 WebSocket连接已建立');
        
        // 发送请求
        const request = this.buildRequest(text, options);
        ws.send(request);
        console.log('📤 已发送TTS请求');
      });

      ws.on('message', (data) => {
        try {
          const response = this.parseResponse(data);
          
          if (response.error) {
            console.error('❌ 服务器返回错误:', response.error);
            hasError = true;
            ws.close();
            reject(new Error(`TTS错误 [${response.error.code}]: ${response.error.message}`));
            return;
          }
          
          if (response.audioData) {
            audioChunks.push(response.audioData);
            console.log(`📦 接收音频数据块: ${response.audioData.length} bytes (序号: ${response.sequenceNumber})`);
          }
          
          if (response.isComplete) {
            console.log('✅ 音频合成完成');
            ws.close();
            
            const finalAudio = Buffer.concat(audioChunks);
            resolve({
              success: true,
              audio: finalAudio,
              contentType: 'audio/mpeg'
            });
          }
        } catch (error) {
          console.error('❌ 解析响应时出错:', error);
          hasError = true;
          ws.close();
          reject(error);
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket错误:', error);
        if (!hasError) {
          reject(error);
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`🔚 WebSocket连接已关闭: ${code} ${reason}`);
        if (!hasError && audioChunks.length === 0) {
          reject(new Error('连接关闭但未收到音频数据'));
        }
      });

      // 设置超时
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          reject(new Error('请求超时'));
        }
      }, 30000); // 30秒超时
    });
  }

  // 测试连接
  async testConnection() {
    try {
      console.log('🧪 开始测试TTS连接...');
      const result = await this.synthesize('这是连接测试', {
        voiceType: 'zh_female_linjia_mars_bigtts'
      });
      
      if (result.success && result.audio.length > 0) {
        console.log('✅ TTS连接测试成功！');
        return true;
      } else {
        console.error('❌ 测试失败: 未收到音频数据');
        return false;
      }
    } catch (error) {
      console.error('❌ 连接测试失败:', error.message);
      return false;
    }
  }

  // 获取可用音色列表 (基于用户实际权限)
  getAvailableVoices() {
    return [
      { id: 'zh_female_linjia_mars_bigtts', name: '林佳女声', language: 'zh-CN', type: 'bigtts' }
    ];
  }
}

module.exports = VolcengineTTSWebSocketClient;
