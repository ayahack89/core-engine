from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

from app.database.session import get_db
from app.models.chat import ChatMessage
from app.models.project import Project
from app.schemas.chat import (
    ChatMessageCreate, 
    ChatMessageResponse, 
    ChatSessionResponse,
    RequirementsGenerateResponse
)
from app.services.ai_service import AIService
from app.services.project_service import ProjectService

router = APIRouter()

@router.get("/{project_id}/chat", response_model=ChatSessionResponse)
async def get_chat_session(
    project_id: str, 
    chat_type: str = "requirements", 
    db: AsyncSession = Depends(get_db)
):
    """Fetch the chat history (by type) and current requirements status for a project."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    # Get chat history filtered by type (requirements or coder)
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.project_id == project_id)
        .where(ChatMessage.chat_type == chat_type)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    
    # Read requirements file if generated
    requirements_content = None
    if project.status == "completed":
        requirements_content = await ProjectService.read_requirements_file(project_id)
        
    return ChatSessionResponse(
        project_id=project_id,
        messages=messages,
        requirements_generated=(project.status == "completed"),
        requirements_content=requirements_content
    )

@router.post("/{project_id}/chat", response_model=ChatMessageResponse)
async def send_chat_message(
    project_id: str, 
    message_in: ChatMessageCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Post a user message, trigger the appropriate Gemini assistant (analyst or coder), and store in DB."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
        
    # 1. Save user message with correct chat_type
    user_msg = ChatMessage(
        project_id=project_id,
        role="user",
        content=message_in.content,
        chat_type=message_in.chat_type
    )
    db.add(user_msg)
    await db.commit()
    
    # 2. Retrieve chat history of the same chat_type to send to Gemini
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.project_id == project_id)
        .where(ChatMessage.chat_type == message_in.chat_type)
        .order_by(ChatMessage.created_at.asc())
    )
    history_models = result.scalars().all()
    chat_history = [
        {"role": msg.role, "content": msg.content}
        for msg in history_models
    ]
    
    # 3. Call AIService depending on chat_type
    try:
        if message_in.chat_type == "coder":
            reply_text = await AIService.get_coder_reply(chat_history)
        else:
            reply_text = await AIService.get_chat_reply(chat_history)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate AI reply: {str(e)}"
        )
        
    # 4. Save assistant reply
    assistant_msg = ChatMessage(
        project_id=project_id,
        role="assistant",
        content=reply_text,
        chat_type=message_in.chat_type
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)
    
    return assistant_msg

@router.post("/{project_id}/requirements/generate", response_model=RequirementsGenerateResponse)
async def generate_requirements_document(project_id: str, db: AsyncSession = Depends(get_db)):
    """Generate requirements.md in the project folder from Phase 1 requirements chat."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
        
    # Fetch Phase 1 chat history (requirements gathering only)
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.project_id == project_id)
        .where(ChatMessage.chat_type == "requirements")
        .order_by(ChatMessage.created_at.asc())
    )
    history_models = result.scalars().all()
    if not history_models:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate requirements without any analyst conversation history."
        )
        
    chat_history = [
        {"role": msg.role, "content": msg.content}
        for msg in history_models
    ]
    
    # Generate requirements using AI
    try:
        requirements_content = await AIService.generate_requirements(chat_history)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate requirements document: {str(e)}"
        )
        
    # Save file on disk
    filepath = await ProjectService.save_requirements_file(project_id, requirements_content)
    
    # Update project status
    await ProjectService.update_project_status(db, project_id, "completed")
    
    return RequirementsGenerateResponse(
        success=True,
        requirements=requirements_content,
        filepath=filepath
    )

@router.post("/{project_id}/requirements/save")
async def save_requirements_document(project_id: str, content: dict, db: AsyncSession = Depends(get_db)):
    """Allows manual edits to requirements.md from the workspace."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
        
    md_content = content.get("content", "")
    await ProjectService.save_requirements_file(project_id, md_content)
    return {"success": True}

@router.get("/{project_id}/requirements/download")
async def download_requirements_document(project_id: str, db: AsyncSession = Depends(get_db)):
    """Download requirements.md as an attachment."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
        
    filepath = os.path.join(settings.PROJECTS_ROOT, project_id, "requirements.md")
    if not os.path.exists(filepath):
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail="Requirements document has not been generated yet."
         )
         
    return FileResponse(
        path=filepath, 
        media_type="text/markdown", 
        filename="requirements.md"
    )
