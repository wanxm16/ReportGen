#!/bin/bash

# EventReport 停止脚本

echo "正在停止事件报告生成系统..."

# 查找并停止 uvicorn 进程
BACKEND_PID=$(pgrep -f "uvicorn app.main:app")
if [ ! -z "$BACKEND_PID" ]; then
    echo "停止后端服务 (PID: $BACKEND_PID)..."
    kill $BACKEND_PID
else
    echo "未找到运行中的后端服务"
fi

# 查找并停止 vite 进程
FRONTEND_PID=$(pgrep -f "vite")
if [ ! -z "$FRONTEND_PID" ]; then
    echo "停止前端服务 (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID
else
    echo "未找到运行中的前端服务"
fi

echo "服务已停止"
