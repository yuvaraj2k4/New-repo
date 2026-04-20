import asyncio
import os
import boto3
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env")

DATABASE_URL = os.getenv("DATABASE_URL")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "devpilot")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

TABLES_TO_CLEAR = [
    "test_data",
    "test_cases",
    "uploaded_files",
    "documents"
]

async def clear_database():
    print(f"Connecting to database: {DATABASE_URL}")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        for table in TABLES_TO_CLEAR:
            print(f"Clearing table: {table}")
            try:
                await conn.execute(text(f"DELETE FROM {table};"))
                print(f"Successfully cleared {table}")
            except Exception as e:
                print(f"Error clearing {table}: {e}")
                
    await engine.dispose()

def clear_minio():
    print(f"Connecting to MinIO: {MINIO_ENDPOINT}")
    s3 = boto3.resource(
        's3',
        endpoint_url=f"http{'s' if MINIO_SECURE else ''}://{MINIO_ENDPOINT}",
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        config=boto3.session.Config(signature_version='s3v4')
    )
    
    bucket = s3.Bucket(MINIO_BUCKET)
    
    print(f"Clearing bucket: {MINIO_BUCKET}")
    try:
        bucket.objects.all().delete()
        print(f"Successfully cleared bucket {MINIO_BUCKET}")
    except Exception as e:
        print(f"Error clearing bucket: {e}")

async def main():
    print("WARNING: This will permanently delete all artifacts.")
    await clear_database()
    clear_minio()
    print("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(main())
