from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.schemas.project import ProjectCreate, ProjectResponse, FileWriteRequest
from app.services.project_service import ProjectService

router = APIRouter()

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    """Retrieve all projects."""
    return await ProjectService.get_projects(db)

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve a single project."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    return project

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(project_in: ProjectCreate, db: AsyncSession = Depends(get_db)):
    """Create a new project workspace."""
    try:
        return await ProjectService.create_project(db, project_in)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create project: {str(e)}"
        )

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a project workspace."""
    success = await ProjectService.delete_project(db, project_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    return None

@router.get("/{project_id}/files", response_model=List[str])
async def list_project_files(project_id: str, db: AsyncSession = Depends(get_db)):
    """List all files in the project workspace."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    return await ProjectService.list_project_files(project_id)

@router.get("/{project_id}/files/read")
async def read_project_file(project_id: str, path: str, db: AsyncSession = Depends(get_db)):
    """Read content of a file in the project workspace."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    content = await ProjectService.read_project_file(project_id, path)
    return {"path": path, "content": content}

@router.post("/{project_id}/files/write")
async def write_project_file(project_id: str, file_in: FileWriteRequest, db: AsyncSession = Depends(get_db)):
    """Write/Save content to a file in the project workspace."""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    try:
        filepath = await ProjectService.write_project_file(project_id, file_in.path, file_in.content)
        return {"success": True, "path": file_in.path, "filepath": filepath}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to write file: {str(e)}"
        )

