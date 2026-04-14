import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload

from app.models.approval import (
    Approval,
    ApprovalStep,
    ApprovalFlowTemplate,
    ApprovalStatus,
    ApprovalStepStatus
)
from app.models.user import User

logger = logging.getLogger(__name__)


class ApprovalService:
    def __init__(self, db: Session):
        self.db = db

    def create_approval(
        self,
        title: str,
        description: Optional[str] = None,
        flow_template_id: Optional[int] = None,
        related_type: Optional[str] = None,
        related_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        created_by_id: int = 0,
        steps: Optional[List[Dict[str, Any]]] = None
    ) -> Approval:
        approval = Approval(
            title=title,
            description=description,
            flow_template_id=flow_template_id,
            status=ApprovalStatus.DRAFT,
            related_type=related_type,
            related_id=related_id,
            approval_metadata=metadata,
            created_by_id=created_by_id
        )
        
        self.db.add(approval)
        self.db.flush()
        
        if steps:
            for step_data in steps:
                step = ApprovalStep(
                    approval_id=approval.id,
                    step_order=step_data["step_order"],
                    step_name=step_data["step_name"],
                    step_type=step_data["step_type"],
                    approver_type=step_data["approver_type"],
                    approver_id=step_data.get("approver_id"),
                    approver_role=step_data.get("approver_role"),
                    status=ApprovalStepStatus.PENDING
                )
                self.db.add(step)
        
        self.db.commit()
        self.db.refresh(approval)
        
        return approval

    def create_approval_from_template(
        self,
        template_id: int,
        title: str,
        description: Optional[str] = None,
        related_type: Optional[str] = None,
        related_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        created_by_id: int = 0
    ) -> Approval:
        template = self.db.query(ApprovalFlowTemplate).filter(
            ApprovalFlowTemplate.id == template_id,
            ApprovalFlowTemplate.is_active == True
        ).first()
        
        if not template:
            raise ValueError("Approval flow template not found")
        
        approval = self.create_approval(
            title=title,
            description=description,
            flow_template_id=template_id,
            related_type=related_type,
            related_id=related_id,
            metadata=metadata,
            created_by_id=created_by_id
        )
        
        for step_config in template.steps_config:
            step = ApprovalStep(
                approval_id=approval.id,
                step_order=step_config["step_order"],
                step_name=step_config["step_name"],
                step_type=step_config["step_type"],
                approver_type=step_config["approver_type"],
                approver_id=step_config.get("approver_id"),
                approver_role=step_config.get("approver_role"),
                status=ApprovalStepStatus.PENDING
            )
            self.db.add(step)
        
        self.db.commit()
        self.db.refresh(approval)
        
        return approval

    def submit_approval(self, approval_id: int) -> Approval:
        approval = self.db.query(Approval).filter(
            Approval.id == approval_id
        ).first()
        
        if not approval:
            raise ValueError("Approval not found")
        
        if approval.status != ApprovalStatus.DRAFT:
            raise ValueError("Only draft approvals can be submitted")
        
        approval.status = ApprovalStatus.PENDING
        self._advance_approval(approval)
        
        self.db.commit()
        self.db.refresh(approval)
        
        return approval

    def _advance_approval(self, approval: Approval):
        steps = self.db.query(ApprovalStep).filter(
            ApprovalStep.approval_id == approval.id
        ).order_by(ApprovalStep.step_order).all()
        
        if not steps:
            approval.status = ApprovalStatus.APPROVED
            return
        
        all_approved = True
        for step in steps:
            if step.status == ApprovalStepStatus.PENDING:
                step.status = ApprovalStepStatus.IN_PROGRESS
                all_approved = False
                break
            elif step.status != ApprovalStepStatus.APPROVED:
                all_approved = False
        
        if all_approved:
            approval.status = ApprovalStatus.APPROVED
        else:
            approval.status = ApprovalStatus.IN_PROGRESS

    def process_step_action(
        self,
        approval_id: int,
        step_id: int,
        action: str,
        comment: Optional[str] = None,
        user_id: int = 0
    ) -> ApprovalStep:
        step = self.db.query(ApprovalStep).filter(
            ApprovalStep.id == step_id,
            ApprovalStep.approval_id == approval_id
        ).first()
        
        if not step:
            raise ValueError("Approval step not found")
        
        if step.status != ApprovalStepStatus.IN_PROGRESS:
            raise ValueError("Only in-progress steps can be acted on")
        
        from datetime import datetime
        
        if action == "approve":
            step.status = ApprovalStepStatus.APPROVED
        elif action == "reject":
            step.status = ApprovalStepStatus.REJECTED
        else:
            raise ValueError("Invalid action")
        
        step.approved_by_id = user_id
        step.approved_at = datetime.now()
        step.comment = comment
        
        approval = self.db.query(Approval).filter(
            Approval.id == approval_id
        ).first()
        
        if action == "reject":
            approval.status = ApprovalStatus.REJECTED
        else:
            self._advance_approval(approval)
        
        self.db.commit()
        self.db.refresh(step)
        
        return step

    def cancel_approval(self, approval_id: int) -> Approval:
        approval = self.db.query(Approval).filter(
            Approval.id == approval_id
        ).first()
        
        if not approval:
            raise ValueError("Approval not found")
        
        if approval.status in [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.CANCELLED]:
            raise ValueError("Cannot cancel completed approval")
        
        approval.status = ApprovalStatus.CANCELLED
        
        self.db.commit()
        self.db.refresh(approval)
        
        return approval

    def get_approval(self, approval_id: int) -> Optional[Approval]:
        return self.db.query(Approval).options(
            joinedload(Approval.steps)
        ).filter(Approval.id == approval_id).first()

    def list_approvals(
        self,
        created_by_id: Optional[int] = None,
        status: Optional[str] = None,
        related_type: Optional[str] = None,
        related_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Approval]:
        query = self.db.query(Approval)
        
        if created_by_id:
            query = query.filter(Approval.created_by_id == created_by_id)
        if status:
            query = query.filter(Approval.status == status)
        if related_type:
            query = query.filter(Approval.related_type == related_type)
        if related_id:
            query = query.filter(Approval.related_id == related_id)
        
        return query.order_by(Approval.created_at.desc()).offset(skip).limit(limit).all()

    def create_flow_template(
        self,
        name: str,
        description: Optional[str],
        flow_type: str,
        steps_config: List[Dict[str, Any]],
        created_by_id: Optional[int] = None
    ) -> ApprovalFlowTemplate:
        template = ApprovalFlowTemplate(
            name=name,
            description=description,
            flow_type=flow_type,
            steps_config=steps_config,
            is_active=True,
            is_system=False,
            created_by_id=created_by_id
        )
        
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        
        return template

    def list_flow_templates(
        self,
        flow_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ApprovalFlowTemplate]:
        query = self.db.query(ApprovalFlowTemplate)
        
        if flow_type:
            query = query.filter(ApprovalFlowTemplate.flow_type == flow_type)
        if is_active is not None:
            query = query.filter(ApprovalFlowTemplate.is_active == is_active)
        
        return query.order_by(ApprovalFlowTemplate.created_at.desc()).offset(skip).limit(limit).all()
