"""
文件存储服务
"""
from minio import Minio
from minio.error import S3Error
from typing import Optional, Tuple
from app.config import get_settings
import os
import uuid
import shutil
import logging

# 日志配置
logger = logging.getLogger(__name__)

settings = get_settings()

class FileService:
    """文件存储服务类"""
    
    def __init__(self):
        """初始化文件存储服务"""
        try:
            self.minio_client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ROOT_USER,
                secret_key=settings.MINIO_ROOT_PASSWORD,
                secure=False
            )
            
            # 创建默认桶
            self.bucket_name = "supplier-kb"
            if not self.minio_client.bucket_exists(self.bucket_name):
                self.minio_client.make_bucket(self.bucket_name)
                logger.info(f"Bucket '{self.bucket_name}' created successfully")
            else:
                logger.info(f"Bucket '{self.bucket_name}' already exists")
            
            logger.info("MinIO connection established successfully")
            self.use_minio = True
        except Exception as e:
            logger.error(f"MinIO connection failed: {e}")
            logger.info("Falling back to local file storage")
            self.minio_client = None
            self.use_minio = False
            
            # 创建本地存储目录
            self.local_storage_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage")
            os.makedirs(self.local_storage_dir, exist_ok=True)
            logger.info(f"Local storage directory created at: {self.local_storage_dir}")
    
    def upload_file(self, file_path: str, object_name: Optional[str] = None) -> Optional[str]:
        """上传文件"""
        if not object_name:
            # 生成唯一的对象名
            file_extension = os.path.splitext(file_path)[1]
            object_name = f"{uuid.uuid4()}{file_extension}"
        
        logger.info(f"Uploading file: {file_path} as {object_name}")
        
        if self.use_minio and self.minio_client:
            try:
                # 上传文件
                self.minio_client.fput_object(
                    self.bucket_name,
                    object_name,
                    file_path
                )
                
                file_url = f"http://{settings.MINIO_ENDPOINT}/{self.bucket_name}/{object_name}"
                logger.info(f"File uploaded to MinIO: {file_url}")
                # 返回文件URL
                return file_url
            except Exception as e:
                logger.error(f"Error uploading file to MinIO: {e}")
                # 回退到本地存储
                self.use_minio = False
                logger.info("Falling back to local storage for file upload")
        
        # 使用本地存储
        try:
            # 确保目录存在
            object_dir = os.path.join(self.local_storage_dir, os.path.dirname(object_name))
            os.makedirs(object_dir, exist_ok=True)
            
            # 复制文件到本地存储
            local_file_path = os.path.join(self.local_storage_dir, object_name)
            shutil.copyfile(file_path, local_file_path)
            
            file_url = f"file://{local_file_path}"
            logger.info(f"File uploaded to local storage: {file_url}")
            # 返回文件路径
            return file_url
        except Exception as e:
            logger.error(f"Error uploading file to local storage: {e}")
            return None
    
    def download_file(self, object_name: str, file_path: str) -> bool:
        """下载文件"""
        logger.info(f"Downloading file: {object_name} to {file_path}")
        
        if self.use_minio and self.minio_client:
            try:
                self.minio_client.fget_object(
                    self.bucket_name,
                    object_name,
                    file_path
                )
                logger.info(f"File downloaded from MinIO: {object_name}")
                return True
            except Exception as e:
                logger.error(f"Error downloading file from MinIO: {e}")
                # 回退到本地存储
                self.use_minio = False
                logger.info("Falling back to local storage for file download")
        
        # 使用本地存储
        try:
            local_file_path = os.path.join(self.local_storage_dir, object_name)
            if os.path.exists(local_file_path):
                # 确保目标目录存在
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                # 复制文件
                shutil.copyfile(local_file_path, file_path)
                logger.info(f"File downloaded from local storage: {object_name}")
                return True
            logger.warning(f"File not found in local storage: {object_name}")
            return False
        except Exception as e:
            logger.error(f"Error downloading file from local storage: {e}")
            return False
    
    def delete_file(self, object_name: str) -> bool:
        """删除文件"""
        logger.info(f"Deleting file: {object_name}")
        
        if self.use_minio and self.minio_client:
            try:
                self.minio_client.remove_object(
                    self.bucket_name,
                    object_name
                )
                logger.info(f"File deleted from MinIO: {object_name}")
                return True
            except Exception as e:
                logger.error(f"Error deleting file from MinIO: {e}")
                # 回退到本地存储
                self.use_minio = False
                logger.info("Falling back to local storage for file deletion")
        
        # 使用本地存储
        try:
            local_file_path = os.path.join(self.local_storage_dir, object_name)
            if os.path.exists(local_file_path):
                os.remove(local_file_path)
                logger.info(f"File deleted from local storage: {object_name}")
                return True
            logger.warning(f"File not found in local storage: {object_name}")
            return False
        except Exception as e:
            logger.error(f"Error deleting file from local storage: {e}")
            return False
    
    def get_file_info(self, object_name: str) -> Optional[Tuple[str, int]]:
        """获取文件信息"""
        logger.info(f"Getting file info: {object_name}")
        
        if self.use_minio and self.minio_client:
            try:
                stat = self.minio_client.stat_object(
                    self.bucket_name,
                    object_name
                )
                logger.info(f"File info retrieved from MinIO: {object_name}, size: {stat.size}, content-type: {stat.content_type}")
                return (stat.content_type, stat.size)
            except Exception as e:
                logger.error(f"Error getting file info from MinIO: {e}")
                # 回退到本地存储
                self.use_minio = False
                logger.info("Falling back to local storage for file info")
        
        # 使用本地存储
        try:
            local_file_path = os.path.join(self.local_storage_dir, object_name)
            if os.path.exists(local_file_path):
                file_size = os.path.getsize(local_file_path)
                # 简单的 MIME 类型检测
                import mimetypes
                mime_type, _ = mimetypes.guess_type(local_file_path)
                mime_type = mime_type or "application/octet-stream"
                logger.info(f"File info retrieved from local storage: {object_name}, size: {file_size}, content-type: {mime_type}")
                return (mime_type, file_size)
            logger.warning(f"File not found in local storage: {object_name}")
            return None
        except Exception as e:
            logger.error(f"Error getting file info from local storage: {e}")
            return None

# 创建文件服务实例
file_service = FileService()
