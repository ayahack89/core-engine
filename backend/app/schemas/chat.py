from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class ChatMessageBase(BaseModel):
    role: str # "user" or "assistant"
    content: str
    chat_type: str = "requirements" # "requirements" or "coder"

class ChatMessageCreate(BaseModel):
    content: str
    chat_type: str = "requirements"

class ChatMessageResponse(ChatMessageBase):
    id: int
    project_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class RequirementsGenerateResponse(BaseModel):
    success: bool
    requirements: str
    filepath: str

class RequirementsHistoryResponse(BaseModel):
    id: int
    project_id: str
    version: int
    content: str
    summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    project_id: str
    messages: List[ChatMessageResponse]
    requirements_generated: bool
    requirements_content: Optional[str] = None
    requirements_history: List[RequirementsHistoryResponse] = []

class ChatResponse(BaseModel):
    message: ChatMessageResponse
    requirements_content: Optional[str] = None
    requirements_history: List[RequirementsHistoryResponse] = []

