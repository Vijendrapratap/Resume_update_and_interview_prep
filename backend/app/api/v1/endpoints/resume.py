"""
Resume Upload and Management Endpoints
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional
import uuid
from pathlib import Path
import logging

from app.core.config import settings
from app.services.resume.parser import ResumeParser, ResumeChunker
from app.schemas.resume import ResumeUploadResponse, ResumeDetails

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory storage (replace with database in production)
resume_storage = {}


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Upload a resume file for analysis.

    Supported formats: PDF, DOCX, DOC, TXT
    Max size: 10MB
    """
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )

    # Validate file size
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )

    # Generate unique ID and save file
    resume_id = str(uuid.uuid4())
    file_path = settings.UPLOAD_DIR / f"{resume_id}{file_ext}"

    try:
        with open(file_path, "wb") as f:
            f.write(contents)

        # Parse resume
        parser = ResumeParser()
        parsed_content = await parser.parse(file_path)

        # Create semantic chunks for RAG
        chunker = ResumeChunker(max_chunk_size=500, overlap=50)
        chunks = chunker.chunk_resume(parsed_content)

        # Store resume data with chunks
        resume_storage[resume_id] = {
            "id": resume_id,
            "filename": file.filename,
            "file_path": str(file_path),
            "file_type": file_ext,
            "text_content": parsed_content.get("text", ""),
            "sections": parsed_content.get("sections", {}),
            "contact_info": parsed_content.get("contact_info", {}),
            "chunks": chunks,  # RAG-ready semantic chunks
            "status": "uploaded"
        }

        logger.info(f"Resume uploaded successfully: {resume_id}")

        return ResumeUploadResponse(
            id=resume_id,
            filename=file.filename,
            status="uploaded",
            message="Resume uploaded successfully. Ready for analysis.",
            text_preview=parsed_content.get("text", "")[:500] + "..." if len(parsed_content.get("text", "")) > 500 else parsed_content.get("text", "")
        )

    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        # Clean up file if it was created
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing resume: {str(e)}"
        )


@router.get("/{resume_id}", response_model=ResumeDetails)
async def get_resume(resume_id: str):
    """Get resume details by ID"""
    if resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[resume_id]
    return ResumeDetails(**resume_data)


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str):
    """Delete a resume"""
    if resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[resume_id]

    # Delete file
    file_path = Path(resume_data["file_path"])
    if file_path.exists():
        file_path.unlink()

    # Remove from storage
    del resume_storage[resume_id]

    return {"message": "Resume deleted successfully"}


@router.get("/")
async def list_resumes():
    """List all uploaded resumes"""
    return {
        "resumes": [
            {
                "id": r["id"],
                "filename": r["filename"],
                "status": r["status"]
            }
            for r in resume_storage.values()
        ]
    }


@router.get("/{resume_id}/chunks")
async def get_resume_chunks(
    resume_id: str,
    chunk_type: Optional[str] = None
):
    """
    Get semantic chunks from a resume for RAG retrieval.

    Query params:
    - chunk_type: Filter by type (experience, project, skill, education, etc.)
    """
    if resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[resume_id]
    chunks = resume_data.get("chunks", [])

    # Filter by type if specified
    if chunk_type:
        chunks = [c for c in chunks if c["type"] == chunk_type]

    return {
        "resume_id": resume_id,
        "total_chunks": len(resume_data.get("chunks", [])),
        "filtered_chunks": len(chunks),
        "chunks": chunks
    }


@router.get("/{resume_id}/context/{topic}")
async def get_context_for_topic(
    resume_id: str,
    topic: str
):
    """
    Get relevant resume context for a specific topic/question.

    This is used during interviews to retrieve relevant resume sections
    when verifying claims or generating follow-up questions.
    """
    if resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[resume_id]
    chunks = resume_data.get("chunks", [])

    if not chunks:
        # Fallback to full text search
        return {
            "resume_id": resume_id,
            "topic": topic,
            "context": resume_data.get("text_content", "")[:1000],
            "source": "full_text"
        }

    # Find relevant chunks
    chunker = ResumeChunker()
    relevant_chunk = chunker.get_chunk_for_topic(chunks, topic)

    if relevant_chunk:
        return {
            "resume_id": resume_id,
            "topic": topic,
            "context": relevant_chunk["content"],
            "chunk_type": relevant_chunk["type"],
            "metadata": relevant_chunk.get("metadata", {}),
            "source": "chunk"
        }

    # No relevant chunk found
    return {
        "resume_id": resume_id,
        "topic": topic,
        "context": None,
        "source": "not_found"
    }
