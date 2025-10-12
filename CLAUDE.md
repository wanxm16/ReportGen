# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EventReport is an AI-powered social governance event report generation system. It uses DeepSeek LLM to automatically generate monthly reports based on CSV data and template specifications.

## Tech Stack

**Backend:**
- Python 3.12 + FastAPI
- DeepSeek API (LLM)
- Pandas (data processing)
- python-docx (Word export)

**Frontend:**
- React 18 + TypeScript
- Ant Design
- Vite

## Development Commands

### Backend

```bash
cd backend

# Create virtual environment (first time only)
python3.12 -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload --port 8000

# API docs available at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev  # Runs on http://localhost:3000

# Build for production
npm run build
```

### Quick Start

```bash
# Start both backend and frontend
./start.sh

# Stop all services
./stop.sh
```

## Architecture

### Backend Structure

```
backend/app/
├── api/              # API routes (upload, report generation)
├── services/         # Business logic
│   ├── llm_service.py        # DeepSeek API integration
│   ├── data_processor.py     # CSV processing
│   └── report_generator.py   # Report generation orchestration
├── prompts/          # LLM prompt templates
├── models/           # Pydantic models
└── utils/            # Utility functions (file handling, docx export)
```

### Key Workflows

1. **File Upload**: CSV data + optional example markdown files → stored with unique IDs
2. **Report Generation**:
   - Read CSV → Process into data summary
   - Load example documents (if any) for style reference
   - Get chapter-specific prompt from `prompts/templates.py`
   - Call DeepSeek API → return Markdown
3. **Edit & Export**: User edits in frontend → export to Word via python-docx

### Prompt Engineering

- System prompt: Sets role as social governance analysis expert
- Chapter-specific user prompts in `backend/app/prompts/templates.py`
- Each chapter has dedicated template with output format requirements
- Temperature set to 0.3 for consistent, factual output

### Frontend Components

- `FileUpload.tsx`: CSV and example file upload
- `ReportEditor.tsx`: Markdown preview with edit mode
- `App.tsx`: Main orchestration with tabs for Chapter 1 and Chapter 2

## Important Notes

- DeepSeek API key must be set in `backend/.env`
- CSV structure is flexible - system auto-analyzes columns
- Each chapter can be generated independently
- Generated content is editable before export
