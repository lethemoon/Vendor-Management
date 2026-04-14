"""
缓存服务
"""
import redis
from typing import Optional, Any
from app.config import get_settings

settings = get_settings()

class CacheService:
    """缓存服务类"""
    
    def __init__(self):
        """初始化缓存服务"""
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                decode_responses=True
            )
            # 测试连接
            self.redis_client.ping()
            print("Redis connection established successfully")
        except Exception as e:
            print(f"Redis connection failed: {e}")
            self.redis_client = None
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存"""
        if not self.redis_client:
            return None
        
        try:
            value = self.redis_client.get(key)
            return value
        except Exception as e:
            print(f"Error getting cache: {e}")
            return None
    
    def set(self, key: str, value: Any, expire: int = 3600) -> bool:
        """设置缓存"""
        if not self.redis_client:
            return False
        
        try:
            self.redis_client.setex(key, expire, value)
            return True
        except Exception as e:
            print(f"Error setting cache: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """删除缓存"""
        if not self.redis_client:
            return False
        
        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            print(f"Error deleting cache: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> bool:
        """清除匹配模式的缓存"""
        if not self.redis_client:
            return False
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
            return True
        except Exception as e:
            print(f"Error clearing cache pattern: {e}")
            return False

# 创建缓存服务实例
cache_service = CacheService()
