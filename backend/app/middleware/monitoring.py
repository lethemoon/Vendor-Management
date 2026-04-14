"""
监控中间件
"""
import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

class MonitoringMiddleware(BaseHTTPMiddleware):
    """监控中间件"""
    
    async def dispatch(self, request: Request, call_next):
        """处理请求"""
        # 记录请求开始时间
        start_time = time.time()
        
        # 记录请求信息
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"Params: {dict(request.query_params)} "
            f"Client: {request.client.host}:{request.client.port}"
        )
        
        try:
            # 处理请求
            response = await call_next(request)
            
            # 计算响应时间
            process_time = time.time() - start_time
            
            # 记录响应信息
            logger.info(
                f"Response: {request.method} {request.url.path} "
                f"Status: {response.status_code} "
                f"Time: {process_time:.4f}s"
            )
            
            # 添加响应时间头
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            # 记录错误信息
            process_time = time.time() - start_time
            logger.error(
                f"Error: {request.method} {request.url.path} "
                f"Time: {process_time:.4f}s "
                f"Error: {str(e)}"
            )
            raise
