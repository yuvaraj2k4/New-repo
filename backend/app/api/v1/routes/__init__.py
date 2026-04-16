from fastapi import APIRouter

from app.api.v1.routes import auth, users, projects, documents, files, test_cases, test_data

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(test_cases.router, prefix="/test-cases", tags=["test-cases"])
api_router.include_router(test_data.router, prefix="/test-data", tags=["test-data"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
