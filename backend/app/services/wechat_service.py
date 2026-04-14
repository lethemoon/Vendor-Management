import requests
import json
import hashlib
import base64
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import time

from app.config import get_settings

settings = get_settings()


class WeChatService:
    def __init__(self):
        self.corp_id = settings.WECHAT_CORP_ID
        self.agent_id = settings.WECHAT_AGENT_ID
        self.secret = settings.WECHAT_SECRET
        self.token = settings.WECHAT_TOKEN
        self.encoding_aes_key = settings.WECHAT_ENCODING_AES_KEY
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
        self.base_url = "https://qyapi.weixin.qq.com"

    def _get_access_token(self) -> str:
        if (
            self._access_token
            and self._token_expires_at
            and datetime.now() < self._token_expires_at
        ):
            return self._access_token

        url = f"{self.base_url}/cgi-bin/gettoken"
        params = {
            "corpid": self.corp_id,
            "corpsecret": self.secret
        }
        response = requests.get(url, params=params)
        result = response.json()
        
        if result.get("errcode") != 0:
            raise Exception(f"Failed to get access token: {result}")
        
        self._access_token = result["access_token"]
        self._token_expires_at = datetime.now() + timedelta(seconds=result["expires_in"] - 300)
        return self._access_token

    def get_user_info(self, code: str) -> Dict[str, Any]:
        access_token = self._get_access_token()
        url = f"{self.base_url}/cgi-bin/auth/getuserinfo"
        params = {
            "access_token": access_token,
            "code": code
        }
        response = requests.get(url, params=params)
        result = response.json()
        
        if result.get("errcode") != 0:
            raise Exception(f"Failed to get user info: {result}")
        
        return result

    def get_user_detail(self, user_id: str) -> Dict[str, Any]:
        access_token = self._get_access_token()
        url = f"{self.base_url}/cgi-bin/user/get"
        params = {
            "access_token": access_token,
            "userid": user_id
        }
        response = requests.get(url, params=params)
        result = response.json()
        
        if result.get("errcode") != 0:
            raise Exception(f"Failed to get user detail: {result}")
        
        return result

    def send_text_message(self, to_user: str, content: str) -> Dict[str, Any]:
        access_token = self._get_access_token()
        url = f"{self.base_url}/cgi-bin/message/send?access_token={access_token}"
        
        data = {
            "touser": to_user,
            "msgtype": "text",
            "agentid": self.agent_id,
            "text": {
                "content": content
            }
        }
        
        response = requests.post(url, json=data)
        result = response.json()
        
        if result.get("errcode") != 0:
            raise Exception(f"Failed to send message: {result}")
        
        return result

    def send_news_message(
        self, 
        to_user: str, 
        articles: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        access_token = self._get_access_token()
        url = f"{self.base_url}/cgi-bin/message/send?access_token={access_token}"
        
        data = {
            "touser": to_user,
            "msgtype": "news",
            "agentid": self.agent_id,
            "news": {
                "articles": articles
            }
        }
        
        response = requests.post(url, json=data)
        result = response.json()
        
        if result.get("errcode") != 0:
            raise Exception(f"Failed to send news message: {result}")
        
        return result

    def create_calendar_event(
        self,
        organizer: str,
        attendees: List[str],
        summary: str,
        description: str,
        start_time: int,
        end_time: int,
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        access_token = self._get_access_token()
        url = f"{self.base_url}/cgi-bin/oa/calendar/add?access_token={access_token}"
        
        data = {
            "calendar": {
                "organizer": organizer,
                "attendees": [{"userid": user} for user in attendees],
                "summary": summary,
                "description": description,
                "start_time": start_time,
                "end_time": end_time
            }
        }
        
        if location:
            data["calendar"]["location"] = location
        
        response = requests.post(url, json=data)
        result = response.json()
        
        if result.get("errcode") != 0:
            raise Exception(f"Failed to create calendar event: {result}")
        
        return result

    def verify_signature(
        self,
        msg_signature: str,
        timestamp: str,
        nonce: str,
        echostr: Optional[str] = None
    ) -> bool:
        params = [self.token, timestamp, nonce]
        if echostr:
            params.append(echostr)
        
        params.sort()
        temp_str = "".join(params).encode("utf-8")
        sha1 = hashlib.sha1()
        sha1.update(temp_str)
        hashcode = sha1.hexdigest()
        
        return hashcode == msg_signature


wechat_service = WeChatService()
