from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.database.session import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True) # e.g. "repo-name-timestamp"
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, default="")
    framework = Column(String, default="nextjs")
    visibility = Column(String, default="private")
    status = Column(String, default="gathering_requirements") # gathering_requirements, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    requirements_path = Column(String, nullable=True)

    messages = relationship("ChatMessage", back_populates="project", cascade="all, delete-orphan")
    requirements_history = relationship("RequirementsHistory", back_populates="project", cascade="all, delete-orphan")

class RequirementsHistory(Base):
    __tablename__ = "requirements_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="requirements_history")

