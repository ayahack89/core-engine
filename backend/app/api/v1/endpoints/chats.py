from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import os
import logging
import json

from app.database.session import get_db, async_session_maker
from app.models.chat import ChatMessage
from app.models.project import Project, RequirementsHistory
from app.schemas.chat import (
    ChatMessageCreate, 
    ChatMessageResponse, 
    ChatSessionResponse,
    RequirementsGenerateResponse,
    ChatResponse,
    RequirementsHistoryResponse
)
from app.services.ai_service import AIService
from app.services.project_service import ProjectService
from app.core.config import settings
import asyncio
import re

logger = logging.getLogger(__name__)

def parse_files_from_response(text: str) -> list[dict]:
    pattern = r"===FILE:\s*([^\n\r]+)===(.*?)(?:===END_FILE===|$)"
    matches = re.findall(pattern, text, re.DOTALL)
    files = []
    for path, content in matches:
        files.append({
            "path": path.strip().replace("\\", "/"),
            "content": content.strip()
        })
    return files

async def install_dependencies(project_id: str, framework: str):
    project_dir = os.path.join(settings.PROJECTS_ROOT, project_id)
    if framework == "nextjs":
        command = "npm install --silent"
    else:
        req_file = os.path.join(project_dir, "requirements.txt")
        if not os.path.exists(req_file):
            return 0, "No requirements.txt found", ""
        pip_path = os.path.abspath(os.path.join(settings.PROJECTS_ROOT, "..", "backend", "venv", "bin", "pip"))
        if not os.path.exists(pip_path):
            pip_path = "pip"
        command = f"{pip_path} install -r requirements.txt"
    
    try:
        process = await asyncio.create_subprocess_shell(
            command,
            cwd=project_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        return process.returncode, stdout.decode(errors='ignore'), stderr.decode(errors='ignore')
    except Exception as e:
        return 1, "", str(e)

router = APIRouter()

@router.get("/{project_id}/chat", response_model=ChatSessionResponse)
async def get_chat_session(
    project_id: str, 
    chat_type: str = "requirements", 
    db: AsyncSession = Depends(get_db)
):
    """Fetch the chat history (by type), current requirements status, and requirements history for a project."""
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
    
    # Read requirements file
    requirements_content = None
    if chat_type == "requirements" or project.status == "completed":
        try:
            requirements_content = await ProjectService.read_requirements_file(project_id)
        except Exception:
            requirements_content = None
            
    # Get requirements history
    result_history = await db.execute(
        select(RequirementsHistory)
        .where(RequirementsHistory.project_id == project_id)
        .order_by(RequirementsHistory.version.desc())
    )
    requirements_history = result_history.scalars().all()
    
    # Bootstrap default requirements file if empty and in requirements mode
    if chat_type == "requirements" and not requirements_content:
        requirements_content = f"# Project Specification: {project.name}\n\nUse the chat panel in the middle to discuss requirements. The specifications will compile here in real-time."
        await ProjectService.save_requirements_file(project_id, requirements_content)
        
        # Seed initial version in history if empty
        if not requirements_history:
            initial_history = RequirementsHistory(
                project_id=project_id,
                version=1,
                content=requirements_content,
                summary="Initial setup"
            )
            db.add(initial_history)
            await db.commit()
            
            # Re-fetch history
            result_history = await db.execute(
                select(RequirementsHistory)
                .where(RequirementsHistory.project_id == project_id)
                .order_by(RequirementsHistory.version.desc())
            )
            requirements_history = result_history.scalars().all()

    # Seed initial greeting if messages list is empty
    if chat_type == "requirements" and not messages:
        initial_msg = ChatMessage(
            project_id=project_id,
            role="assistant",
            content=f"Hello! I am your Product Analyst and User Query Optimizer Engine. Let's design your new project: {project.name}. What is the core idea of your project and who are its target users?",
            chat_type="requirements"
        )
        db.add(initial_msg)
        await db.commit()
        
        # Re-fetch messages
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.project_id == project_id)
            .where(ChatMessage.chat_type == chat_type)
            .order_by(ChatMessage.created_at.asc())
        )
        messages = result.scalars().all()
        
    return ChatSessionResponse(
        project_id=project_id,
        messages=messages,
        requirements_generated=True,
        requirements_content=requirements_content,
        requirements_history=requirements_history
    )

@router.post("/{project_id}/chat", response_model=ChatResponse)
async def send_chat_message(
    project_id: str, 
    message_in: ChatMessageCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Post a user message, trigger the appropriate OpenRouter assistant, update requirements in real-time, and store in DB."""
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
    
    # 2. Retrieve chat history of the same chat_type to send to OpenRouter
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
    
    requirements_content = None
    requirements_history_list = []
    
    # 3. Call AIService depending on chat_type
    try:
        if message_in.chat_type == "coder":
            reply_text = await AIService.get_coder_reply(chat_history)
        else:
            # For requirements gathering, read the current requirements.md from workspace
            try:
                current_reqs = await ProjectService.read_requirements_file(project_id)
            except Exception:
                current_reqs = ""
            
            ai_data = await AIService.get_chat_reply(chat_history, current_reqs)
            reply_text = ai_data["chat_reply"]
            new_reqs = ai_data["requirements"]
            
            # If updated requirements are returned and are different from current, save them
            if new_reqs and new_reqs.strip() != current_reqs.strip():
                await ProjectService.save_requirements_file(project_id, new_reqs)
                requirements_content = new_reqs
                
                # Fetch max version to increment
                result_max = await db.execute(
                    select(RequirementsHistory.version)
                    .where(RequirementsHistory.project_id == project_id)
                    .order_by(RequirementsHistory.version.desc())
                    .limit(1)
                )
                max_ver = result_max.scalar_one_or_none() or 0
                next_ver = max_ver + 1
                
                # Add revision record
                new_rev = RequirementsHistory(
                    project_id=project_id,
                    version=next_ver,
                    content=new_reqs,
                    summary=f"Refined after chat: '{message_in.content[:40]}...'"
                )
                db.add(new_rev)
                await db.commit()
            else:
                requirements_content = current_reqs
                
            # Get updated requirements history list
            result_history = await db.execute(
                select(RequirementsHistory)
                .where(RequirementsHistory.project_id == project_id)
                .order_by(RequirementsHistory.version.desc())
            )
            requirements_history_list = result_history.scalars().all()
            
    except Exception as e:
        logger.error(f"Failed to generate AI reply: {e}", exc_info=True)
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
    
    return ChatResponse(
        message=assistant_msg,
        requirements_content=requirements_content,
        requirements_history=requirements_history_list
    )

@router.post("/{project_id}/chat/stream")
async def stream_chat_message(
    project_id: str,
    message_in: ChatMessageCreate,
    db: AsyncSession = Depends(get_db)
):
    """Post a user message, stream OpenRouter reply, update requirements in real-time."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
        
    # 1. Save user message
    user_msg = ChatMessage(
        project_id=project_id,
        role="user",
        content=message_in.content,
        chat_type=message_in.chat_type
    )
    db.add(user_msg)
    await db.commit()
    
    # 2. Retrieve history
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
    
    try:
        current_reqs = await ProjectService.read_requirements_file(project_id)
    except Exception:
        current_reqs = ""
        
    async def event_generator():
        full_response = ""
        try:
            if message_in.chat_type == "coder":
                # Build workspace context recursively
                try:
                    files_list = await ProjectService.list_project_files(project_id)
                    workspace_files_content = []
                    for f in files_list:
                        content = await ProjectService.read_project_file(project_id, f)
                        if len(content) > 10000:
                            content = content[:10000] + "\n[Content truncated...]"
                        workspace_files_content.append(f"--- FILE: {f} ---\n{content}\n")
                    workspace_context = "\n".join(workspace_files_content)
                except Exception as ctx_err:
                    logger.error(f"Error loading project workspace context: {ctx_err}")
                    workspace_context = "No files in project."
                
                async for chunk in AIService.stream_coder_reply(chat_history, workspace_context, model=message_in.model):
                    yield chunk
                    if chunk.startswith("data: "):
                        try:
                            chunk_json = json.loads(chunk[6:].strip())
                            if "content" in chunk_json:
                                full_response += chunk_json["content"]
                        except Exception:
                            pass
            else:
                async for chunk in AIService.stream_chat_reply(chat_history, current_reqs, model=message_in.model):
                    yield chunk
                    if chunk.startswith("data: "):
                        try:
                            chunk_json = json.loads(chunk[6:].strip())
                            if "content" in chunk_json:
                                full_response += chunk_json["content"]
                        except Exception:
                            pass
            
            # Post-processing after complete stream is received
            if full_response:
                if message_in.chat_type == "coder":
                    # Parse file blocks from the response
                    files_to_write = parse_files_from_response(full_response)
                    if files_to_write:
                        yield f"data: {json.dumps({'content': '\n\n🛠️ **[Agent Mode] Writing generated files to workspace...**\n'})}\n\n"
                        await asyncio.sleep(0.1)
                        
                        package_json_updated = False
                        requirements_txt_updated = False
                        
                        for file_info in files_to_write:
                            path = file_info["path"]
                            content = file_info["content"]
                            
                            yield f"data: {json.dumps({'content': f'- Writing `{path}`... '})}\n\n"
                            try:
                                await ProjectService.write_project_file(project_id, path, content)
                                yield f"data: {json.dumps({'content': '✅ Done\n', 'files_updated': True})}\n\n"
                                
                                if path == "package.json":
                                    package_json_updated = True
                                elif path == "requirements.txt":
                                    requirements_txt_updated = True
                            except Exception as file_err:
                                yield f"data: {json.dumps({'content': f'❌ Failed: {str(file_err)}\n'})}\n\n"
                                
                        # Run dependency installations if package.json or requirements.txt was updated
                        if package_json_updated or requirements_txt_updated:
                            yield f"data: {json.dumps({'content': '\n📦 **[Agent Mode] Dependencies updated. Installing packages...**\n'})}\n\n"
                            
                            async with async_session_maker() as session:
                                proj_model = await ProjectService.get_project(session, project_id)
                                framework = proj_model.framework if proj_model else "python"
                            
                            yield f"data: {json.dumps({'content': f'Running package manager for {framework}... '})}\n\n"
                            
                            try:
                                returncode, stdout, stderr = await install_dependencies(project_id, framework)
                                if returncode == 0:
                                    yield f"data: {json.dumps({'content': '✅ Packages installed successfully.\n'})}\n\n"
                                else:
                                    yield f"data: {json.dumps({'content': f'❌ Install returned status {returncode}.\nDetails: {stderr or stdout}\n'})}\n\n"
                            except Exception as inst_err:
                                yield f"data: {json.dumps({'content': f'❌ Failed to run install command: {str(inst_err)}\n'})}\n\n"

                    # Save coder assistant reply in DB
                    async with async_session_maker() as session:
                        assistant_msg = ChatMessage(
                            project_id=project_id,
                            role="assistant",
                            content=full_response,
                            chat_type="coder"
                        )
                        session.add(assistant_msg)
                        await session.commit()
                else:
                    parsed = AIService.parse_ai_response(full_response)
                    reply_text = parsed["chat_reply"]
                    new_reqs = parsed["requirements"]
                    
                    async with async_session_maker() as session:
                        assistant_msg = ChatMessage(
                            project_id=project_id,
                            role="assistant",
                            content=reply_text,
                            chat_type="requirements"
                        )
                        session.add(assistant_msg)
                        
                        if new_reqs and new_reqs.strip() != current_reqs.strip():
                            await ProjectService.save_requirements_file(project_id, new_reqs)
                            
                            # Fetch max version to increment
                            result_max = await session.execute(
                                select(RequirementsHistory.version)
                                .where(RequirementsHistory.project_id == project_id)
                                .order_by(RequirementsHistory.version.desc())
                                .limit(1)
                            )
                            max_ver = result_max.scalar_one_or_none() or 0
                            next_ver = max_ver + 1
                            
                            new_rev = RequirementsHistory(
                                project_id=project_id,
                                version=next_ver,
                                content=new_reqs,
                                summary=f"Refined after chat: '{message_in.content[:40]}...'"
                            )
                            session.add(new_rev)
                            
                        await session.commit()
            
            # Yield done packet to signal database operations are fully committed
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            logger.error(f"Error in stream event generator: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/{project_id}/requirements/revert/{version}", response_model=ChatSessionResponse)
async def revert_requirements_version(
    project_id: str,
    version: int,
    db: AsyncSession = Depends(get_db)
):
    """Revert the requirements.md content to a specific historical version."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    # Fetch historical requirements version
    result = await db.execute(
        select(RequirementsHistory)
        .where(RequirementsHistory.project_id == project_id)
        .where(RequirementsHistory.version == version)
    )
    historical = result.scalar_one_or_none()
    if not historical:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {version} of requirements not found"
        )
        
    # Re-save on disk
    await ProjectService.save_requirements_file(project_id, historical.content)
    
    # Add a new version in history detailing the revert
    result_max_version = await db.execute(
        select(RequirementsHistory.version)
        .where(RequirementsHistory.project_id == project_id)
        .order_by(RequirementsHistory.version.desc())
        .limit(1)
    )
    max_version = result_max_version.scalar_one_or_none() or 0
    next_version = max_version + 1
    
    new_revision = RequirementsHistory(
        project_id=project_id,
        version=next_version,
        content=historical.content,
        summary=f"Reverted to Version {version}",
    )
    db.add(new_revision)
    await db.commit()
    
    # Get updated history list
    result_history = await db.execute(
        select(RequirementsHistory)
        .where(RequirementsHistory.project_id == project_id)
        .order_by(RequirementsHistory.version.desc())
    )
    history_models = result_history.scalars().all()
    
    # Get chat history
    result_chat = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.project_id == project_id)
        .where(ChatMessage.chat_type == "requirements")
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result_chat.scalars().all()
    
    return ChatSessionResponse(
        project_id=project_id,
        messages=messages,
        requirements_generated=True,
        requirements_content=historical.content,
        requirements_history=history_models
    )

@router.post("/{project_id}/chat/reset", response_model=ChatSessionResponse)
async def reset_requirements_chat(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Reset requirements gathering chat messages and restore requirements.md to initial setup."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
        
    # Delete all requirements chat messages for this project
    await db.execute(
        delete(ChatMessage)
        .where(ChatMessage.project_id == project_id)
        .where(ChatMessage.chat_type == "requirements")
    )
    
    # Set default text
    default_text = f"# Project Specification: {project.name}\n\nUse the chat panel in the middle to discuss requirements. The specifications will compile here in real-time."
    await ProjectService.save_requirements_file(project_id, default_text)
    
    # Create a fresh version in requirements history
    result_max_version = await db.execute(
        select(RequirementsHistory.version)
        .where(RequirementsHistory.project_id == project_id)
        .order_by(RequirementsHistory.version.desc())
        .limit(1)
    )
    max_version = result_max_version.scalar_one_or_none() or 0
    next_version = max_version + 1
    
    new_revision = RequirementsHistory(
        project_id=project_id,
        version=next_version,
        content=default_text,
        summary="Reset project requirements to initial state"
    )
    db.add(new_revision)
    
    # Add a fresh initial assistant greeting
    initial_msg = ChatMessage(
        project_id=project_id,
        role="assistant",
        content=f"Hello! I am your Product Analyst and User Query Optimizer Engine. Let's design your new project: {project.name}. What is the core idea of your project and who are its target users?",
        chat_type="requirements"
    )
    db.add(initial_msg)
    await db.commit()
    
    # Fetch updated history list
    result_history = await db.execute(
        select(RequirementsHistory)
        .where(RequirementsHistory.project_id == project_id)
        .order_by(RequirementsHistory.version.desc())
    )
    history_models = result_history.scalars().all()
    
    # Fetch updated messages list
    result_chat = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.project_id == project_id)
        .where(ChatMessage.chat_type == "requirements")
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result_chat.scalars().all()
    
    return ChatSessionResponse(
        project_id=project_id,
        messages=messages,
        requirements_generated=True,
        requirements_content=default_text,
        requirements_history=history_models
    )

@router.post("/{project_id}/requirements/generate", response_model=RequirementsGenerateResponse)
async def generate_requirements_document(project_id: str, db: AsyncSession = Depends(get_db)):
    """Generate requirements.md in the project folder from Phase 1 requirements chat manually."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
        
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
    
    try:
        requirements_content = await AIService.generate_requirements(chat_history)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate requirements document: {str(e)}"
        )
        
    filepath = await ProjectService.save_requirements_file(project_id, requirements_content)
    await ProjectService.update_project_status(db, project_id, "completed")
    
    # Add a history version
    result_max_version = await db.execute(
        select(RequirementsHistory.version)
        .where(RequirementsHistory.project_id == project_id)
        .order_by(RequirementsHistory.version.desc())
        .limit(1)
    )
    max_version = result_max_version.scalar_one_or_none() or 0
    next_version = max_version + 1
    
    new_revision = RequirementsHistory(
        project_id=project_id,
        version=next_version,
        content=requirements_content,
        summary="Compiled full specification document"
    )
    db.add(new_revision)
    await db.commit()
    
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
    
    # Add a history version
    result_max_version = await db.execute(
        select(RequirementsHistory.version)
        .where(RequirementsHistory.project_id == project_id)
        .order_by(RequirementsHistory.version.desc())
        .limit(1)
    )
    max_version = result_max_version.scalar_one_or_none() or 0
    next_version = max_version + 1
    
    new_revision = RequirementsHistory(
        project_id=project_id,
        version=next_version,
        content=md_content,
        summary="Manual edit in workspace"
    )
    db.add(new_revision)
    await db.commit()
    
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

@router.get("/{project_id}/requirements/live")
async def get_live_requirements(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the current live requirements.md content for a project."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    try:
        content = await ProjectService.read_requirements_file(project_id)
    except Exception:
        content = ""
    return {"project_id": project_id, "content": content}
