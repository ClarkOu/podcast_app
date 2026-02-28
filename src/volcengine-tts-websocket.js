const WebSocket = require('ws');
const crypto = require('crypto');

// V3 事件定义
const EVENTS = {
  FinishConnection:   2,
  SessionFinished:    152,
  TTSSentenceStart:   350,
  TTSSentenceEnd:     351,
  TTSResponse:        352,
  ConnectionFinished: 52,
};

class VolcengineTTSWebSocketClient {
  constructor(appId, accessKey, resourceId = 'seed-tts-1.0') {
    this.appId = appId;
    this.accessKey = accessKey;
    this.resourceId = resourceId;
    this.apiUrl = 'wss://openspeech.bytedance.com/api/v3/tts/unidirectional/stream';
  }

  // 构建 SendText 请求帧（无 event 字段，flags=0000）
  buildSendTextFrame(payload) {
    const header = Buffer.from([0x11, 0x10, 0x10, 0x00]);
    const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
    const buf = Buffer.alloc(4 + 4 + payloadBytes.length);
    let offset = 0;
    header.copy(buf, offset); offset += 4;
    buf.writeUInt32BE(payloadBytes.length, offset); offset += 4;
    payloadBytes.copy(buf, offset);
    return buf;
  }

  // 构建 FinishConnection 帧（有 event 字段，flags=0100）
  buildFinishConnectionFrame() {
    const header = Buffer.from([0x11, 0x14, 0x10, 0x00]);
    const payloadBytes = Buffer.from('{}', 'utf8');
    const buf = Buffer.alloc(4 + 4 + 4 + payloadBytes.length);
    let offset = 0;
    header.copy(buf, offset); offset += 4;
    buf.writeInt32BE(EVENTS.FinishConnection, offset); offset += 4;
    buf.writeUInt32BE(payloadBytes.length, offset); offset += 4;
    payloadBytes.copy(buf, offset);
    return buf;
  }

  // 解析服务端响应帧
  parseFrame(buffer) {
    const messageType = (buffer[1] >> 4) & 0x0f;
    const flags = buffer[1] & 0x0f;
    const hasEvent = (flags & 0x04) !== 0;

    // 错误帧: messageType=0xf
    if (messageType === 0xf) {
      const errorCode = buffer.readUInt32BE(4);
      const payloadSize = buffer.readUInt32BE(8);
      const errorMsg = buffer.slice(12, 12 + payloadSize).toString('utf8');
      return { error: { code: errorCode, message: errorMsg } };
    }

    if (!hasEvent) return { messageType, flags };

    let offset = 4;
    const event = buffer.readInt32BE(offset); offset += 4;
    const result = { event, messageType };

    // ConnectionFinished (52) 只含 event，无额外字段
    if (event === EVENTS.ConnectionFinished) {
      return result;
    }

    // 其余事件带 session_id
    const sessionIdLen = buffer.readUInt32BE(offset); offset += 4;
    result.sessionId = buffer.slice(offset, offset + sessionIdLen).toString('utf8');
    offset += sessionIdLen;

    const payloadSize = buffer.readUInt32BE(offset); offset += 4;
    const payloadBytes = buffer.slice(offset, offset + payloadSize);

    // 音频帧: messageType=0xb
    if (messageType === 0xb) {
      result.audioData = payloadBytes;
    } else {
      try {
        result.payload = JSON.parse(payloadBytes.toString('utf8'));
      } catch (e) {
        result.payloadRaw = payloadBytes.toString('utf8');
      }
    }

    return result;
  }

  // 语音合成主方法（对外 API 保持与 V1 一致）
  async synthesize(text, options = {}) {
    const {
      voiceType = 'zh_female_linjia_mars_bigtts',
      speedRatio = 1.0,
      volumeRatio = 1.0,
      encoding = 'mp3',
    } = options;

    // V3 语速范围 [-50, 100]，V1 speedRatio 1.0 对应 0，2.0 对应 100
    const speechRate = Math.round(Math.max(-50, Math.min(100, (speedRatio - 1) * 100)));
    // V3 音量范围 [-50, 100]，V1 volumeRatio 1.0 对应 0
    const loudnessRate = Math.round(Math.max(-50, Math.min(100, (volumeRatio - 1) * 100)));

    const requestPayload = {
      user: {
        uid: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
      },
      req_params: {
        text,
        speaker: voiceType,
        audio_params: {
          format: encoding,
          sample_rate: 24000,
          bit_rate: 128000,   // 明确设置，默认 8k 会导致 MP3 音质极差
          speech_rate: speechRate,
          loudness_rate: loudnessRate,
        },
      },
    };

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.apiUrl, {
        headers: {
          'X-Api-App-Id':      this.appId,
          'X-Api-Access-Key':  this.accessKey,
          'X-Api-Resource-Id': this.resourceId,
          'X-Api-Request-Id':  crypto.randomUUID(),
        },
      });

      const audioChunks = [];
      let hasError = false;

      const timeout = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          reject(new Error('请求超时'));
        }
      }, 30000);

      ws.on('open', () => {
        console.log('WebSocket 连接已建立');
        ws.send(this.buildSendTextFrame(requestPayload));
        console.log('已发送 TTS 请求');
      });

      ws.on('message', (data) => {
        try {
          const frame = this.parseFrame(data);

          if (frame.error) {
            hasError = true;
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`TTS 错误 [${frame.error.code}]: ${frame.error.message}`));
            return;
          }

          switch (frame.event) {
            case EVENTS.TTSResponse:
              if (frame.audioData && frame.audioData.length > 0) {
                audioChunks.push(frame.audioData);
                console.log(`接收音频数据块: ${frame.audioData.length} bytes`);
              }
              break;

            case EVENTS.SessionFinished: {
              const statusCode = frame.payload && frame.payload.status_code;
              if (statusCode && statusCode !== 20000000) {
                hasError = true;
                clearTimeout(timeout);
                ws.close();
                reject(new Error(`TTS 合成失败 [${statusCode}]: ${frame.payload && frame.payload.message}`));
                return;
              }
              console.log('音频合成完成，发送关闭连接请求');
              ws.send(this.buildFinishConnectionFrame());
              break;
            }

            case EVENTS.ConnectionFinished:
              ws.close();
              break;
          }
        } catch (error) {
          console.error('解析响应时出错:', error);
          hasError = true;
          clearTimeout(timeout);
          ws.close();
          reject(error);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket 错误:', error);
        clearTimeout(timeout);
        if (!hasError) reject(error);
      });

      ws.on('close', () => {
        clearTimeout(timeout);
        if (!hasError) {
          if (audioChunks.length > 0) {
            resolve({
              success: true,
              audio: Buffer.concat(audioChunks),
              contentType: 'audio/mpeg',
            });
          } else {
            reject(new Error('连接关闭但未收到音频数据'));
          }
        }
      });
    });
  }

  async testConnection() {
    try {
      console.log('开始测试 TTS 连接...');
      const result = await this.synthesize('连接测试', { voiceType: 'zh_female_linjia_mars_bigtts' });
      if (result.success && result.audio.length > 0) {
        console.log('TTS 连接测试成功！');
        return true;
      }
      return false;
    } catch (error) {
      console.error('连接测试失败:', error.message);
      return false;
    }
  }

  getAvailableVoices() {
    return [
      { id: 'zh_female_linjia_mars_bigtts',         name: '林佳',     gender: 'female', language: 'zh-CN' },
      { id: 'zh_female_shuangkuaisisi_moon_bigtts',  name: '爽快思思', gender: 'female', language: 'zh-CN' },
      { id: 'zh_female_xiaoyue_mars_bigtts',        name: '晓悦',     gender: 'female', language: 'zh-CN' },
      { id: 'zh_female_qingxin_mars_bigtts',        name: '清新小妹', gender: 'female', language: 'zh-CN' },
      { id: 'zh_female_cancan_mars_bigtts',         name: '灿灿',     gender: 'female', language: 'zh-CN' },
      { id: 'zh_male_zhubo_mars_bigtts',            name: '专业主播', gender: 'male',   language: 'zh-CN' },
      { id: 'zh_male_sunwukong_mars_bigtts',        name: '孙悟空',   gender: 'male',   language: 'zh-CN' },
      { id: 'ICL_zh_male_cixingnansang_tob',        name: '磁性男声', gender: 'male',   language: 'zh-CN' },
      { id: 'zh_female_yueyue_mars_bigtts',         name: '粤语悦悦', gender: 'female', language: 'zh-YUE' },
      { id: 'en_female_sarah_mars_bigtts',          name: 'Sarah',    gender: 'female', language: 'en-US' },
      { id: 'en_male_adam_mars_bigtts',             name: 'Adam',     gender: 'male',   language: 'en-US' },
    ];
  }
}

module.exports = VolcengineTTSWebSocketClient;
