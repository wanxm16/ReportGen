# 事件报告生成系统 (EventReport)

基于 AI 的社会治理事件月报自动生成系统，通过 LLM 根据数据、示例文档和 Prompt 模板自动生成规范的月度报告。

## 功能特性

- 📊 **灵活数据输入**：支持粘贴 CSV 或 Markdown 表格格式的数据
- 📝 **示例文档管理**：全局上传和管理历史月报示例（支持 Markdown 和 Word 格式）
- 🤖 **AI 智能生成**：使用 DeepSeek LLM 自动生成报告章节
- ✏️ **富文本编辑**：支持在线编辑生成的报告内容
- 📄 **Word 导出**：一键导出为 Word 文档
- 🔄 **章节独立 & 自动保存**：每个章节可独立生成、自动保存输入数据与生成结果
- 🧩 **Prompt 模板管理**：支持按章节定义/重新生成 Prompt，默认模板自动保持统一格式
- 🧹 **报告内容重置**：可一键清空当前项目全部章节的生成内容，输入数据将被保留
- 🛠️ **调试工具**：提供示例解析调试接口，帮助排查章节匹配与模板生成问题
- 📁 **多项目隔离**：支持新建项目、上传参考文档一键生成章节 Prompt；项目间数据互不影响
- 🖨 **导出样式统一**：导出的 Word 文档默认使用宋体 (SimSun) 12 号字体

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

1. **选择或创建项目**
   进入顶部项目选择框，选择默认项目或创建一个新项目。每个项目会独立保存章节数据、示例文档与 Prompt 模板。

2. **管理示例文档与 Prompt**
   在“示例文档管理”中上传 Markdown/Word 示例，或使用 Prompt 模板管理器批量生成/调整章节 Prompt。系统会自动保存新模板并维持默认模板在列表首位。

3. **准备数据并生成章节**
   在“报告生成”页面，粘贴 CSV 或 Markdown 表格数据，选择章节并点击“生成报告”。可以指定模板和参考示例以获得更贴合需求的输出。

4. **查看、编辑与保存**
   生成内容可直接在富文本编辑器中调整，变更会自动保存。可随时切换章节或预览整份报告。

5. **导出或重置内容**
   使用“预览整份报告”和“导出 Word”导出成果，或通过“清空生成内容”按钮一键清空当前项目所有章节的生成稿，输入数据不会被删除。

## 项目结构

```
EventReport/
├── backend/                 # 后端服务
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── services/       # 业务逻辑（Prompt/项目/报告生成等）
│   │   ├── models/         # 数据模型
│   │   ├── prompts/        # Prompt 模板
│   │   └── utils/          # 工具函数
│   ├── projects/           # 每个项目的数据、模板、示例文档
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

**Projects**
- `GET /api/projects`：列出项目；`POST /api/projects`：创建新项目
- `GET /api/projects/{project_id}/chapters`：获取章节配置；`GET|POST /api/projects/{project_id}/chapters/{chapter_id}/data`：读取与保存章节数据
- `POST /api/projects/{project_id}/clear-generated`：清空项目中所有章节的生成内容
- `POST /api/projects/{project_id}/seed`：上传示例文档并自动生成章节 Prompt（项目初始化）

**Upload**
- `POST /api/upload/data`：上传 CSV 数据文件
- `POST /api/upload/example`：上传示例文档（Markdown/Word）
- `GET /api/upload/examples` / `DELETE /api/upload/example/{file_id}`：查询与删除示例文档

**Prompts**
- `GET /api/prompts/templates`：获取项目模板列表（支持章节过滤/单个模板）
- `POST /api/prompts/templates`：创建模板；`PUT|DELETE /api/prompts/templates/{template_id}`：更新或删除模板
- `POST /api/prompts/generate-from-examples`：根据示例文档生成单个章节 Prompt
- `POST /api/prompts/generate-all-chapters`：批量生成全部章节 Prompt
- `GET /api/prompts/debug/parse-example/{example_id}`：调试示例文档章节解析结果

**Report**
- `POST /api/report/generate-with-text`：根据粘贴的文本数据生成章节内容
- `POST /api/report/generate`：基于上传的数据文件生成章节
- `POST /api/report/export`：将 Markdown 内容导出为 Word 文档

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

## 维护工具

- `backend/fix_duplicate_chapters.py`：扫描 `backend/projects/` 下已存在的项目，自动清理示例解析产生的重复章节标题，并为原始文件生成备份。

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
2. **文件大小**：注意 CSV/示例文档大小，过大可能导致处理超时
3. **LLM 调用**：生成报告需要调用 DeepSeek API，请确保网络连接正常
4. **项目目录**：所有可写数据保存在 `backend/projects/` 下（示例、上传数据、Prompt 模板、章节内容等）。若部署在容器/服务器，请确保该目录可写并定期备份。

## 许可证

MIT License
