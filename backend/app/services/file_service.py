import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
import uuid

from app.core.config import settings

class FileService:
    def __init__(self):
        # Configure Boto3 client for MinIO/S3
        self.s3_client = boto3.client(
            's3',
            endpoint_url=f"http{'s' if settings.MINIO_SECURE else ''}://{settings.MINIO_ENDPOINT}",
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name="us-east-1" # dummy region required by boto3
        )
        self.bucket = settings.MINIO_BUCKET
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            self.s3_client.head_bucket(Bucket=self.bucket)
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                self.s3_client.create_bucket(Bucket=self.bucket)
            else:
                pass # Already exists or other error

    async def upload_file(self, file: UploadFile, prefix: str = "") -> str:
        # Generate short unique filename to avoid conflicts
        ext = file.filename.split(".")[-1] if "." in file.filename else ""
        stored_filename = f"{prefix}{uuid.uuid4().hex}.{ext}"
        
        try:
            self.s3_client.upload_fileobj(
                file.file,
                self.bucket,
                stored_filename,
                ExtraArgs={"ContentType": file.content_type}
            )
            return stored_filename
        except ClientError as e:
            raise HTTPException(status_code=500, detail="Could not upload file to storage")
            
    def get_presigned_url(self, stored_filename: str, expires_in: int = 3600) -> str:
        try:
            params = {'Bucket': self.bucket, 'Key': stored_filename}
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            return ""
