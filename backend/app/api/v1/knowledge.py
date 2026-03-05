"""
API endpoints for managing Knowledge Base documents (upload, list, delete).
"""

import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_admin
from app.models.organization import Admin
from app.schemas.knowledge import KnowledgeDocumentOut, KnowledgeDocumentCreate
from app.crud.knowledge import (
    create_document_record,
    list_documents_by_org,
    get_document,
    update_document_status,
    delete_document_record
)
from app.services.rag_service import rag_service, RAGServiceError

router = APIRouter()
logger = logging.getLogger(__name__)


async def process_document_background(
    db: AsyncSession,
    doc_id: uuid.UUID,
    org_id: uuid.UUID,
    file_bytes: bytes
):
    """Background task to extract text, chunk, embed, and upload to Pinecone."""
    try:
        # We need a new thread/loop for this since it's running in background
        chunks_processed = await rag_service.process_pdf(file_bytes, str(doc_id), str(org_id))
        
        # Update status to ready
        await update_document_status(db, doc_id, "ready", None)
        logger.info(f"Background processing complete for doc {doc_id}. {chunks_processed} chunks.")
        
    except RAGServiceError as e:
        logger.error(f"RAG Processing failed for doc {doc_id}: {e}")
        await update_document_status(db, doc_id, "error", str(e))
    except Exception as e:
        logger.error(f"Unexpected error processing doc {doc_id}: {e}")
        await update_document_status(db, doc_id, "error", "An unexpected error occurred during processing.")


@router.post("/upload", response_model=KnowledgeDocumentOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_knowledge_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """
    Upload a PDF document to the knowledge base.
    The file is processed in the background (text extraction, chunking, embedding to Pinecone).
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    try:
        # Read file contents into memory
        file_bytes = await file.read()
        file_size = len(file_bytes)
        
        # 1. Create DB record (status = processing)
        create_data = KnowledgeDocumentCreate(
            filename=file.filename,
            file_size_bytes=file_size
        )
        doc = await create_document_record(db, admin.organization_id, create_data)
        
        # 2. Add background task to process the PDF
        background_tasks.add_task(
            process_document_background,
            db,
            doc.id,
            admin.organization_id,
            file_bytes
        )
        
        return doc
        
    except Exception as e:
        logger.error(f"Failed to initiate document upload: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document.")


@router.get("", response_model=List[KnowledgeDocumentOut])
async def list_knowledge_documents(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """List all knowledge base documents for the organization."""
    docs = await list_documents_by_org(db, admin.organization_id, skip=skip, limit=limit)
    return docs


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """
    Delete a document from the database AND remove its vectors from Pinecone.
    """
    doc = await get_document(db, doc_id, admin.organization_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        # 1. Try to delete vectors from Pinecone first
        # We do this synchronously or via threadpool to ensure they're gone
        rag_service.delete_document_vectors(str(doc_id), str(admin.organization_id))
        
        # 2. Delete from DB
        await delete_document_record(db, doc_id)
        
    except Exception as e:
        logger.error(f"Failed to delete document {doc_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document completely.")
