"""
邮件通知服务
"""
import smtplib
import logging
from typing import List, Dict, Any, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from email.utils import formataddr
import os
from datetime import datetime

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class EmailNotificationTemplate:
    """邮件通知模板"""
    
    TEMPLATES = {
        "project_creation": {
            "subject": "【项目立项】{project_name} 已成功立项",
            "text": """尊敬的{recipient_name}：

您好！

{project_name} 项目已于 {created_at} 成功立项。

项目信息：
- 项目编号：{project_code}
- 项目名称：{project_name}
- 项目负责人：{project_manager}
- 立项时间：{created_at}

请登录系统查看项目详情。

此致
敬礼！

供应商调研知识库管理系统
""",
            "html": """<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-top: 0;">项目立项通知</h2>
        </div>
        <p>尊敬的{recipient_name}：</p>
        <p>您好！</p>
        <p><strong>{project_name}</strong> 项目已于 {created_at} 成功立项。</p>
        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0;">
            <h3 style="margin-top: 0; color: #2980b9;">项目信息</h3>
            <ul style="list-style: none; padding-left: 0;">
                <li><strong>项目编号：</strong>{project_code}</li>
                <li><strong>项目名称：</strong>{project_name}</li>
                <li><strong>项目负责人：</strong>{project_manager}</li>
                <li><strong>立项时间：</strong>{created_at}</li>
            </ul>
        </div>
        <p>请登录系统查看项目详情。</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
            此致<br>
            敬礼！<br><br>
            供应商调研知识库管理系统
        </p>
    </div>
</body>
</html>"""
        },
        "stage_change": {
            "subject": "【阶段流转】{project_name} 已进入 {new_stage} 阶段",
            "text": """尊敬的{recipient_name}：

您好！

{project_name} 项目已于 {changed_at} 从 {old_stage} 阶段进入 {new_stage} 阶段。

项目信息：
- 项目编号：{project_code}
- 项目名称：{project_name}
- 当前阶段：{new_stage}
- 变更时间：{changed_at}
- 变更说明：{change_note}

请登录系统查看项目详情。

此致
敬礼！

供应商调研知识库管理系统
""",
            "html": """<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f0f8ff; padding: 15px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-top: 0;">阶段流转通知</h2>
        </div>
        <p>尊敬的{recipient_name}：</p>
        <p>您好！</p>
        <p><strong>{project_name}</strong> 项目已于 {changed_at} 从 <strong>{old_stage}</strong> 阶段进入 <strong>{new_stage}</strong> 阶段。</p>
        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #27ae60; margin: 15px 0;">
            <h3 style="margin-top: 0; color: #27ae60;">项目信息</h3>
            <ul style="list-style: none; padding-left: 0;">
                <li><strong>项目编号：</strong>{project_code}</li>
                <li><strong>项目名称：</strong>{project_name}</li>
                <li><strong>当前阶段：</strong>{new_stage}</li>
                <li><strong>变更时间：</strong>{changed_at}</li>
                <li><strong>变更说明：</strong>{change_note}</li>
            </ul>
        </div>
        <p>请登录系统查看项目详情。</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
            此致<br>
            敬礼！<br><br>
            供应商调研知识库管理系统
        </p>
    </div>
</body>
</html>"""
        },
        "supplier_shortlisted": {
            "subject": "【供应商入围】{supplier_name} 已入围 {project_name} 项目",
            "text": """尊敬的{recipient_name}：

您好！

{supplier_name} 已成功入围 {project_name} 项目。

入围信息：
- 项目名称：{project_name}
- 供应商名称：{supplier_name}
- 入围时间：{shortlisted_at}
- 联系人：{contact_person}
- 联系电话：{contact_phone}

请登录系统查看详细信息。

此致
敬礼！

供应商调研知识库管理系统
""",
            "html": """<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fff0f5; padding: 15px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-top: 0;">供应商入围通知</h2>
        </div>
        <p>尊敬的{recipient_name}：</p>
        <p>您好！</p>
        <p><strong>{supplier_name}</strong> 已成功入围 <strong>{project_name}</strong> 项目。</p>
        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #e74c3c; margin: 15px 0;">
            <h3 style="margin-top: 0; color: #c0392b;">入围信息</h3>
            <ul style="list-style: none; padding-left: 0;">
                <li><strong>项目名称：</strong>{project_name}</li>
                <li><strong>供应商名称：</strong>{supplier_name}</li>
                <li><strong>入围时间：</strong>{shortlisted_at}</li>
                <li><strong>联系人：</strong>{contact_person}</li>
                <li><strong>联系电话：</strong>{contact_phone}</li>
            </ul>
        </div>
        <p>请登录系统查看详细信息。</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
            此致<br>
            敬礼！<br><br>
            供应商调研知识库管理系统
        </p>
    </div>
</body>
</html>"""
        },
        "supplier_awarded": {
            "subject": "【中标通知】{supplier_name} 已中标 {project_name} 项目",
            "text": """尊敬的{recipient_name}：

您好！

恭喜 {supplier_name} 成功中标 {project_name} 项目！

中标信息：
- 项目名称：{project_name}
- 供应商名称：{supplier_name}
- 中标金额：{award_amount}
- 中标时间：{awarded_at}
- 项目负责人：{project_manager}

请登录系统查看详细信息并进行后续处理。

此致
敬礼！

供应商调研知识库管理系统
""",
            "html": """<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fffacd; padding: 15px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-top: 0;">中标通知</h2>
        </div>
        <p>尊敬的{recipient_name}：</p>
        <p>您好！</p>
        <p style="font-size: 16px; color: #d35400;"><strong>恭喜 {supplier_name} 成功中标 {project_name} 项目！</strong></p>
        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #f39c12; margin: 15px 0;">
            <h3 style="margin-top: 0; color: #d35400;">中标信息</h3>
            <ul style="list-style: none; padding-left: 0;">
                <li><strong>项目名称：</strong>{project_name}</li>
                <li><strong>供应商名称：</strong>{supplier_name}</li>
                <li><strong>中标金额：</strong>{award_amount}</li>
                <li><strong>中标时间：</strong>{awarded_at}</li>
                <li><strong>项目负责人：</strong>{project_manager}</li>
            </ul>
        </div>
        <p>请登录系统查看详细信息并进行后续处理。</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
            此致<br>
            敬礼！<br><br>
            供应商调研知识库管理系统
        </p>
    </div>
</body>
</html>"""
        },
        "project_accepted": {
            "subject": "【验收通知】{project_name} 已验收通过",
            "text": """尊敬的{recipient_name}：

您好！

{project_name} 项目已于 {accepted_at} 验收通过。

验收信息：
- 项目编号：{project_code}
- 项目名称：{project_name}
- 验收时间：{accepted_at}
- 验收结论：{acceptance_result}
- 验收人：{acceptance_person}

请登录系统查看详细信息。

此致
敬礼！

供应商调研知识库管理系统
""",
            "html": """<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #e8f5e9; padding: 15px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-top: 0;">验收通知</h2>
        </div>
        <p>尊敬的{recipient_name}：</p>
        <p>您好！</p>
        <p><strong>{project_name}</strong> 项目已于 {accepted_at} 验收通过。</p>
        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #2ecc71; margin: 15px 0;">
            <h3 style="margin-top: 0; color: #27ae60;">验收信息</h3>
            <ul style="list-style: none; padding-left: 0;">
                <li><strong>项目编号：</strong>{project_code}</li>
                <li><strong>项目名称：</strong>{project_name}</li>
                <li><strong>验收时间：</strong>{accepted_at}</li>
                <li><strong>验收结论：</strong>{acceptance_result}</li>
                <li><strong>验收人：</strong>{acceptance_person}</li>
            </ul>
        </div>
        <p>请登录系统查看详细信息。</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
            此致<br>
            敬礼！<br><br>
            供应商调研知识库管理系统
        </p>
    </div>
</body>
</html>"""
        }
    }
    
    @classmethod
    def get_template(cls, template_name: str) -> Optional[Dict[str, str]]:
        """获取邮件模板"""
        return cls.TEMPLATES.get(template_name)
    
    @classmethod
    def render_template(cls, template_name: str, context: Dict[str, Any], use_html: bool = True) -> tuple:
        """渲染邮件模板"""
        template = cls.get_template(template_name)
        if not template:
            logger.error(f"Template {template_name} not found")
            raise ValueError(f"Template {template_name} not found")
        
        subject = template["subject"].format(**context)
        text_content = template["text"].format(**context)
        html_content = template["html"].format(**context) if use_html else None
        
        return subject, text_content, html_content


class EmailService:
    """邮件服务类"""
    
    def __init__(self):
        """初始化邮件服务"""
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_USE_TLS
        self.use_ssl = settings.SMTP_USE_SSL
        
        logger.info("EmailService initialized")
    
    def _create_smtp_connection(self) -> smtplib.SMTP:
        """创建SMTP连接"""
        try:
            if self.use_ssl:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            
            if self.use_tls and not self.use_ssl:
                server.starttls()
            
            if self.smtp_username and self.smtp_password:
                server.login(self.smtp_username, self.smtp_password)
            
            logger.info("SMTP connection established")
            return server
        except Exception as e:
            logger.error(f"Failed to create SMTP connection: {e}")
            raise
    
    def send_text_email(
        self,
        to_emails: List[str],
        subject: str,
        content: str,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None
    ) -> bool:
        """发送纯文本邮件"""
        try:
            msg = MIMEText(content, 'plain', 'utf-8')
            msg['From'] = formataddr((self.from_name, self.from_email))
            msg['To'] = ', '.join(to_emails)
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            msg['Subject'] = subject
            
            all_recipients = to_emails.copy()
            if cc_emails:
                all_recipients.extend(cc_emails)
            if bcc_emails:
                all_recipients.extend(bcc_emails)
            
            server = self._create_smtp_connection()
            server.sendmail(self.from_email, all_recipients, msg.as_string())
            server.quit()
            
            logger.info(f"Text email sent successfully to {to_emails}")
            return True
        except Exception as e:
            logger.error(f"Failed to send text email: {e}")
            return False
    
    def send_html_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None
    ) -> bool:
        """发送HTML邮件"""
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = formataddr((self.from_name, self.from_email))
            msg['To'] = ', '.join(to_emails)
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            msg['Subject'] = subject
            
            if text_content:
                msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))
            
            all_recipients = to_emails.copy()
            if cc_emails:
                all_recipients.extend(cc_emails)
            if bcc_emails:
                all_recipients.extend(bcc_emails)
            
            server = self._create_smtp_connection()
            server.sendmail(self.from_email, all_recipients, msg.as_string())
            server.quit()
            
            logger.info(f"HTML email sent successfully to {to_emails}")
            return True
        except Exception as e:
            logger.error(f"Failed to send HTML email: {e}")
            return False
    
    def send_email_with_attachments(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[str]] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None
    ) -> bool:
        """发送带附件的邮件"""
        try:
            msg = MIMEMultipart()
            msg['From'] = formataddr((self.from_name, self.from_email))
            msg['To'] = ', '.join(to_emails)
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            msg['Subject'] = subject
            
            text_part = MIMEMultipart('alternative')
            if text_content:
                text_part.attach(MIMEText(text_content, 'plain', 'utf-8'))
            text_part.attach(MIMEText(html_content, 'html', 'utf-8'))
            msg.attach(text_part)
            
            if attachments:
                for file_path in attachments:
                    if not os.path.exists(file_path):
                        logger.warning(f"Attachment file not found: {file_path}")
                        continue
                    
                    with open(file_path, 'rb') as f:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    
                    filename = os.path.basename(file_path)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename="{filename}"'
                    )
                    msg.attach(part)
                    logger.info(f"Attachment added: {filename}")
            
            all_recipients = to_emails.copy()
            if cc_emails:
                all_recipients.extend(cc_emails)
            if bcc_emails:
                all_recipients.extend(bcc_emails)
            
            server = self._create_smtp_connection()
            server.sendmail(self.from_email, all_recipients, msg.as_string())
            server.quit()
            
            logger.info(f"Email with attachments sent successfully to {to_emails}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email with attachments: {e}")
            return False
    
    def send_templated_email(
        self,
        to_emails: List[str],
        template_name: str,
        context: Dict[str, Any],
        use_html: bool = True,
        attachments: Optional[List[str]] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None
    ) -> bool:
        """发送模板邮件"""
        try:
            subject, text_content, html_content = EmailNotificationTemplate.render_template(
                template_name, context, use_html
            )
            
            if attachments:
                return self.send_email_with_attachments(
                    to_emails=to_emails,
                    subject=subject,
                    html_content=html_content,
                    text_content=text_content,
                    attachments=attachments,
                    cc_emails=cc_emails,
                    bcc_emails=bcc_emails
                )
            elif use_html and html_content:
                return self.send_html_email(
                    to_emails=to_emails,
                    subject=subject,
                    html_content=html_content,
                    text_content=text_content,
                    cc_emails=cc_emails,
                    bcc_emails=bcc_emails
                )
            else:
                return self.send_text_email(
                    to_emails=to_emails,
                    subject=subject,
                    content=text_content,
                    cc_emails=cc_emails,
                    bcc_emails=bcc_emails
                )
        except Exception as e:
            logger.error(f"Failed to send templated email: {e}")
            return False


email_service = EmailService()
