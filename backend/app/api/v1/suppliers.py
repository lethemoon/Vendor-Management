from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.supplier import Supplier, SupplierStatus, SupplierDocument
from app.models.user import User
from app.schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierWithDocuments,
    SupplierDocumentCreate,
    SupplierDocumentResponse,
)
from app.dependencies import get_current_active_user

router = APIRouter(prefix="/api/v1/suppliers", tags=["suppliers"])


@router.get("", response_model=List[SupplierResponse])
def list_suppliers(
    skip: int = 0,
    limit: int = 100,
    status: Optional[SupplierStatus] = None,
    category: Optional[str] = None,
    industry: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Supplier).filter(Supplier.is_active == True)
    
    if status:
        query = query.filter(Supplier.status == status)
    if category:
        query = query.filter(Supplier.category == category)
    if industry:
        query = query.filter(Supplier.industry == industry)
    
    suppliers = query.offset(skip).limit(limit).all()
    return suppliers


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier_in: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if supplier_in.tax_id:
        existing_supplier = db.query(Supplier).filter(
            Supplier.tax_id == supplier_in.tax_id
        ).first()
        if existing_supplier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Supplier with this tax ID already exists"
            )
    
    supplier = Supplier(
        **supplier_in.model_dump(),
        created_by_id=current_user.id
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}", response_model=SupplierWithDocuments)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.is_active == True
    ).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    return supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    supplier_in: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.is_active == True
    ).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    if supplier_in.tax_id and supplier_in.tax_id != supplier.tax_id:
        existing_supplier = db.query(Supplier).filter(
            Supplier.tax_id == supplier_in.tax_id
        ).first()
        if existing_supplier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Supplier with this tax ID already exists"
            )
    
    update_data = supplier_in.model_dump(exclude_unset=True)
    update_data["updated_by_id"] = current_user.id
    
    for field, value in update_data.items():
        setattr(supplier, field, value)
    
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.is_active == True
    ).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    supplier.is_active = False
    supplier.updated_by_id = current_user.id
    db.commit()
    return None


@router.get("/{supplier_id}/documents", response_model=List[SupplierDocumentResponse])
def list_supplier_documents(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.is_active == True
    ).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    documents = db.query(SupplierDocument).filter(
        SupplierDocument.supplier_id == supplier_id
    ).all()
    return documents


@router.post("/{supplier_id}/documents", response_model=SupplierDocumentResponse, status_code=status.HTTP_201_CREATED)
def add_supplier_document(
    supplier_id: int,
    document_in: SupplierDocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.is_active == True
    ).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    document = SupplierDocument(
        **document_in.model_dump(),
        supplier_id=supplier_id,
        uploaded_by_id=current_user.id
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{supplier_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier_document(
    supplier_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    document = db.query(SupplierDocument).filter(
        SupplierDocument.id == document_id,
        SupplierDocument.supplier_id == supplier_id
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    db.delete(document)
    db.commit()
    return None
