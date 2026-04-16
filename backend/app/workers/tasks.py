import asyncio
import logging
from uuid import UUID

from app.workers.celery_app import celery_app
from app.services.ai_service import AIService
from app.services.document_service import DocumentService
from app.services.test_case_service import TestCaseService
from app.services.test_data_service import TestDataService
from app.schemas.test_case import TestCaseCreate, TestCaseSource, TestType
from app.schemas.test_data import TestDataCreate
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

def _run_async(coroutine):
    """
    Helper to run async code in a sync Celery task properly.
    Uses new_event_loop for thread safety in Celery worker context.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coroutine)
    finally:
        loop.close()

@celery_app.task(bind=True)
def generate_brd_task(self, document_id: str, context_text: str):
    ai_service = AIService()
    brd_content = ai_service.generate_brd(context_text)
    
    async def update_doc():
        async with AsyncSessionLocal() as session:
            doc_service = DocumentService(session)
            await doc_service.update_document_content(UUID(document_id), brd_content)
    
    _run_async(update_doc())
    return brd_content

@celery_app.task(bind=True)
def generate_frs_task(self, document_id: str, context_text: str):
    ai_service = AIService()
    frs_content = ai_service.generate_frs(context_text)

    async def update_doc():
        async with AsyncSessionLocal() as session:
            doc_service = DocumentService(session)
            await doc_service.update_document_content(UUID(document_id), frs_content)

    _run_async(update_doc())
    return frs_content

@celery_app.task(bind=True)
def generate_prs_task(self, document_id: str, context_text: str):
    ai_service = AIService()
    prs_content = ai_service.generate_prs(context_text)

    async def update_doc():
        async with AsyncSessionLocal() as session:
            doc_service = DocumentService(session)
            await doc_service.update_document_content(UUID(document_id), prs_content)

    _run_async(update_doc())
    return prs_content


@celery_app.task(bind=True)
def generate_test_case_doc_task(self, document_id: str, context_text: str):
    ai_service = AIService()
    tc_content = ai_service.generate_test_cases_doc(context_text)

    async def update_doc():
        async with AsyncSessionLocal() as session:
            doc_service = DocumentService(session)
            await doc_service.update_document_content(UUID(document_id), tc_content)

    _run_async(update_doc())
    return tc_content

@celery_app.task(bind=True)
def generate_test_data_doc_task(self, document_id: str, context_text: str):
    ai_service = AIService()
    td_content = ai_service.generate_test_data_doc(context_text)

    async def update_doc():
        async with AsyncSessionLocal() as session:
            doc_service = DocumentService(session)
            await doc_service.update_document_content(UUID(document_id), td_content)

    _run_async(update_doc())
    return td_content


@celery_app.task(bind=True)
def generate_test_cases_task(self, document_id: str, brd_text: str, project_id: str, org_id: str, created_by: str):

    ai_service = AIService()
    # 1. Generate JSON test cases from BRD text
    tc_list = ai_service.generate_test_cases(brd_text)

    async def save_test_cases():
        async with AsyncSessionLocal() as session:
            tc_service = TestCaseService(session)
            success_count = 0
            error_count = 0

            for tc_json in tc_list:
                try:
                    # Skip validation error entries
                    if tc_json.get("module") in ["Parsing Error", "Validation Error"]:
                        logger.warning(f"Skipping invalid test case: {tc_json.get('description', 'Unknown error')}")
                        error_count += 1
                        continue

                    obj_in = TestCaseCreate(
                        title=tc_json.get("module", "General"),
                        source=TestCaseSource.brd,
                        test_type=TestType.system,
                        content=tc_json,
                        document_id=UUID(document_id)
                    )
                    await tc_service.create_test_case(UUID(org_id), UUID(project_id), UUID(created_by), obj_in)
                    success_count += 1
                except Exception as e:
                    error_count += 1
                    logger.error(f"Failed to save test case: {str(e)}", exc_info=True)

            return {"success": success_count, "errors": error_count}

    result = _run_async(save_test_cases())
    return {"status": "success", "count": len(tc_list), "saved": result["success"], "errors": result["errors"]}

@celery_app.task(bind=True)
def generate_test_data_task(self, test_cases_json_str: str, project_id: str, org_id: str, created_by: str, test_case_id: str):
    ai_service = AIService()
    td_list = ai_service.generate_test_data(test_cases_json_str)

    async def save_test_data():
        async with AsyncSessionLocal() as session:
            td_service = TestDataService(session)

            try:
                # Check if validation failed
                if any(td.get("parameter_name") in ["ParsingError", "ValidationError"] for td in td_list):
                    logger.warning(f"Test data generation encountered validation errors for test_case_id: {test_case_id}")

                obj_in = TestDataCreate(
                    content=td_list,
                    test_case_id=UUID(test_case_id)
                )
                await td_service.create_test_data(UUID(org_id), UUID(project_id), UUID(created_by), obj_in)
                return {"success": True, "count": len(td_list)}
            except Exception as e:
                logger.error(f"Failed to save test data: {str(e)}", exc_info=True)
                return {"success": False, "error": str(e)}

    result = _run_async(save_test_data())
    return {"status": "success", "count": len(td_list), "saved": result["success"]}
