const crypto = require('crypto');
const axios = require('axios');

class VolcengineTTSClient {
  constructor(accessKey, secretKey, appId) {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.appId = appId;
    this.region = 'cn-north-1';
    this.service = 'tts';
    this.version = '2022-08-24';
    this.host = 'tts.volcengineapi.com';
  }

  // 生成签名
  generateSignature(method, uri, query, headers, body, timestamp) {
    const algorithm = 'HMAC-SHA256';
    const canonicalRequest = this.createCanonicalRequest(method, uri, query, headers, body);
    const credentialScope = `${timestamp.substr(0, 8)}/${this.region}/${this.service}/request`;
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;
    
    const kDate = crypto.createHmac('sha256', this.secretKey).update(timestamp.substr(0, 8)).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(this.service).digest();
    const kRequest = crypto.createHmac('sha256', kService).update('request').digest();
    const signature = crypto.createHmac('sha256', kRequest).update(stringToSign).digest('hex');
    
    return signature;
  }

  // 创建规范请求
  createCanonicalRequest(method, uri, query, headers, body) {
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}`)
      .join('\n');
    
    const signedHeaders = Object.keys(headers)
      .sort()
      .map(key => key.toLowerCase())
      .join(';');
    
    const hashedPayload = crypto.createHash('sha256').update(body).digest('hex');
    
    return `${method}\n${uri}\n${query}\n${canonicalHeaders}\n\n${signedHeaders}\n${hashedPayload}`;
  }

  // 语音合成
  async synthesize(text, options = {}) {
    const {
      voice = 'zh_female_qingxin',
      speed = 1.0,
      volume = 1.0,
      pitch = 1.0,
      emotion = 'normal'
    } = options;

    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const uri = '/';
    const query = '';
    
    const requestBody = {
      app: {
        appid: this.appId,
        token: "access_token",
        cluster: "volcano_tts"
      },
      user: {
        uid: "test_user_001"
      },
      audio: {
        voice_type: voice,
        encoding: "mp3",
        speed_ratio: speed,
        volume_ratio: volume,
        pitch_ratio: pitch,
        emotion: emotion
      },
      request: {
        reqid: crypto.randomUUID(),
        text: text,
        text_type: "plain"
      }
    };

    const body = JSON.stringify(requestBody);
    
    const headers = {
      'Content-Type': 'application/json',
      'Host': this.host,
      'X-Date': timestamp,
    };

    const signature = this.generateSignature('POST', uri, query, headers, body, timestamp);
    
    headers['Authorization'] = `HMAC-SHA256 Credential=${this.accessKey}/${timestamp.substr(0, 8)}/${this.region}/${this.service}/request, SignedHeaders=${Object.keys(headers).map(k => k.toLowerCase()).sort().join(';')}, Signature=${signature}`;

    try {
      const response = await axios({
        method: 'POST',
        url: `https://${this.host}${uri}`,
        headers: headers,
        data: body,
        responseType: 'arraybuffer'
      });

      return {
        success: true,
        audio: response.data,
        contentType: response.headers['content-type'] || 'audio/mpeg'
      };
    } catch (error) {
      console.error('TTS API调用失败:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // 测试连接
  async testConnection() {
    try {
      const result = await this.synthesize('你好，这是语音合成测试。', {
        voice: 'zh_female_qingxin'
      });
      
      if (result.success) {
        console.log('✅ 火山方舟TTS API连接成功！');
        return true;
      } else {
        console.error('❌ API调用失败:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ 连接测试失败:', error.message);
      return false;
    }
  }
}

module.exports = VolcengineTTSClient;
