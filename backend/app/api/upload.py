"""File upload API endpoints"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from ..models import UploadResponse
from ..utils import save_upload_file
from ..services.example_manager import ExampleManager
from pathlib import Path
from typing import List, Dict

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = "uploads"
EXAMPLES_DIR = "examples"


@router.post("/data", response_model=UploadResponse)
async def upload_data_file(file: UploadFile = File(...)):
    """Upload CSV data file

    Args:
        file: CSV file containing event data

    Returns:
        UploadResponse with file_id and filename
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    try:
        # Read file content
        content = await file.read()

        # Save file
        file_id, file_path = save_upload_file(content, file.filename, UPLOAD_DIR)

        return UploadResponse(
            success=True,
            file_id=file_id,
            filename=file.filename
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.post("/example", response_model=UploadResponse)
async def upload_example_file(file: UploadFile = File(...)):
    """Upload example file (Markdown or Word)

    Args:
        file: Markdown or Word file containing example report

    Returns:
        UploadResponse with file_id and filename
    """
    # Validate file type
    allowed_extensions = ['.md', '.markdown', '.docx', '.doc']
    if not any(file.filename.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Only Markdown (.md, .markdown) and Word (.docx, .doc) files are allowed"
        )

    try:
        # Read file content
        content = await file.read()

        # Save file
        file_id, file_path = save_upload_file(content, file.filename, EXAMPLES_DIR)

        # Add to index for persistence
        ExampleManager.add_example(file_id, file.filename)

        return UploadResponse(
            success=True,
            file_id=file_id,
            filename=file.filename
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/examples")
async def get_all_examples() -> List[Dict[str, str]]:
    """Get all uploaded example files

    Returns:
        List of example file metadata
    """
    try:
        return ExampleManager.get_all_examples()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get examples: {str(e)}")


@router.delete("/example/{file_id}")
async def delete_example_file(file_id: str):
    """Delete an example file

    Args:
        file_id: ID of the file to delete

    Returns:
        Success response
    """
    try:
        ExampleManager.remove_example(file_id)
        return {"success": True, "message": "Example file deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
