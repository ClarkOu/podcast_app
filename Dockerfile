# 基于Node.js 18的官方镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 设置npm镜像源（可选，加速国内下载）
# RUN npm config set registry https://registry.npmmirror.com

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建输出目录
RUN mkdir -p output temp

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 启动应用
CMD ["npm", "start"]
