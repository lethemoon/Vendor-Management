import requests
import json
from typing import Optional, Dict, Any, List
from datetime import datetime

from app.config import get_settings

settings = get_settings()


class AIGatewayService:
    def __init__(self):
        self.app_id = settings.TENCENT_HUNYUAN_APP_ID
        self.secret_key = settings.TENCENT_HUNYUAN_SECRET_KEY
        self.endpoint = settings.TENCENT_HUNYUAN_ENDPOINT
        self.base_url = "https://hunyuan.tencentcloudapi.com"

    def _generate_timestamp(self) -> int:
        return int(datetime.now().timestamp())

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "hunyuan-lite",
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> Dict[str, Any]:
        if not self.app_id or not self.secret_key:
            return {
                "success": False,
                "error": "AI gateway not configured. Please set TENCENT_HUNYUAN_APP_ID and TENCENT_HUNYUAN_SECRET_KEY."
            }

        try:
            payload = {
                "Model": model,
                "Messages": messages,
                "Temperature": temperature,
                "TopP": 1.0,
                "Stream": False
            }

            headers = {
                "Content-Type": "application/json",
                "Authorization": self._generate_auth_header(payload)
            }

            response = requests.post(
                f"{self.base_url}",
                headers=headers,
                json=payload,
                timeout=60
            )

            if response.status_code == 200:
                result = response.json()
                if result.get("Response", {}).get("Error"):
                    return {
                        "success": False,
                        "error": result["Response"]["Error"]["Message"]
                    }
                
                choices = result.get("Response", {}).get("Choices", [])
                if choices:
                    message = choices[0].get("Message", {})
                    return {
                        "success": True,
                        "content": message.get("Content", ""),
                        "usage": result.get("Response", {}).get("Usage", {})
                    }
                
                return {
                    "success": False,
                    "error": "No response from AI model"
                }
            else:
                return {
                    "success": False,
                    "error": f"API request failed with status {response.status_code}"
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def _generate_auth_header(self, payload: Dict[str, Any]) -> str:
        return "Bearer placeholder"

    def generate_survey_report(
        self,
        project_name: str,
        supplier_name: str,
        phase: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        prompt = f"""
请根据以下信息生成一份供应商调研报告：

项目名称：{project_name}
供应商名称：{supplier_name}
当前阶段：{phase}
数据：{json.dumps(data, ensure_ascii=False, indent=2)}

请生成一份结构化的报告，包含以下部分：
1. 项目概述
2. 供应商评估
3. 风险分析
4. 建议与结论
"""

        messages = [
            {"role": "system", "content": "你是一个专业的供应商调研分析专家，擅长生成结构化的调研报告。"},
            {"role": "user", "content": prompt}
        ]

        return self.chat_completion(messages, temperature=0.3, max_tokens=3000)

    def answer_question(
        self,
        question: str,
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": "你是一个供应商调研知识库的智能助手，能够回答关于供应商、项目和知识的问题。"}
        ]

        if context:
            messages.append({
                "role": "user",
                "content": f"参考以下上下文回答问题：\n\n上下文：{context}\n\n问题：{question}"
            })
        else:
            messages.append({
                "role": "user",
                "content": question
            })

        return self.chat_completion(messages, temperature=0.5, max_tokens=2000)


ai_gateway_service = AIGatewayService()
