# 🚀 GitHub仓库创建和代码推送指南

## 第一步：在GitHub创建仓库

1. 访问 [GitHub](https://github.com)
2. 点击右上角的 "+" → "New repository"
3. 填写仓库信息：
   - **Repository name**: `podcast_app`
   - **Description**: `AI播客生成器 - 支持双人对话模式的智能播客制作工具`
   - **设置为Public**（这样CI/CD免费）
   - ❌ **不要**勾选 "Add a README file"
   - ❌ **不要**勾选 "Add .gitignore"
   - ❌ **不要**勾选 "Choose a license"
4. 点击 "Create repository"

## 第二步：本地初始化Git仓库

在终端中运行以下命令：

```bash
# 确保在项目目录中
cd /Users/jamie/Downloads/pocast

# 初始化Git仓库
git init

# 添加所有文件
git add .

# 创建第一次提交
git commit -m "🎉 初始化播客生成器项目

✨ 功能特性：
- 🤖 AI驱动的播客脚本生成
- 🎙️ 双人对话模式支持
- 🔊 TTS语音合成（豆包火山方舟）
- 🌐 现代化Web界面
- 🐳 Docker容器化部署
- 🚀 CI/CD自动化流程

📦 技术栈：
- Node.js + Express
- OpenRouter AI API
- 豆包火山方舟TTS
- Docker + GitHub Actions"

# 设置主分支
git branch -M main

# 添加远程仓库
git remote add origin https://github.com/ClarkOu/podcast_app.git

# 推送到GitHub
git push -u origin main
```

## 第三步：配置GitHub Secrets（CI/CD需要）

推送代码后，配置GitHub Actions所需的密钥：

1. 在GitHub仓库页面，点击 "Settings"
2. 左侧菜单点击 "Secrets and variables" → "Actions"
3. 点击 "New repository secret"，依次添加：

### 必需的Secrets：

| Secret Name | 描述 | 获取方式 |
|------------|------|----------|
| `DOCKER_USERNAME` | Docker Hub用户名 | 注册Docker Hub |
| `DOCKER_PASSWORD` | Docker Hub Access Token | Docker Hub设置页面创建 |
| `HOST` | 服务器IP地址 | 云服务器控制台 |
| `USERNAME` | 服务器用户名 | 通常是root或ubuntu |
| `SSH_KEY` | SSH私钥 | `cat ~/.ssh/id_rsa` |

### 配置Docker Hub Access Token：

1. 访问 [Docker Hub](https://hub.docker.com)
2. 注册或登录账号
3. 点击右上角头像 → "Account Settings"
4. 点击 "Security" → "New Access Token"
5. 输入Token名称："GitHub Actions"
6. 权限选择："Read, Write, Delete"
7. 点击"Generate"并保存Token

## 第四步：验证部署流程

推送代码后，检查：

1. **GitHub Actions运行**：
   - 仓库页面点击"Actions"标签
   - 查看"Build and Deploy Podcast App"工作流
   - 确保所有步骤成功运行

2. **Docker镜像构建**：
   - 访问 [Docker Hub](https://hub.docker.com)
   - 查看是否有`clarkou/podcast_app`镜像

## 🎯 下一步

完成以上步骤后，你就可以在服务器上运行部署了！

```bash
# 在服务器上运行
curl -o deploy.sh https://raw.githubusercontent.com/ClarkOu/podcast_app/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

## 🆘 如果遇到问题

1. **推送失败**：检查仓库是否已创建
2. **CI/CD失败**：检查Secrets是否正确配置
3. **Docker构建失败**：检查Docker Hub凭据

---

**重要提醒**：确保在推送代码前，已经创建了GitHub仓库！
