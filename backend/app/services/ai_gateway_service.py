"""
AI网关服务 - 统一的大模型访问接口
"""
import os
import logging
import time
from typing import List, Dict, Any, Optional, Union
from abc import ABC, abstractmethod
from dotenv import load_dotenv
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

load_dotenv()

logger = logging.getLogger(__name__)


class LLMException(Exception):
    """LLM服务异常"""
    pass


class LLMTimeoutException(LLMException):
    """LLM超时异常"""
    pass


class LLMProvider(ABC):
    """LLM提供商抽象基类"""
    
    @abstractmethod
    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """对话方法"""
        pass
    
    @abstractmethod
    async def embedding(self, texts: Union[str, List[str]], **kwargs) -> List[List[float]]:
        """向量生成方法"""
        pass


class QwenProvider(LLMProvider):
    """通义千问提供商"""
    
    def __init__(self, api_key: str, model: str = "qwen-turbo", embedding_model: str = "text-embedding-v2"):
        self.api_key = api_key
        self.model = model
        self.embedding_model = embedding_model
        self.base_url = "https://dashscope.aliyuncs.com/api/v1"
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((LLMTimeoutException, httpx.HTTPStatusError))
    )
    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        try:
            url = f"{self.base_url}/services/aigc/text-generation/generation"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": kwargs.get("model", self.model),
                "input": {
                    "messages": messages
                },
                "parameters": {
                    "temperature": kwargs.get("temperature", 0.7),
                    "max_tokens": kwargs.get("max_tokens", 2000),
                    "top_p": kwargs.get("top_p", 0.8)
                }
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                return result["output"]["text"]
        except httpx.TimeoutException:
            logger.error("Qwen chat timeout")
            raise LLMTimeoutException("Qwen chat timeout")
        except Exception as e:
            logger.error(f"Qwen chat error: {str(e)}")
            raise LLMException(f"Qwen chat error: {str(e)}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((LLMTimeoutException, httpx.HTTPStatusError))
    )
    async def embedding(self, texts: Union[str, List[str]], **kwargs) -> List[List[float]]:
        try:
            if isinstance(texts, str):
                texts = [texts]
            
            url = f"{self.base_url}/services/embeddings/text-embedding/text-embedding"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": kwargs.get("model", self.embedding_model),
                "input": {
                    "texts": texts
                }
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                embeddings = [item["embedding"] for item in result["output"]["embeddings"]]
                return embeddings
        except httpx.TimeoutException:
            logger.error("Qwen embedding timeout")
            raise LLMTimeoutException("Qwen embedding timeout")
        except Exception as e:
            logger.error(f"Qwen embedding error: {str(e)}")
            raise LLMException(f"Qwen embedding error: {str(e)}")


class ErnieProvider(LLMProvider):
    """文心一言提供商"""
    
    def __init__(self, api_key: str, secret_key: str, model: str = "ernie-bot-turbo", embedding_model: str = "embedding-v1"):
        self.api_key = api_key
        self.secret_key = secret_key
        self.model = model
        self.embedding_model = embedding_model
        self.access_token = None
        self.token_expires_at = 0
    
    async def _get_access_token(self):
        """获取访问令牌"""
        if self.access_token and time.time() < self.token_expires_at:
            return self.access_token
        
        try:
            url = "https://aip.baidubce.com/oauth/2.0/token"
            params = {
                "grant_type": "client_credentials",
                "client_id": self.api_key,
                "client_secret": self.secret_key
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, params=params)
                response.raise_for_status()
                result = response.json()
                self.access_token = result["access_token"]
                self.token_expires_at = time.time() + result.get("expires_in", 2592000) - 300
                return self.access_token
        except Exception as e:
            logger.error(f"Ernie get access token error: {str(e)}")
            raise LLMException(f"Ernie get access token error: {str(e)}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((LLMTimeoutException, httpx.HTTPStatusError))
    )
    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        try:
            access_token = await self._get_access_token()
            model = kwargs.get("model", self.model)
            url = f"https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/{model}?access_token={access_token}"
            
            headers = {
                "Content-Type": "application/json"
            }
            payload = {
                "messages": messages,
                "temperature": kwargs.get("temperature", 0.7),
                "max_output_tokens": kwargs.get("max_tokens", 2000),
                "top_p": kwargs.get("top_p", 0.8)
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                if "error_code" in result:
                    raise LLMException(f"Ernie chat error: {result.get('error_msg', 'Unknown error')}")
                return result["result"]
        except httpx.TimeoutException:
            logger.error("Ernie chat timeout")
            raise LLMTimeoutException("Ernie chat timeout")
        except Exception as e:
            logger.error(f"Ernie chat error: {str(e)}")
            raise LLMException(f"Ernie chat error: {str(e)}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((LLMTimeoutException, httpx.HTTPStatusError))
    )
    async def embedding(self, texts: Union[str, List[str]], **kwargs) -> List[List[float]]:
        try:
            if isinstance(texts, str):
                texts = [texts]
            
            access_token = await self._get_access_token()
            url = f"https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/embeddings/{self.embedding_model}?access_token={access_token}"
            
            headers = {
                "Content-Type": "application/json"
            }
            payload = {
                "input": texts
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                if "error_code" in result:
                    raise LLMException(f"Ernie embedding error: {result.get('error_msg', 'Unknown error')}")
                embeddings = [item["embedding"] for item in result["data"]]
                return embeddings
        except httpx.TimeoutException:
            logger.error("Ernie embedding timeout")
            raise LLMTimeoutException("Ernie embedding timeout")
        except Exception as e:
            logger.error(f"Ernie embedding error: {str(e)}")
            raise LLMException(f"Ernie embedding error: {str(e)}")


class GLMProvider(LLMProvider):
    """智谱GLM提供商"""
    
    def __init__(self, api_key: str, model: str = "glm-4-flash", embedding_model: str = "embedding-3"):
        self.api_key = api_key
        self.model = model
        self.embedding_model = embedding_model
        self.base_url = "https://open.bigmodel.cn/api/paas/v4"
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((LLMTimeoutException, httpx.HTTPStatusError))
    )
    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        try:
            url = f"{self.base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": kwargs.get("model", self.model),
                "messages": messages,
                "temperature": kwargs.get("temperature", 0.7),
                "max_tokens": kwargs.get("max_tokens", 2000),
                "top_p": kwargs.get("top_p", 0.8)
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                return result["choices"][0]["message"]["content"]
        except httpx.TimeoutException:
            logger.error("GLM chat timeout")
            raise LLMTimeoutException("GLM chat timeout")
        except Exception as e:
            logger.error(f"GLM chat error: {str(e)}")
            raise LLMException(f"GLM chat error: {str(e)}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((LLMTimeoutException, httpx.HTTPStatusError))
    )
    async def embedding(self, texts: Union[str, List[str]], **kwargs) -> List[List[float]]:
        try:
            if isinstance(texts, str):
                texts = [texts]
            
            url = f"{self.base_url}/embeddings"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": kwargs.get("model", self.embedding_model),
                "input": texts
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                embeddings = [item["embedding"] for item in result["data"]]
                return embeddings
        except httpx.TimeoutException:
            logger.error("GLM embedding timeout")
            raise LLMTimeoutException("GLM embedding timeout")
        except Exception as e:
            logger.error(f"GLM embedding error: {str(e)}")
            raise LLMException(f"GLM embedding error: {str(e)}")


class AIGatewayService:
    """AI网关服务类 - 统一管理多种大模型提供商"""
    
    def __init__(self):
        self.providers: Dict[str, LLMProvider] = {}
        self.default_provider: Optional[str] = None
        self._init_providers()
    
    def _init_providers(self):
        """初始化提供商"""
        try:
            qwen_api_key = os.getenv("QWEN_API_KEY")
            if qwen_api_key:
                self.providers["qwen"] = QwenProvider(
                    api_key=qwen_api_key,
                    model=os.getenv("QWEN_MODEL", "qwen-turbo"),
                    embedding_model=os.getenv("QWEN_EMBEDDING_MODEL", "text-embedding-v2")
                )
                logger.info("Qwen provider initialized")
                if not self.default_provider:
                    self.default_provider = "qwen"
        except Exception as e:
            logger.warning(f"Failed to initialize Qwen provider: {str(e)}")
        
        try:
            ernie_api_key = os.getenv("ERNIE_API_KEY")
            ernie_secret_key = os.getenv("ERNIE_SECRET_KEY")
            if ernie_api_key and ernie_secret_key:
                self.providers["ernie"] = ErnieProvider(
                    api_key=ernie_api_key,
                    secret_key=ernie_secret_key,
                    model=os.getenv("ERNIE_MODEL", "ernie-bot-turbo"),
                    embedding_model=os.getenv("ERNIE_EMBEDDING_MODEL", "embedding-v1")
                )
                logger.info("Ernie provider initialized")
                if not self.default_provider:
                    self.default_provider = "ernie"
        except Exception as e:
            logger.warning(f"Failed to initialize Ernie provider: {str(e)}")
        
        try:
            glm_api_key = os.getenv("GLM_API_KEY")
            if glm_api_key:
                self.providers["glm"] = GLMProvider(
                    api_key=glm_api_key,
                    model=os.getenv("GLM_MODEL", "glm-4-flash"),
                    embedding_model=os.getenv("GLM_EMBEDDING_MODEL", "embedding-3")
                )
                logger.info("GLM provider initialized")
                if not self.default_provider:
                    self.default_provider = "glm"
        except Exception as e:
            logger.warning(f"Failed to initialize GLM provider: {str(e)}")
        
        if not self.providers:
            logger.warning("No AI providers initialized. Please check environment variables.")
    
    async def chat(self, messages: List[Dict[str, str]], provider: Optional[str] = None, **kwargs) -> str:
        """
        对话方法
        
        Args:
            messages: 消息列表，格式为 [{"role": "user", "content": "..."}, ...]
            provider: 提供商名称，可选，默认使用默认提供商
            **kwargs: 其他参数，如 temperature, max_tokens, top_p, model 等
        
        Returns:
            对话结果文本
        """
        target_provider = provider or self.default_provider
        if not target_provider:
            raise LLMException("No AI provider available")
        
        if target_provider not in self.providers:
            raise LLMException(f"Provider '{target_provider}' not found")
        
        logger.info(f"Chat request to {target_provider}")
        return await self.providers[target_provider].chat(messages, **kwargs)
    
    async def embedding(self, texts: Union[str, List[str]], provider: Optional[str] = None, **kwargs) -> List[List[float]]:
        """
        向量生成方法
        
        Args:
            texts: 文本或文本列表
            provider: 提供商名称，可选，默认使用默认提供商
            **kwargs: 其他参数，如 model 等
        
        Returns:
            向量列表
        """
        target_provider = provider or self.default_provider
        if not target_provider:
            raise LLMException("No AI provider available")
        
        if target_provider not in self.providers:
            raise LLMException(f"Provider '{target_provider}' not found")
        
        logger.info(f"Embedding request to {target_provider}")
        return await self.providers[target_provider].embedding(texts, **kwargs)
    
    async def simple_chat(self, prompt: str, provider: Optional[str] = None, **kwargs) -> str:
        """
        简单对话方法 - 单轮对话
        
        Args:
            prompt: 用户提示
            provider: 提供商名称，可选
            **kwargs: 其他参数
        
        Returns:
            对话结果文本
        """
        messages = [{"role": "user", "content": prompt}]
        return await self.chat(messages, provider, **kwargs)
    
    def get_available_providers(self) -> List[str]:
        """
        获取可用的提供商列表
        
        Returns:
            提供商名称列表
        """
        return list(self.providers.keys())
    
    def set_default_provider(self, provider: str) -> None:
        """
        设置默认提供商
        
        Args:
            provider: 提供商名称
        """
        if provider not in self.providers:
            raise LLMException(f"Provider '{provider}' not found")
        self.default_provider = provider
        logger.info(f"Default provider set to {provider}")


ai_gateway_service = AIGatewayService()
