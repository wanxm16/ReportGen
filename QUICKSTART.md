# 快速开始指南

## 第一次运行

### 1. 后端设置

```bash
cd backend

# 创建 Python 虚拟环境
python3.12 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # macOS/Linux
# Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
# 编辑 .env 文件，确保 API Key 正确
```

### 2. 前端设置

```bash
cd frontend

# 安装依赖
npm install
```

### 3. 启动服务

**方式一：使用启动脚本（推荐）**

```bash
# 在项目根目录
./start.sh
```

**方式二：手动启动**

终端 1 - 启动后端：
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

终端 2 - 启动前端：
```bash
cd frontend
npm run dev
```

### 4. 访问应用

- 前端应用: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 测试系统

项目提供了示例文件用于测试：

1. **上传数据文件**
   - 使用 `sample_data.csv` 作为测试数据

2. **上传示例文档（可选）**
   - 使用 `sample_example.md` 作为语气风格参考

3. **生成报告**
   - 选择"第一章"或"第二章"
   - 点击"生成"按钮

4. **编辑和导出**
   - 点击"编辑"修改内容
   - 点击"导出 Word"下载文档

## 常见问题

### 后端启动失败

**问题**: `ModuleNotFoundError`
**解决**: 确保已激活虚拟环境并安装了所有依赖

```bash
source venv/bin/activate
pip install -r requirements.txt
```

**问题**: `DEEPSEEK_API_KEY not found`
**解决**: 检查 `backend/.env` 文件是否存在并包含正确的 API Key

### 前端启动失败

**问题**: `npm: command not found`
**解决**: 安装 Node.js 18+ 版本

**问题**: 依赖安装失败
**解决**: 清除缓存重新安装

```bash
rm -rf node_modules package-lock.json
npm install
```

### API 调用失败

**问题**: CORS 错误
**解决**: 确保后端服务运行在 8000 端口，前端在 3000 端口

**问题**: 连接超时
**解决**: 检查网络连接，确保可以访问 DeepSeek API

### 生成报告时出错

**问题**: "信息不足" 错误
**解决**:
- 检查 CSV 文件格式是否正确
- 确保 CSV 包含足够的数据字段
- 查看后端日志了解具体错误信息

## 停止服务

```bash
# 如果使用启动脚本
./stop.sh

# 如果手动启动，在各终端按 Ctrl+C
```

## 下一步

- 准备实际的事件数据 CSV
- 准备历史月报作为示例（Markdown 格式）
- 根据实际需求调整 Prompt 模板（`backend/app/prompts/templates.py`）
- 测试生成的报告质量并优化 Prompt
