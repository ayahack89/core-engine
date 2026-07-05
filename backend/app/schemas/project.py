from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ProjectBase(BaseModel):
    name: str = Field(..., description="Lowercase, alphanumeric, dashes or underscores only")
    description: Optional[str] = ""
    framework: Optional[str] = "nextjs"
    visibility: Optional[str] = "private"

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    description: Optional[str] = None
    framework: Optional[str] = None
    visibility: Optional[str] = None
    status: Optional[str] = None
    requirements_path: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime
    requirements_path: Optional[str] = None

    class Config:
        from_attributes = True

class FileWriteRequest(BaseModel):
    path: str
    content: str

