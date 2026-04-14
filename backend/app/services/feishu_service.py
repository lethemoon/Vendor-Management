import requests
import json
import hashlib
import base64
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import time

from app.config import get_settings

settings = get_settings()


class FeishuService:
    def __init__(self):
        self.app_id = settings.FEISHU_APP_ID
        self.app_secret = settings.FEISHU_APP_SECRET
        self.verification_token = settings.FEISHU_VERIFICATION_TOKEN
        self.encrypt_key = settings.FEISHU_ENCRYPT_KEY
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
        self.base_url = "https://open.feishu.cn"

    def _get_access_token(self) -> str:
        if (
            self._access_token
            and self._token_expires_at
            and datetime.now() < self._token_expires_at
        ):
            return self._access_token

        url = f"{self.base_url}/open-apis/auth/v3/tenant_access_token/internal"
        data = {
            "app_id": self.app_id,
            "app_secret": self.app_secret
        }
        response = requests.post(url, json=data)
        result = response.json()
        
        if result.get("code") != 0:
            raise Exception(f"Failed to get access token: {result}")
        
        self._access_token = result["tenant_access_token"]
        self._token_expires_at = datetime.now() + timedelta(seconds=result["expire"] - 300)
        return self._access_token

    def get_user_info(self, code: str) -> Dict[str, Any]:
        access_token = self._get_access_token()
        url = f"{self.base_url}/open-apis/authen/v1/user_info"
        params = {
            "code": code
        }
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        response = requests.get(url, params=params, headers=headers)
        result = response.json()
        
        if result.get("code") != 0:
            raise Exception(f"Failed to get user info: {result}")
        
        return result

    def send_message(self, receive_id_type: str, receive_id: str, content: str, msg_type: str = "text") -> Dict[str, Any]:
        access_token = self._get_access_token()
        url = f"{self.base_url}/open-apis/im/v1/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        data = {
            "receive_id_type": receive_id_type,
            receive_id_type: receive_id,
            "msg_type": msg_type,
            "content": content
        }
        
        response = requests.post(url, json=data, headers=headers)
        result = response.json()
        
        if result.get("code") != 0:
            raise Exception(f"Failed to send message: {result}")
        
        return result

    def send_text_message(self, receive_id_type: str, receive_id: str, text: str) -> Dict[str, Any]:
        content = json.dumps({"text": text}, ensure_ascii=False)
        return self.send_message(receive_id_type, receive_id, content, "text")

    def send_post_message(self, receive_id_type: str, receive_id: str, title: str, content: List[Dict[str, Any]]) -> Dict[str, Any]:
        post_content = {
            "title": title,
            "content": content
        }
        content = json.dumps(post_content, ensure_ascii=False)
        return self.send_message(receive_id_type, receive_id, content, "post")

    def create_calendar_event(
        self,
        summary: str,
        description: str,
        start_time: int,
        end_time: int,
        attendees: List[str],
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        access_token = self._get_access_token()
        url = f"{self.base_url}/open-apis/calendar/v4/events"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        data = {
            "summary": summary,
            "description": description,
            "start_time": start_time,
            "end_time": end_time,
            "attendees": attendees
        }
        
        if location:
            data["location"] = location
        
        response = requests.post(url, json=data, headers=headers)
        result = response.json()
        
        if result.get("code") != 0:
            raise Exception(f"Failed to create calendar event: {result}")
        
        return result

    def create_wiki_space(self, name: str, description: str) -> Dict[str, Any]:
        access_token = self._get_access_token()
        url = f"{self.base_url}/open-apis/wiki/v2/spaces"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        data = {
            "name": name,
            "description": description
        }
        
        response = requests.post(url, json=data, headers=headers)
        result = response.json()
        
        if result.get("code") != 0:
            raise Exception(f"Failed to create wiki space: {result}")
        
        return result

    def create_bitable_app(self, name: str, description: str) -> Dict[str, Any]:
        access_token = self._get_access_token()
        url = f"{self.base_url}/open-apis/bitable/v1/apps"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        data = {
            "name": name,
            "description": description
        }
        
        response = requests.post(url, json=data, headers=headers)
        result = response.json()
        
        if result.get("code") != 0:
            raise Exception(f"Failed to create bitable app: {result}")
        
        return result

    def verify_signature(
        self,
        timestamp: str,
        nonce: str,
        signature: str,
        body: str
    ) -> bool:
        params = [self.verification_token, timestamp, nonce, body]
        params.sort()
        temp_str = "".join(params).encode("utf-8")
        sha1 = hashlib.sha1()
        sha1.update(temp_str)
        hashcode = sha1.hexdigest()
        
        return hashcode == signature


feishu_service = FeishuService()
