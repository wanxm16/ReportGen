from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class ChapterType(str, Enum):
    CHAPTER_1 = "chapter_1"  # 全区社会治理基本情况
    CHAPTER_2 = "chapter_2"  # 高频社会治理问题隐患分析研判


class GenerateReportRequest(BaseModel):
    chapter: ChapterType
    data_file_id: str
    example_files: Optional[List[str]] = []


class GenerateReportWithTextRequest(BaseModel):
    chapter: ChapterType
    data_text: str
    example_file_ids: Optional[List[str]] = []
    template_id: Optional[str] = None  # Optional template ID to use


class GenerateReportResponse(BaseModel):
    success: bool
    chapter: ChapterType
    content: str
    error: Optional[str] = None


class UploadResponse(BaseModel):
    success: bool
    file_id: str
    filename: str
    error: Optional[str] = None


class ExportRequest(BaseModel):
    content: str
    filename: str


class PromptTemplate(BaseModel):
    id: str
    name: str
    chapter: str
    system_prompt: str
    user_prompt_template: str
    is_default: bool
    created_at: str
    updated_at: str


class CreateTemplateRequest(BaseModel):
    chapter: ChapterType
    name: str
    system_prompt: str
    user_prompt_template: str
    is_default: Optional[bool] = False


class UpdateTemplateRequest(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    user_prompt_template: Optional[str] = None
    is_default: Optional[bool] = None
