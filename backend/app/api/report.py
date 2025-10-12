"""Report generation API endpoints"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from ..models import (
    GenerateReportRequest,
    GenerateReportWithTextRequest,
    GenerateReportResponse,
    ExportRequest
)
from ..services.report_generator import ReportGenerator
from ..utils import markdown_to_docx
from pathlib import Path
import tempfile
import os

router = APIRouter(prefix="/api/report", tags=["report"])

UPLOAD_DIR = "uploads"
EXAMPLES_DIR = "examples"


@router.post("/generate", response_model=GenerateReportResponse)
async def generate_report_chapter(request: GenerateReportRequest):
    """Generate a specific chapter of the report

    Args:
        request: GenerateReportRequest containing chapter type, data file ID, and optional example file IDs

    Returns:
        GenerateReportResponse with generated markdown content
    """
    try:
        # Construct file paths
        data_file_path = None
        for ext in ['.csv']:
            potential_path = Path(UPLOAD_DIR) / f"{request.data_file_id}{ext}"
            if potential_path.exists():
                data_file_path = str(potential_path)
                break

        if not data_file_path:
            raise HTTPException(status_code=404, detail=f"Data file not found: {request.data_file_id}")

        # Construct example file paths
        example_file_paths = []
        for file_id in request.example_files:
            for ext in ['.md', '.markdown', '.docx', '.doc']:
                potential_path = Path(EXAMPLES_DIR) / f"{file_id}{ext}"
                if potential_path.exists():
                    example_file_paths.append(str(potential_path))
                    break

        # Generate report chapter
        generator = ReportGenerator()
        content = generator.generate_chapter(
            chapter_type=request.chapter.value,
            data_file_path=data_file_path,
            example_file_paths=example_file_paths if example_file_paths else None
        )

        return GenerateReportResponse(
            success=True,
            chapter=request.chapter,
            content=content
        )

    except Exception as e:
        return GenerateReportResponse(
            success=False,
            chapter=request.chapter,
            content="",
            error=str(e)
        )


@router.post("/generate-with-text", response_model=GenerateReportResponse)
async def generate_report_chapter_with_text(request: GenerateReportWithTextRequest):
    """Generate a specific chapter from text data

    Args:
        request: GenerateReportWithTextRequest containing chapter type, data text, and optional example file IDs

    Returns:
        GenerateReportResponse with generated markdown content
    """
    try:
        print(f"[API] Received generate request for chapter: {request.chapter}")
        print(f"[API] Data text length: {len(request.data_text)}")
        print(f"[API] Example file IDs: {request.example_file_ids}")
        print(f"[API] Template ID: {request.template_id}")

        # Generate report chapter from text
        generator = ReportGenerator()
        content = generator.generate_chapter_with_text(
            chapter_type=request.chapter.value,
            data_text=request.data_text,
            example_file_ids=request.example_file_ids if request.example_file_ids else None,
            template_id=request.template_id
        )

        print(f"[API] Generated content length: {len(content)}")

        return GenerateReportResponse(
            success=True,
            chapter=request.chapter,
            content=content
        )

    except Exception as e:
        print(f"[API] Error generating report: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return GenerateReportResponse(
            success=False,
            chapter=request.chapter,
            content="",
            error=str(e)
        )


@router.post("/export")
async def export_to_word(request: ExportRequest):
    """Export markdown content to Word document

    Args:
        request: ExportRequest containing content and filename

    Returns:
        Word document file
    """
    try:
        # Create temporary file for the Word document
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp_file:
            tmp_path = tmp_file.name

        # Convert markdown to Word
        markdown_to_docx(request.content, tmp_path)

        # Return file response
        return FileResponse(
            path=tmp_path,
            filename=f"{request.filename}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            background=None  # File will be deleted after response
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export document: {str(e)}")
