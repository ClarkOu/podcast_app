#!/bin/bash

# 服务器部署脚本
# 在服务器上运行此脚本来部署播客应用

set -e

echo "🚀 开始部署播客应用..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

# 检查docker-compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose未安装，请先安装docker-compose"
    exit 1
fi

# 创建应用目录
sudo mkdir -p /opt/podcast-app
cd /opt/podcast-app

# 下载配置文件
echo "📥 下载配置文件..."
curl -o docker-compose.yml https://raw.githubusercontent.com/ClarkOu/podcast_app/main/docker-compose.yml
curl -o .env.example https://raw.githubusercontent.com/ClarkOu/podcast_app/main/.env.example

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "⚠️  请配置环境变量文件："
    echo "1. 复制 .env.example 为 .env"
    echo "2. 填入真实的API密钥"
    echo ""
    echo "cp .env.example .env"
    echo "nano .env"
    echo ""
    echo "配置完成后重新运行此脚本"
    exit 1
fi

# 拉取镜像
echo "📦 拉取Docker镜像..."
docker-compose pull

# 启动服务
echo "🔄 启动服务..."
docker-compose down
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
if curl -f http://localhost:3000/api/test > /dev/null 2>&1; then
    echo "✅ 部署成功！"
    echo "🌐 访问地址: http://你的服务器IP:3000"
    echo "📱 播客页面: http://你的服务器IP:3000/new-podcast.html"
else
    echo "❌ 服务启动失败，请检查日志："
    echo "docker-compose logs"
fi

echo "🔍 查看运行状态:"
docker-compose ps
