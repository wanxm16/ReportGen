"""Prompt management API endpoints"""

from fastapi import APIRouter, HTTPException
from typing import List
from ..models import (
    PromptTemplate,
    CreateTemplateRequest,
    UpdateTemplateRequest,
    ChapterType
)
from ..services.prompt_manager import PromptManager

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


@router.get("/templates", response_model=List[PromptTemplate])
async def get_all_templates():
    """Get all prompt templates

    Returns:
        List of all templates
    """
    try:
        all_templates = PromptManager.load_all_templates()
        result = []
        for chapter_templates in all_templates.values():
            result.extend(chapter_templates)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load templates: {str(e)}")


@router.get("/templates/chapter/{chapter}", response_model=List[PromptTemplate])
async def get_templates_by_chapter(chapter: ChapterType):
    """Get all templates for a specific chapter

    Args:
        chapter: Chapter identifier

    Returns:
        List of templates for the chapter
    """
    try:
        templates = PromptManager.get_templates_by_chapter(chapter.value)
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get templates: {str(e)}")


@router.get("/templates/{template_id}", response_model=PromptTemplate)
async def get_template_by_id(template_id: str):
    """Get a specific template by ID

    Args:
        template_id: Template ID

    Returns:
        Template details
    """
    try:
        template = PromptManager.get_template_by_id(template_id)
        if not template:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")
        return template
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get template: {str(e)}")


@router.post("/templates", response_model=PromptTemplate)
async def create_template(request: CreateTemplateRequest):
    """Create a new template

    Args:
        request: CreateTemplateRequest with template details

    Returns:
        Created template
    """
    try:
        template = PromptManager.create_template(
            chapter=request.chapter.value,
            name=request.name,
            system_prompt=request.system_prompt,
            user_prompt_template=request.user_prompt_template,
            is_default=request.is_default or False
        )
        return template
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")


@router.put("/templates/{template_id}", response_model=PromptTemplate)
async def update_template(template_id: str, request: UpdateTemplateRequest):
    """Update an existing template

    Args:
        template_id: Template ID
        request: UpdateTemplateRequest with fields to update

    Returns:
        Updated template
    """
    try:
        template = PromptManager.update_template(
            template_id=template_id,
            name=request.name,
            system_prompt=request.system_prompt,
            user_prompt_template=request.user_prompt_template,
            is_default=request.is_default
        )
        if not template:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")
        return template
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update template: {str(e)}")


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    """Delete a template

    Args:
        template_id: Template ID

    Returns:
        Success response
    """
    try:
        success = PromptManager.delete_template(template_id)
        if not success:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete template (not found or is the last template)"
            )
        return {"success": True, "message": "Template deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")
