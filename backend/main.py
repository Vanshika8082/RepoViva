
# main.py

import re
import uuid
from pathlib import PurePosixPath
from threading import Lock
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from repo_fetching import fetch_repo, get_repository_metadata
from document_processor import create_documents
from chunking import chunk_documents
from store_embeddings import store_chunks
from project_summary import generate_project_summary
from interview_session import InterviewSession


app = FastAPI(title="RepoViva API")
interview_sessions = {}
sessions_lock = Lock()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    repo_url: str = Field(min_length=1)


class StartInterviewRequest(BaseModel):
    repo_url: str = Field(min_length=1)
    difficulty: str = "medium"
    num_questions: int = Field(default=5, ge=1, le=10)


class SubmitAnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=20000)


def validate_github_url(repo_url: str) -> str:
    repo_url = repo_url.strip()

    if "://" not in repo_url:
        repo_url = "https://github.com/" + repo_url

    parsed = urlparse(repo_url)

    if parsed.hostname not in {"github.com", "www.github.com"}:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid GitHub repository URL.",
        )

    parts = [part for part in parsed.path.strip("/").split("/") if part]

    if len(parts) != 2:
        raise HTTPException(
            status_code=400,
            detail="Use a URL like https://github.com/owner/repository",
        )

    owner, repository = parts

    if repository.endswith(".git"):
        repository = repository[:-4]

    return f"https://github.com/{owner}/{repository}"


def ingest_repository(repo_url):
    files = fetch_repo(repo_url)

    if not files:
        raise HTTPException(
            status_code=422,
            detail="No supported source files were found.",
        )

    documents = create_documents(files)

    if not documents:
        raise HTTPException(
            status_code=422,
            detail="Could not create documents from repository files.",
        )

    chunks = chunk_documents(documents)

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="No code chunks were created.",
        )

    stored_count = store_chunks(chunks, repo_url)

    return files, len(documents), len(chunks), stored_count


def detect_tools_and_frameworks(file_paths, source_files):
    """
    Infer likely technologies from repository filenames and source text.
    These are indicators, not proof that a dependency is installed.
    """
    paths_lower = [path.lower() for path in file_paths]
    source_text = "\n".join(
        item.get("content", "") for item in source_files
    ).lower()

    detected = set()

    path_checks = {
        "Next.js": ["next.config.js", "next.config.mjs", "next.config.ts"],
        "Vite": ["vite.config.js", "vite.config.ts", "vite.config.mjs"],
        "Tailwind CSS": [
            "tailwind.config.js",
            "tailwind.config.ts",
            "postcss.config.js",
        ],
        "Docker": ["dockerfile", "docker-compose.yml", "compose.yml"],
        "GitHub Actions": [".github/workflows/"],
        "Jupyter": [".ipynb"],
    }

    for tool, indicators in path_checks.items():
        if any(
            any(path.endswith(indicator) for path in paths_lower)
            if not indicator.startswith(".github/")
            else any(indicator in path for path in paths_lower)
            for indicator in indicators
        ):
            detected.add(tool)

    source_checks = {
        "FastAPI": [r"\bfrom fastapi\b", r"\bimport fastapi\b"],
        "Flask": [r"\bfrom flask\b", r"\bimport flask\b"],
        "Django": [r"\bfrom django\b", r"\bimport django\b"],
        "React": [r"\bfrom\s+['\"]react['\"]", r"\breactdom\b"],
        "Express.js": [r"\bfrom\s+['\"]express['\"]", r"\brequire\(['\"]express"],
        "LangChain": [r"\blangchain\b"],
        "PyTorch": [r"\bimport torch\b", r"\bfrom torch\b"],
        "TensorFlow": [r"\bimport tensorflow\b", r"\bfrom tensorflow\b"],
        "scikit-learn": [r"\bsklearn\b"],
        "MongoDB": [r"\bpymongo\b", r"\bmongodb\b", r"\bmongoose\b"],
        "Groq": [r"\bgroq\b"],
        "OpenAI API": [r"\bfrom openai\b", r"\bimport openai\b"],
        "Pandas": [r"\bimport pandas\b", r"\bfrom pandas\b"],
        "NumPy": [r"\bimport numpy\b", r"\bfrom numpy\b"],
        "SQLAlchemy": [r"\bsqlalchemy\b"],
    }

    for tool, patterns in source_checks.items():
        if any(re.search(pattern, source_text) for pattern in patterns):
            detected.add(tool)

    extension_checks = {
        ".py": "Python",
        ".tsx": "React / TypeScript",
        ".jsx": "React / JavaScript",
    }

    for path in paths_lower:
        for extension, technology in extension_checks.items():
            if path.endswith(extension):
                detected.add(technology)

    return sorted(detected)


def describe_file(path):
    """Provide a conservative description based on a file's name and path."""
    name = PurePosixPath(path).name.lower()
    parts = [part.lower() for part in PurePosixPath(path).parts]

    known_descriptions = {
        "main.py": "Potential application entry point or API routes.",
        "app.py": "Potential application entry point.",
        "server.py": "Potential server entry point.",
        "requirements.txt": "Python dependency list.",
        "pyproject.toml": "Python project configuration and dependencies.",
        "package.json": "JavaScript project scripts and dependencies.",
        "readme.md": "Project documentation and setup instructions.",
        "dockerfile": "Instructions for building a Docker image.",
        "docker-compose.yml": "Docker service configuration.",
        "next.config.js": "Next.js configuration.",
        "next.config.mjs": "Next.js configuration.",
        "vite.config.ts": "Vite configuration.",
        "vite.config.js": "Vite configuration.",
        "tsconfig.json": "TypeScript configuration.",
        "pytest.ini": "Pytest configuration.",
        "makefile": "Build and development commands.",
    }

    if name in known_descriptions:
        return known_descriptions[name]

    if "routes" in parts or "routers" in parts:
        return "Likely API routing module; verify its definitions in the source."

    if "components" in parts:
        return "Frontend component file based on its directory location."

    if "models" in parts:
        return "Likely data model or schema module."

    if "services" in parts:
        return "Likely service or business-logic module."

    if "utils" in parts or "helpers" in parts:
        return "Utility or helper module based on its directory location."

    return "Source file included in repository analysis."


def select_important_files(file_paths, source_files, limit=12):
    """
    Rank files using names, project configuration, and source-file availability.
    Descriptions are intentionally conservative.
    """
    source_by_path = {
        item.get("filename", ""): item.get("content", "")
        for item in source_files
    }

    ranked = []

    for path in file_paths:
        name = PurePosixPath(path).name.lower()
        score = 0

        if name in {
            "main.py", "app.py", "server.py", "index.ts",
            "index.tsx", "page.tsx", "layout.tsx", "package.json",
            "requirements.txt", "pyproject.toml", "readme.md",
            "dockerfile",
        }:
            score += 10

        if any(
            term in name
            for term in (
                "interview", "engine", "route", "api", "model",
                "service", "controller", "config", "database",
            )
        ):
            score += 5

        if path in source_by_path:
            score += 2

        # Avoid filling the overview with uninformative asset files.
        if PurePosixPath(path).suffix.lower() in {
            ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
            ".woff", ".woff2", ".lock",
        }:
            continue

        ranked.append((score, path))

    ranked.sort(key=lambda item: (-item[0], item[1]))

    return [
        {
            "path": path,
            "purpose": describe_file(path),
        }
        for score, path in ranked[:limit]
    ]


def extract_components(source_files, limit=20):
    """
    Extract names of Python classes/functions and common JS/TS declarations.
    Names are taken from source text; descriptions are not AI-generated here.
    """
    found = []
    seen = set()

    patterns = [
        (
            "Python class",
            re.compile(r"^\s*class\s+([A-Za-z_]\w*)", re.MULTILINE),
        ),
        (
            "Python function",
            re.compile(r"^\s*def\s+([A-Za-z_]\w*)\s*\(", re.MULTILINE),
        ),
        (
            "JavaScript/TypeScript class",
            re.compile(r"^\s*(?:export\s+)?class\s+([A-Za-z_]\w*)", re.MULTILINE),
        ),
        (
            "JavaScript/TypeScript function",
            re.compile(
                r"^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(",
                re.MULTILINE,
            ),
        ),
        (
            "React component",
            re.compile(
                r"^\s*export\s+default\s+function\s+([A-Z]\w*)|"
                r"^\s*export\s+(?:const|function)\s+([A-Z]\w*)",
                re.MULTILINE,
            ),
        ),
    ]

    for item in source_files:
        path = item.get("filename", "Unknown")
        content = item.get("content", "")

        for kind, pattern in patterns:
            for match in pattern.finditer(content):
                name = next(
                    (group for group in match.groups() if group),
                    None,
                )

                if not name or name.startswith("_"):
                    continue

                key = (path, name)

                if key in seen:
                    continue

                seen.add(key)
                found.append({
                    "name": name,
                    "file": path,
                    "type": kind,
                })

                if len(found) >= limit:
                    return found

    return found


@app.get("/")
def home():
    return {"message": "RepoViva API is running"}


@app.post("/repos/analyze")
def analyze_repository(request: AnalyzeRequest):
    repo_url = validate_github_url(request.repo_url)

    try:
        metadata = get_repository_metadata(repo_url)

        files, docs_count, chunks_count, stored_count = (
            ingest_repository(repo_url)
        )

        file_paths = metadata["file_paths"]
        languages = metadata["languages"]

        summary = generate_project_summary(repo_url)

        tools = detect_tools_and_frameworks(file_paths, files)
        important_files = select_important_files(file_paths, files)
        components = extract_components(files)

        return {
            "status": "success",
            "repository_url": metadata["repository_url"],
            "repository_name": metadata["repository_name"],
            "owner": metadata["owner"],
            "description": metadata["description"],
            "default_branch": metadata["default_branch"],
            "languages": languages,
            "tools_and_frameworks": tools,
            "important_files": important_files,
            "components": components,
            "project_summary": summary,
            "files_found": len(files),
            "documents_created": docs_count,
            "chunks_created": chunks_count,
            "chunks_stored": stored_count,
            "message": "Repository analysis completed.",
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"Repository analysis failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Repository analysis failed: {exc}",
        )


@app.post("/interviews")
def start_interview(request: StartInterviewRequest):
    repo_url = validate_github_url(request.repo_url)
    difficulty = request.difficulty.lower().strip()

    if difficulty not in {"easy", "medium", "hard"}:
        raise HTTPException(
            status_code=400,
            detail="Difficulty must be easy, medium, or hard.",
        )

    try:
        # Preserve the existing behavior of ingesting before an interview.
        ingest_repository(repo_url)

        session = InterviewSession(
            difficulty=difficulty,
            total_questions=request.num_questions,
            repo_url=repo_url,
        )

        first_question = session.start()
        session_id = str(uuid.uuid4())

        with sessions_lock:
            interview_sessions[session_id] = {
                "session": session,
                "repository_url": repo_url,
            }

        return {
            "status": "success",
            "session_id": session_id,
            "repository_url": repo_url,
            "difficulty": difficulty,
            "num_questions": request.num_questions,
            "question": first_question,
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"Failed to start interview: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Could not start interview: {exc}",
        )


@app.get("/interviews/{session_id}")
def get_interview(session_id: str):
    with sessions_lock:
        entry = interview_sessions.get(session_id)

    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found. Please start a new interview.",
        )

    session = entry["session"]

    return {
        "session_id": session_id,
        "repository_url": entry["repository_url"],
        "difficulty": session.difficulty,
        "total_questions": session.total_questions,
        "question_number": session.question_number,
        "question": session.current_prompt,
        "completed": session.completed,
    }


@app.post("/interviews/{session_id}/answer")
def submit_interview_answer(
    session_id: str,
    request: SubmitAnswerRequest,
):
    with sessions_lock:
        entry = interview_sessions.get(session_id)

    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found. Please start a new interview.",
        )

    session = entry["session"]

    if session.completed:
        raise HTTPException(
            status_code=400,
            detail="This interview has already been completed.",
        )

    if session.current_record is None:
        raise HTTPException(
            status_code=400,
            detail="The interview has not started correctly.",
        )

    try:
        result = session.submit_answer(request.answer.strip())

        return {
            "session_id": session_id,
            "type": result["type"],
            "message": result["message"],
            "finished": result["finished"],
            "difficulty": session.difficulty,
            "question_number": session.question_number,
            "total_questions": session.total_questions,
            "feedback": (
                result.get("feedback") if result["finished"] else None
            ),
        }

    except Exception as exc:
        print(f"Failed to process interview answer: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Could not process your answer. Check the backend terminal.",
        )
