"""
CRUD operations for KnowledgeDocument
"""

import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.knowledge import KnowledgeDocument
from app.schemas.knowledge import KnowledgeDocumentCreate


async def create_document_record(
    db: AsyncSession, org_id: uuid.UUID, data: KnowledgeDocumentCreate
) -> KnowledgeDocument:
    doc = KnowledgeDocument(
        organization_id=org_id,
        filename=data.filename,
        file_size_bytes=data.file_size_bytes,
        status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def list_documents_by_org(
    db: AsyncSession, org_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> List[KnowledgeDocument]:
    result = await db.execute(
        select(KnowledgeDocument)
        .where(KnowledgeDocument.organization_id == org_id)
        .order_by(KnowledgeDocument.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


async def get_document(db: AsyncSession, doc_id: uuid.UUID, org_id: uuid.UUID) -> Optional[KnowledgeDocument]:
    result = await db.execute(
        select(KnowledgeDocument)
        .where(KnowledgeDocument.id == doc_id)
        .where(KnowledgeDocument.organization_id == org_id)
    )
    return result.scalar_one_or_none()


async def update_document_status(
    db: AsyncSession, doc_id: uuid.UUID, status: str, error_message: Optional[str] = None
) -> None:
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if doc:
        doc.status = status
        doc.error_message = error_message
        await db.commit()


async def delete_document_record(db: AsyncSession, doc_id: uuid.UUID) -> None:
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if doc:
        await db.delete(doc)
        await db.commit()
