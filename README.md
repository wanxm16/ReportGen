# 事件报告生成系统 (EventReport)

基于 AI 的社会治理事件月报自动生成系统，通过 LLM 根据数据和模板自动生成规范的月度报告。

## 功能特性

- 📊 **灵活数据输入**：支持粘贴 CSV 或 Markdown 表格格式的数据
- 📝 **示例文档管理**：全局上传和管理历史月报示例（支持 Markdown 和 Word 格式）
- 🤖 **AI 智能生成**：使用 DeepSeek LLM 自动生成报告章节
- ✏️ **富文本编辑**：支持在线编辑生成的报告内容
- 📄 **Word 导出**：一键导出为 Word 文档
- 🔄 **章节独立**：每个章节可独立生成和编辑
- 📁 **示例全局共享**：上传的示例文档对所有章节生效

## 技术栈

### 后端
- Python 3.12
- FastAPI (Web 框架)
- DeepSeek API (LLM)
- Pandas (数据处理)
- python-docx (Word 文档生成)

### 前端
- React 18
- TypeScript
- Ant Design (UI 组件)
- Vite (构建工具)

## 快速开始

### 前置要求

- Python 3.12+
- Node.js 18+
- DeepSeek API Key

### 安装和运行

1. **克隆项目**
```bash
cd EventReport
```

2. **后端设置**
```bash
cd backend

# 创建虚拟环境
python3.12 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 DeepSeek API Key

# 启动后端服务
uvicorn app.main:app --reload --port 8000
```

后端服务将运行在 http://localhost:8000

3. **前端设置**
```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将运行在 http://localhost:3000

### 使用流程

1. **管理示例文档（可选）**
   - 进入"示例文档管理"页面
   - 上传历史月报示例（支持 .md, .markdown, .docx, .doc 格式）
   - 示例文档全局共享，对所有章节生效

2. **生成报告**
   - 进入"报告生成"页面
   - 选择要生成的章节（第一章或第二章）
   - 在左侧输入框粘贴数据（CSV 或 Markdown 表格格式）
   - 点击"生成报告"按钮，系统将调用 LLM 生成报告内容

3. **编辑内容**
   - 点击"编辑"按钮可以修改生成的内容
   - 编辑完成后点击"保存"

4. **导出文档**
   - 点击"导出 Word"按钮，下载 Word 格式的报告

## 项目结构

```
EventReport/
├── backend/                 # 后端服务
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── services/       # 业务逻辑
│   │   ├── models/         # 数据模型
│   │   ├── prompts/        # Prompt 模板
│   │   └── utils/          # 工具函数
│   ├── uploads/            # 上传文件存储
│   ├── examples/           # 示例文档存储
│   └── requirements.txt
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── services/       # API 调用
│   │   └── App.tsx         # 主应用
│   └── package.json
└── README.md
```

## API 文档

启动后端服务后，访问 http://localhost:8000/docs 查看完整的 API 文档。

### 主要 API 端点

- `POST /api/upload/example` - 上传示例文档（Markdown 或 Word）
- `POST /api/report/generate-with-text` - 根据文本数据生成报告章节
- `POST /api/report/export` - 导出为 Word 文档

## 配置说明

### 环境变量 (.env)

```env
DEEPSEEK_API_KEY=your-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

### 数据格式说明

**支持的数据格式：**

1. **CSV 格式**（直接粘贴）
```csv
事件ID,事件类型,等级,街镇
E001,城市管理,三级,街道A
E002,环境保护,二级,街道B
```

2. **Markdown 表格格式**（直接粘贴）
```markdown
| 事件ID | 事件类型 | 等级 | 街镇 |
|--------|---------|------|------|
| E001 | 城市管理 | 三级 | 街道A |
| E002 | 环境保护 | 二级 | 街道B |
```

**示例文档格式：**
- Markdown 格式（.md, .markdown）
- Word 格式（.docx, .doc）

系统会自动解析并提取内容，用于 LLM 学习语气风格和分析思路。

## 开发说明

### 后端开发

```bash
cd backend
source venv/bin/activate

# 启动开发服务器（自动重载）
uvicorn app.main:app --reload --port 8000
```

### 前端开发

```bash
cd frontend

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 注意事项

1. **API Key 安全**：不要将 `.env` 文件提交到 Git 仓库
2. **文件大小**：注意 CSV 文件大小，过大可能导致处理超时
3. **LLM 调用**：生成报告需要调用 DeepSeek API，请确保网络连接正常

## 许可证

MIT License
