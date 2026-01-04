import os
from minio import Minio
from minio.error import S3Error
from typing import BinaryIO, Optional
import io

class StorageClient:
    _client: Optional[Minio] = None
    _bucket_name = "rca-documents"

    @classmethod
    def get_client(cls) -> Minio:
        if cls._client is None:
            endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
            access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
            secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
            secure = os.getenv("MINIO_SECURE", "false").lower() == "true"

            cls._client = Minio(
                endpoint,
                access_key=access_key,
                secret_key=secret_key,
                secure=secure
            )

            try:
                if not cls._client.bucket_exists(cls._bucket_name):
                    cls._client.make_bucket(cls._bucket_name)
            except S3Error as e:
                print(f"Error creating bucket: {e}")

        return cls._client

    @classmethod
    def upload_file(cls, file_data: bytes, file_path: str, content_type: str = "application/octet-stream") -> str:
        client = cls.get_client()

        try:
            file_stream = io.BytesIO(file_data)
            client.put_object(
                cls._bucket_name,
                file_path,
                file_stream,
                length=len(file_data),
                content_type=content_type
            )
            return file_path
        except S3Error as e:
            raise Exception(f"Failed to upload file: {str(e)}")

    @classmethod
    def download_file(cls, file_path: str) -> bytes:
        client = cls.get_client()

        try:
            response = client.get_object(cls._bucket_name, file_path)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as e:
            raise Exception(f"Failed to download file: {str(e)}")

    @classmethod
    def delete_file(cls, file_path: str):
        client = cls.get_client()

        try:
            client.remove_object(cls._bucket_name, file_path)
        except S3Error as e:
            raise Exception(f"Failed to delete file: {str(e)}")

    @classmethod
    def get_file_url(cls, file_path: str, expires_in_seconds: int = 3600) -> str:
        client = cls.get_client()

        try:
            url = client.presigned_get_object(
                cls._bucket_name,
                file_path,
                expires=expires_in_seconds
            )
            return url
        except S3Error as e:
            raise Exception(f"Failed to get file URL: {str(e)}")
