from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from sqlalchemy.sql.schema import Table

from app.database import Base


class KnowledgeStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class KnowledgeType(str, enum.Enum):
    ARTICLE = "article"
    DOCUMENT = "document"
    FAQ = "faq"
    GUIDELINE = "guideline"


class PermissionLevel(str, enum.Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    RESTRICTED = "restricted"


# 多对多关系表
knowledge_tag_association = Table(
    'knowledge_tag_association',
    Base.metadata,
    Column('knowledge_id', Integer, ForeignKey('knowledge_bases.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('knowledge_tags.id'), primary_key=True),
    extend_existing=True
)


# 项目表
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    phases = relationship("Phase", back_populates="project", cascade="all, delete-orphan")
    knowledge_bases = relationship("KnowledgeBase", back_populates="project")


# 阶段表
class Phase(Base):
    __tablename__ = "phases"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    name = Column(String(255), nullable=False)
    order = Column(Integer, default=0)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("Project", back_populates="phases")
    knowledge_bases = relationship("KnowledgeBase", back_populates="phase")


class KnowledgeCategory(Base):
    __tablename__ = "knowledge_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey('knowledge_categories.id'))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    parent = relationship("KnowledgeCategory", remote_side=[id], backref="children")
    knowledge_bases = relationship("KnowledgeBase", back_populates="category")


class KnowledgeTag(Base):
    __tablename__ = "knowledge_tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    knowledge_bases = relationship(
        "KnowledgeBase",
        secondary=knowledge_tag_association,
        back_populates="tags"
    )


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    content = Column(Text)
    summary = Column(Text)
    type = Column(Enum(KnowledgeType), default=KnowledgeType.ARTICLE, nullable=False)
    status = Column(Enum(KnowledgeStatus), default=KnowledgeStatus.DRAFT, nullable=False)
    permission_level = Column(Enum(PermissionLevel), default=PermissionLevel.INTERNAL, nullable=False)
    category_id = Column(Integer, ForeignKey('knowledge_categories.id'))
    project_id = Column(Integer, ForeignKey('projects.id'))
    phase_id = Column(Integer, ForeignKey('phases.id'))
    supplier_id = Column(Integer, ForeignKey('suppliers.id'))
    survey_id = Column(Integer, ForeignKey('surveys.id'))
    author_id = Column(Integer, ForeignKey('users.id'))
    view_count = Column(Integer, default=0)
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    meta_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    published_at = Column(DateTime(timezone=True))

    category = relationship("KnowledgeCategory", back_populates="knowledge_bases")
    project = relationship("Project", back_populates="knowledge_bases")
    phase = relationship("Phase", back_populates="knowledge_bases")
    supplier = relationship("Supplier")
    survey = relationship("Survey")
    author = relationship("User")
    tags = relationship(
        "KnowledgeTag",
        secondary=knowledge_tag_association,
        back_populates="knowledge_bases"
    )
    attachments = relationship("KnowledgeAttachment", back_populates="knowledge", cascade="all, delete-orphan")


class KnowledgeAttachment(Base):
    __tablename__ = "knowledge_attachments"

    id = Column(Integer, primary_key=True, index=True)
    knowledge_id = Column(Integer, ForeignKey('knowledge_bases.id'), nullable=False)
    name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    uploaded_by_id = Column(Integer, ForeignKey('users.id'))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    knowledge = relationship("KnowledgeBase", back_populates="attachments")
    uploaded_by = relationship("User")
