# 🚀 播客生成器部署指南

## 📋 部署选项

### 方案一：免费平台部署（推荐新手）
适合快速试用和演示，无需自己的服务器

#### 1. Railway 部署（推荐）
- ✅ 免费额度充足
- ✅ 自动SSL证书
- ✅ 简单易用

**步骤：**
1. 访问 [Railway](https://railway.app)
2. 用GitHub账号登录
3. 连接您的GitHub仓库
4. 添加环境变量（在Settings页面）
5. 自动部署完成

#### 2. Render 部署
- ✅ 永久免费版
- ✅ 自动SSL
- ❌ 冷启动较慢

### 方案二：云服务器部署
适合长期使用和生产环境

#### 支持的云平台：
- 阿里云ECS
- 腾讯云CVM  
- AWS EC2
- Vultr
- DigitalOcean

## 🛠️ 部署步骤

### 准备工作

#### 1. 创建GitHub仓库
```bash
cd /Users/jamie/Downloads/pocast
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ClarkOu/podcast_app.git
git push -u origin main
```

#### 2. 准备环境变量
复制 `.env.example` 为 `.env`，填入真实密钥：
```bash
cp .env.example .env
```

### 免费平台部署（Railway）

#### 1. 推送代码到GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push
```

#### 2. Railway部署
1. 访问 https://railway.app
2. 点击 "Start a New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择您的仓库
5. 添加环境变量：
   - `VOLCENGINE_TTS_APP_ID`
    - `VOLCENGINE_TTS_ACCESS_TOKEN`
    - `VOLCENGINE_TTS_RESOURCE_ID`
    - `VOLCENGINE_TTS_VOICE_TYPE`（可选）
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL`
    - `PORT`
6. 点击部署

#### 3. 获取访问地址
部署完成后，Railway会提供一个免费域名：
- `https://your-app-name.railway.app`

### 云服务器部署

#### 1. 服务器要求
- **最低配置**: 1核2GB内存
- **推荐配置**: 2核4GB内存
- **操作系统**: Ubuntu 20.04+ / CentOS 7+
- **端口**: 开放3000端口

#### 2. 安装Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3. 部署应用
```bash
# 下载部署脚本
curl -o deploy.sh https://raw.githubusercontent.com/ClarkOu/podcast_app/main/deploy.sh
chmod +x deploy.sh

# 运行部署
./deploy.sh
```

#### 4. 配置环境变量
```bash
# 编辑环境变量
nano /opt/podcast-app/.env

# 填入真实的API密钥
VOLCENGINE_TTS_APP_ID=你的实际ID
VOLCENGINE_TTS_ACCESS_TOKEN=你的实际Token
VOLCENGINE_TTS_RESOURCE_ID=seed-tts-1.0
OPENROUTER_API_KEY=你的实际Key
OPENROUTER_MODEL=qwen/qwen3-32b:free
PORT=3000
```

#### 5. 启动服务
```bash
cd /opt/podcast-app
docker-compose up -d
```

## 🔧 CI/CD自动部署

### GitHub Actions配置

已为您准备了 `.github/workflows/deploy.yml`，需要在GitHub仓库中设置以下Secrets：

#### Repository Secrets：
- `DOCKER_USERNAME`: Docker Hub用户名
- `DOCKER_PASSWORD`: Docker Hub密码或Token
- `HOST`: 服务器IP地址
- `USERNAME`: 服务器用户名
- `SSH_KEY`: SSH私钥

### 自动部署流程：
1. 推送代码到main分支
2. 自动运行测试
3. 构建Docker镜像
4. 推送到Docker Hub
5. 自动部署到服务器

## 🌐 域名配置（可选）

### 免费SSL证书
使用Cloudflare或Let's Encrypt：

```bash
# 安装certbot
sudo apt install certbot

# 获取SSL证书
sudo certbot certonly --standalone -d your-domain.com

# 配置nginx反向代理
sudo nano /etc/nginx/sites-available/podcast-app
```

### Nginx配置示例：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 监控和维护

### 查看日志
```bash
# Docker日志
docker-compose logs -f

# 系统资源
docker stats
```

### 更新应用
```bash
cd /opt/podcast-app
git pull
docker-compose build
docker-compose up -d
```

### 备份数据
```bash
# 备份输出文件
tar -czf backup-$(date +%Y%m%d).tar.gz output/
```

## 🔍 故障排查

### 常见问题：

#### 1. 服务无法启动
```bash
# 检查日志
docker-compose logs

# 检查端口占用
netstat -tulpn | grep 3000
```

#### 2. API密钥错误
- 检查 `.env` 文件配置
- 确认火山方舟和OpenRouter密钥有效
- 确认使用的是 `VOLCENGINE_TTS_RESOURCE_ID`，而不是旧字段 `VOLCENGINE_TTS_CLUSTER`

#### 3. 内存不足
- 升级服务器配置
- 优化Docker内存限制

## 📞 需要帮助？

如果遇到问题，请提供：
1. 错误日志
2. 服务器配置
3. 部署方式

---

**选择建议：**
- 🏃‍♂️ **快速试用**: 选择Railway免费部署
- 🏢 **生产使用**: 选择云服务器部署
- 💰 **预算考虑**: Railway免费额度→VPS服务器
