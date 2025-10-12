#!/bin/bash

# EventReport 启动脚本

echo "================================"
echo "事件报告生成系统启动脚本"
echo "================================"
echo ""

# 检查是否在项目根目录
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 启动后端
echo "正在启动后端服务..."
cd backend

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "未找到虚拟环境，正在创建..."
    python3.12 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "警告: 未找到 .env 文件"
    echo "请复制 .env.example 并配置 API Key"
    exit 1
fi

# 启动后端（后台运行）
echo "启动 FastAPI 服务器 (端口 8000)..."
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "后端服务 PID: $BACKEND_PID"

cd ..

# 等待后端启动
echo "等待后端服务启动..."
sleep 3

# 启动前端
echo "正在启动前端服务..."
cd frontend

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "未找到 node_modules，正在安装依赖..."
    npm install
fi

# 启动前端（后台运行）
echo "启动 Vite 开发服务器 (端口 3000)..."
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端服务 PID: $FRONTEND_PID"

cd ..

echo ""
echo "================================"
echo "服务启动完成!"
echo "================================"
echo "后端服务: http://localhost:8000"
echo "前端服务: http://localhost:3000"
echo "API 文档: http://localhost:8000/docs"
echo ""
echo "后端 PID: $BACKEND_PID (日志: backend.log)"
echo "前端 PID: $FRONTEND_PID (日志: frontend.log)"
echo ""
echo "停止服务: ./stop.sh"
echo "================================"
