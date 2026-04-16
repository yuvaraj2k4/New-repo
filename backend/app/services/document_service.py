from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException
from uuid import UUID

from app.models.document import Document
from app.schemas.document import DocumentCreate

class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, doc_id: UUID, project_id: UUID, org_id: UUID) -> Document:
        stmt = select(Document).where(
            and_(
                Document.id == doc_id,
                Document.project_id == project_id,
                Document.org_id == org_id
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_project_documents(self, project_id: UUID, org_id: UUID):
        stmt = select(Document).where(
            and_(
                Document.project_id == project_id,
                Document.org_id == org_id
            )
        ).order_by(Document.created_at.desc())
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_document(self, org_id: UUID, project_id: UUID, created_by: UUID, obj_in: DocumentCreate) -> Document:
        db_obj = Document(
            org_id=org_id,
            project_id=project_id,
            created_by=created_by,
            title=obj_in.title,
            doc_type=obj_in.doc_type,
            version=obj_in.version,
            content=obj_in.content,
            file_path=obj_in.file_path
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def update_document_content(self, doc_id: UUID, content: str, file_path: str = None) -> Document:
        stmt = select(Document).where(Document.id == doc_id)
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc:
            doc.content = content
            if file_path:
                doc.file_path = file_path
            await self.db.commit()
            await self.db.refresh(doc)
        return doc

    async def delete_document(self, doc_id: UUID, project_id: UUID, org_id: UUID) -> bool:
        stmt = select(Document).where(
            and_(
                Document.id == doc_id,
                Document.project_id == project_id,
                Document.org_id == org_id
            )
        )
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        
        if not doc:
            return False
            
        await self.db.delete(doc)
        await self.db.commit()
        return True
