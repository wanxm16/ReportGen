"""Prompt template management service"""

import json
import uuid
from pathlib import Path
from typing import Dict, Optional, List
from datetime import datetime

PROMPTS_DIR = Path("prompts")
TEMPLATES_FILE = PROMPTS_DIR / "templates.json"

# Default templates for each chapter
DEFAULT_TEMPLATES = {
    "chapter_1": [
        {
            "id": "default_chapter_1",
            "name": "默认模板 - 全区社会治理基本情况",
            "chapter": "chapter_1",
            "system_prompt": "你是一位专业的社会治理数据分析师，擅长编写结构化的报告。",
            "user_prompt_template": """请根据以下数据生成【全区社会治理基本情况】章节的报告内容。

# 数据
{data_summary}

# 要求
1. 对本月的治理情况进行一个总体的概括说明
2. 生成"全区各级事件上报及办结情况汇总表"（必须包含：分类、统计指标、一级、二级、三级、四级、五级、合计、办结率等列）

# 输出格式
使用Markdown格式，包含标题、段落和表格。表格必须使用标准的Markdown表格格式。

{examples_text}""",
            "is_default": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    ],
    "chapter_2": [
        {
            "id": "default_chapter_2",
            "name": "默认模板 - 高频问题分析",
            "chapter": "chapter_2",
            "system_prompt": "你是一位专业的社会治理数据分析师，擅长编写结构化的报告。",
            "user_prompt_template": """请根据以下数据生成【高频社会治理问题隐患分析研判】章节的报告内容。

# 数据
{data_summary}

# 要求
1. 分析高频问题的类型、分布和趋势
2. 识别潜在的风险隐患
3. 提供针对性的建议

# 输出格式
使用Markdown格式，包含标题、段落和必要的表格。

{examples_text}""",
            "is_default": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    ]
}


class PromptManager:
    """Manage prompt templates"""

    @staticmethod
    def _ensure_dir():
        """Ensure prompts directory exists"""
        PROMPTS_DIR.mkdir(exist_ok=True)

    @staticmethod
    def load_all_templates() -> Dict[str, List[Dict]]:
        """Load all prompt templates from file

        Returns:
            Dictionary mapping chapter to list of templates
        """
        PromptManager._ensure_dir()

        if not TEMPLATES_FILE.exists():
            # Initialize with default templates
            PromptManager._save_all_templates(DEFAULT_TEMPLATES)
            return DEFAULT_TEMPLATES

        try:
            with open(TEMPLATES_FILE, 'r', encoding='utf-8') as f:
                templates = json.load(f)
                # Ensure all chapters have at least default template
                for chapter, defaults in DEFAULT_TEMPLATES.items():
                    if chapter not in templates or not templates[chapter]:
                        templates[chapter] = defaults
                return templates
        except Exception as e:
            print(f"Warning: Failed to load templates: {e}")
            return DEFAULT_TEMPLATES

    @staticmethod
    def _save_all_templates(templates: Dict[str, List[Dict]]) -> None:
        """Save all templates to file

        Args:
            templates: Dictionary mapping chapter to list of templates
        """
        PromptManager._ensure_dir()

        try:
            with open(TEMPLATES_FILE, 'w', encoding='utf-8') as f:
                json.dump(templates, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error: Failed to save templates: {e}")
            raise

    @staticmethod
    def get_templates_by_chapter(chapter: str) -> List[Dict]:
        """Get all templates for a specific chapter

        Args:
            chapter: Chapter identifier (e.g., 'chapter_1')

        Returns:
            List of template dictionaries
        """
        templates = PromptManager.load_all_templates()
        return templates.get(chapter, [])

    @staticmethod
    def get_template_by_id(template_id: str) -> Optional[Dict]:
        """Get a specific template by ID

        Args:
            template_id: Template ID

        Returns:
            Template dictionary or None
        """
        templates = PromptManager.load_all_templates()
        for chapter_templates in templates.values():
            for template in chapter_templates:
                if template['id'] == template_id:
                    return template
        return None

    @staticmethod
    def get_default_template(chapter: str) -> Optional[Dict]:
        """Get the default template for a chapter

        Args:
            chapter: Chapter identifier

        Returns:
            Default template or first template
        """
        templates = PromptManager.get_templates_by_chapter(chapter)
        if not templates:
            return None

        # Find template marked as default
        for template in templates:
            if template.get('is_default'):
                return template

        # Return first template if no default marked
        return templates[0]

    @staticmethod
    def create_template(
        chapter: str,
        name: str,
        system_prompt: str,
        user_prompt_template: str,
        is_default: bool = False
    ) -> Dict:
        """Create a new template

        Args:
            chapter: Chapter identifier
            name: Template name
            system_prompt: System prompt text
            user_prompt_template: User prompt template
            is_default: Whether this is the default template

        Returns:
            Created template
        """
        templates = PromptManager.load_all_templates()

        # Generate unique ID
        template_id = str(uuid.uuid4())

        # If setting as default, unmark other defaults
        if is_default and chapter in templates:
            for template in templates[chapter]:
                template['is_default'] = False

        # Create new template
        new_template = {
            "id": template_id,
            "name": name,
            "chapter": chapter,
            "system_prompt": system_prompt,
            "user_prompt_template": user_prompt_template,
            "is_default": is_default,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        # Add to templates
        if chapter not in templates:
            templates[chapter] = []
        templates[chapter].append(new_template)

        PromptManager._save_all_templates(templates)
        return new_template

    @staticmethod
    def update_template(
        template_id: str,
        name: Optional[str] = None,
        system_prompt: Optional[str] = None,
        user_prompt_template: Optional[str] = None,
        is_default: Optional[bool] = None
    ) -> Optional[Dict]:
        """Update an existing template

        Args:
            template_id: Template ID
            name: New name (optional)
            system_prompt: New system prompt (optional)
            user_prompt_template: New user prompt template (optional)
            is_default: Whether this is the default (optional)

        Returns:
            Updated template or None if not found
        """
        templates = PromptManager.load_all_templates()

        # Find and update template
        for chapter, chapter_templates in templates.items():
            for i, template in enumerate(chapter_templates):
                if template['id'] == template_id:
                    # Update fields
                    if name is not None:
                        template['name'] = name
                    if system_prompt is not None:
                        template['system_prompt'] = system_prompt
                    if user_prompt_template is not None:
                        template['user_prompt_template'] = user_prompt_template
                    if is_default is not None:
                        if is_default:
                            # Unmark other defaults in same chapter
                            for t in chapter_templates:
                                t['is_default'] = False
                        template['is_default'] = is_default

                    template['updated_at'] = datetime.now().isoformat()

                    PromptManager._save_all_templates(templates)
                    return template

        return None

    @staticmethod
    def delete_template(template_id: str) -> bool:
        """Delete a template

        Args:
            template_id: Template ID

        Returns:
            True if deleted, False if not found or is default
        """
        templates = PromptManager.load_all_templates()

        for chapter, chapter_templates in templates.items():
            for i, template in enumerate(chapter_templates):
                if template['id'] == template_id:
                    # Don't allow deleting the last template
                    if len(chapter_templates) == 1:
                        return False

                    # Remove template
                    chapter_templates.pop(i)

                    # If deleted template was default, mark first as default
                    if template.get('is_default') and chapter_templates:
                        chapter_templates[0]['is_default'] = True

                    PromptManager._save_all_templates(templates)
                    return True

        return False
