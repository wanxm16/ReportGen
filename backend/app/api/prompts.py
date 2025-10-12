"""Prompt management API endpoints"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from ..models import (
    PromptTemplate,
    CreateTemplateRequest,
    UpdateTemplateRequest,
    ChapterType
)
from ..services.prompt_manager import PromptManager
from ..services.prompt_generator import PromptGenerator
from ..constants import ALL_CHAPTERS, CHAPTER_DISPLAY_NAMES

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


class GeneratePromptRequest(BaseModel):
    """Request model for generating prompt from examples"""
    chapter: ChapterType
    example_file_ids: Optional[List[str]] = None  # If None, use all available examples


class GenerateAllChaptersRequest(BaseModel):
    """Request model for generating all chapter prompts in batch"""
    example_file_ids: Optional[List[str]] = None


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


@router.post("/generate-from-examples")
async def generate_prompt_from_examples(request: GeneratePromptRequest):
    """Generate prompt template by analyzing example documents

    This endpoint uses AI to analyze example documents and automatically
    generate a prompt template that matches the style and structure of
    those examples.

    Args:
        request: GeneratePromptRequest with chapter and optional example IDs

    Returns:
        Generated prompt template with system_prompt and user_prompt_template
    """
    try:
        generator = PromptGenerator()

        # If no specific examples provided, use all available examples
        if not request.example_file_ids:
            print("[API] No example IDs provided, using all available examples")
            result = generator.generate_from_all_examples(
                chapter_type=request.chapter.value
            )
        else:
            print(f"[API] Generating prompt from {len(request.example_file_ids)} example(s)")
            result = generator.generate_from_examples(
                example_file_ids=request.example_file_ids,
                chapter_type=request.chapter.value
            )

        return {
            "success": True,
            "system_prompt": result["system_prompt"],
            "user_prompt_template": result["user_prompt_template"],
            "analyzed_examples": result["analyzed_examples"],
            "chapter_type": result["chapter_type"]
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[API] Error generating prompt: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate prompt: {str(e)}"
        )


@router.post("/generate-all-chapters")
async def generate_all_chapters_prompts(request: Optional[GenerateAllChaptersRequest] = None):
    """Generate prompt templates for all chapters sequentially

    This endpoint analyzes example documents and generates prompts for all chapters
    in sequence (chapter_1, chapter_2, etc.). Each chapter is processed one at a time.

    Args:
        example_file_ids: Optional list of example file IDs to use

    Returns:
        Results for each chapter generation
    """
    try:
        generator = PromptGenerator()

        # Define all chapters in order
        chapters = ALL_CHAPTERS

        results = []

        print(f"[API] Starting batch generation for {len(chapters)} chapters")

        example_file_ids = request.example_file_ids if request and request.example_file_ids else None

        for chapter in chapters:
            print(f"[API] Generating prompt for {chapter}...")

            try:
                # Generate prompt for this chapter
                if not example_file_ids:
                    result = generator.generate_from_all_examples(chapter_type=chapter)
                else:
                    result = generator.generate_from_examples(
                        example_file_ids=example_file_ids,
                        chapter_type=chapter
                    )

                # Save the generated template
                from ..services.prompt_manager import PromptManager
                template = PromptManager.create_template(
                    chapter=chapter,
                    name=f"AI 批量生成 - {CHAPTER_DISPLAY_NAMES.get(chapter, chapter)}",
                    system_prompt=result["system_prompt"],
                    user_prompt_template=result["user_prompt_template"],
                    is_default=False
                )

                results.append({
                    "chapter": chapter,
                    "chapter_name": CHAPTER_DISPLAY_NAMES.get(chapter, chapter),
                    "success": True,
                    "template_id": template["id"],
                    "analyzed_examples": result["analyzed_examples"]
                })

                print(f"[API] Successfully generated and saved template for {chapter}")

            except Exception as e:
                print(f"[API] Error generating {chapter}: {type(e).__name__}: {str(e)}")
                results.append({
                    "chapter": chapter,
                    "chapter_name": CHAPTER_DISPLAY_NAMES.get(chapter, chapter),
                    "success": False,
                    "error": str(e)
                })

        # Count successes
        success_count = sum(1 for r in results if r["success"])

        return {
            "success": True,
            "total_chapters": len(chapters),
            "successful": success_count,
            "failed": len(chapters) - success_count,
            "results": results
        }

    except Exception as e:
        print(f"[API] Error in batch generation: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch generation failed: {str(e)}"
        )
