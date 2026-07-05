import os
import shutil
from datetime import datetime
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.project import Project
from app.models.chat import ChatMessage
from app.schemas.project import ProjectCreate

class ProjectService:
    @staticmethod
    async def get_projects(db: AsyncSession):
        """Fetch all projects from the database, sorted by updated_at desc."""
        result = await db.execute(select(Project).order_by(Project.updated_at.desc()))
        return result.scalars().all()

    @staticmethod
    async def get_project(db: AsyncSession, project_id: str) -> Project:
        """Fetch a specific project by id."""
        result = await db.execute(select(Project).where(Project.id == project_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def create_project(db: AsyncSession, project_in: ProjectCreate) -> Project:
        """Create a new project in the database and bootstrap its directory with starter files."""
        clean_name = project_in.name.strip().lower()
        project_id = f"{clean_name}-{int(datetime.utcnow().timestamp())}"

        # Setup workspace folder
        project_dir = settings.PROJECTS_ROOT / project_id
        project_dir.mkdir(parents=True, exist_ok=True)

        # Write starter files depending on project type/framework
        try:
            (project_dir / "README.md").write_text(
                f"# {project_in.name}\n\n{project_in.description or 'A new project.'}\n", 
                encoding="utf-8"
            )

            # Framework specific files
            if project_in.framework == "nextjs":
                src_dir = project_dir / "src"
                src_dir.mkdir(parents=True, exist_ok=True)
                (src_dir / "page.js").write_text(
                    "\"use client\";\n\nexport default function Page() {\n  return (\n    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>\n      <h1>Welcome to " + project_in.name + "</h1>\n      <p>Bootstrap your application with requirements.md</p>\n    </div>\n  );\n}\n",
                    encoding="utf-8"
                )
                (project_dir / "package.json").write_text(
                    "{\n  \"name\": \"" + clean_name + "\",\n  \"version\": \"1.0.0\",\n  \"description\": \"" + (project_in.description or "") + "\",\n  \"dependencies\": {\n    \"next\": \"^14.0.0\",\n    \"react\": \"^18.2.0\"\n  }\n}\n",
                    encoding="utf-8"
                )
            else:
                # Python/other fallback files
                (project_dir / "main.py").write_text(
                    "def main():\n    print(\"Hello from " + project_in.name + "!\")\n\nif __name__ == \"__main__\":\n    main()\n",
                    encoding="utf-8"
                )
                (project_dir / "requirements.txt").write_text(
                    "fastapi>=0.110.0\nuvicorn>=0.28.0\n",
                    encoding="utf-8"
                )

            # Write standard requirements document draft
            (project_dir / "requirements.md").write_text(
                "# Requirements Specification\n\nUse the AI Chat Analyst panel to discuss and generate system requirements.",
                encoding="utf-8"
            )
        except Exception as e:
            # Log error but don't fail project creation
            print(f"Error creating starter files: {e}")

        # Create database entry
        db_project = Project(
            id=project_id,
            name=clean_name,
            description=project_in.description,
            framework=project_in.framework,
            visibility=project_in.visibility,
            status="gathering_requirements",
            requirements_path=str(project_dir / "requirements.md")
        )

        db.add(db_project)
        await db.commit()
        await db.refresh(db_project)
        return db_project

    @staticmethod
    async def update_project_status(db: AsyncSession, project_id: str, status: str) -> Project:
        """Update the status of a project."""
        project = await ProjectService.get_project(db, project_id)
        if project:
            project.status = status
            project.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(project)
        return project

    @staticmethod
    async def delete_project(db: AsyncSession, project_id: str) -> bool:
        """Delete a project from the database and remove its folder from the filesystem."""
        project = await ProjectService.get_project(db, project_id)
        if not project:
            return False

        # Remove from database
        await db.delete(project)
        await db.commit()

        # Remove workspace directory
        project_dir = settings.PROJECTS_ROOT / project_id
        if project_dir.exists() and project_dir.is_dir():
            shutil.rmtree(project_dir)

        return True

    @staticmethod
    async def save_requirements_file(project_id: str, content: str) -> str:
        """Write the requirements.md file inside the project workspace directory."""
        return await ProjectService.write_project_file(project_id, "requirements.md", content)

    @staticmethod
    async def read_requirements_file(project_id: str) -> str:
        """Read requirements.md from the project workspace directory."""
        return await ProjectService.read_project_file(project_id, "requirements.md")

    # ---- Extended General File Operations for VSCode Workspace ----

    @staticmethod
    async def list_project_files(project_id: str) -> list[str]:
        """Lists all files in the project folder recursively (relative to workspace root)."""
        project_dir = settings.PROJECTS_ROOT / project_id
        if not project_dir.exists():
            return []

        rel_paths = []
        for root, _, files in os.walk(project_dir):
            for file in files:
                filepath = Path(root) / file
                rel_path = filepath.relative_to(project_dir)
                rel_paths.append(str(rel_path))
        return sorted(rel_paths)

    @staticmethod
    async def read_project_file(project_id: str, relative_path: str) -> str:
        """Reads content of any file inside the project directory, preventing directory traversal."""
        project_dir = settings.PROJECTS_ROOT / project_id
        # Secure the path against directory traversal attacks
        safe_path = (project_dir / relative_path).resolve()
        if not safe_path.exists() or not safe_path.is_relative_to(project_dir.resolve()):
            return ""

        with open(safe_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    @staticmethod
    async def write_project_file(project_id: str, relative_path: str, content: str) -> str:
        """Writes content to any file inside the project directory, preventing directory traversal."""
        project_dir = settings.PROJECTS_ROOT / project_id
        safe_path = (project_dir / relative_path).resolve()
        
        # Ensure target resides inside the project root
        if not safe_path.is_relative_to(project_dir.resolve()):
            raise ValueError("Target path is outside the project workspace root.")

        # Ensure parent directory exists
        safe_path.parent.mkdir(parents=True, exist_ok=True)

        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(content)

        return str(safe_path)
