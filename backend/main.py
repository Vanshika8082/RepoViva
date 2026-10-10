
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from urllib.parse import urlparse

from repo_fetching import fetch_repo
from document_processor import create_documents
from project_summary import generate_project_summary
import uuid
from threading import Lock

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


def validate_github_url(repo_url: str) -> str:
    repo_url = repo_url.strip()

    # Also support owner/repository input.
    if "://" not in repo_url:
        repo_url = "https://github.com/" + repo_url

    parsed = urlparse(repo_url)

    if parsed.hostname not in {"github.com", "www.github.com"}:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid GitHub repository URL."
        )

    parts = [part for part in parsed.path.strip("/").split("/") if part]

    if len(parts) != 2:
        raise HTTPException(
            status_code=400,
            detail="Use a URL like https://github.com/owner/repository"
        )

    owner, repository = parts

    if repository.endswith(".git"):
        repository = repository[:-4]

    return f"https://github.com/{owner}/{repository}"


@app.get("/")
def home():
    return {"message": "RepoViva API is running"}


@app.post("/repos/analyze")
def analyze_repository(request: AnalyzeRequest):
    repo_url = validate_github_url(request.repo_url)

    try:
        # 1. Fetch repository source files.
        files = fetch_repo(repo_url)

        if not files:
            raise HTTPException(
                status_code=422,
                detail="No supported source files were found."
            )

        # 2. Convert source files into LangChain Documents.
        documents = create_documents(files)

        if not documents:
            raise HTTPException(
                status_code=422,
                detail="Could not create documents from repository files."
            )

        # 3. Generate a summary using your existing retrieval pipeline.
        # This requires the repository chunks to be stored in MongoDB.
        summary = generate_project_summary()

        return {
            "status": "success",
            "repository_url": repo_url,
            "files_found": len(files),
            "documents_created": len(documents),
            "project_summary": summary,
            "message": "Repository analysis completed."
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"Repository analysis failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Repository analysis failed. Check the backend terminal."
        )


from pydantic import BaseModel, Field
from fastapi import HTTPException


class StartInterviewRequest(BaseModel):
    repo_url: str
    difficulty: str = "medium"
    num_questions: int = Field(default=5, ge=1, le=10)



@app.post("/interviews")
def start_interview(request: StartInterviewRequest):
    difficulty = request.difficulty.lower().strip()

    if difficulty not in {"easy", "medium", "hard"}:
        raise HTTPException(
            status_code=400,
            detail="Difficulty must be easy, medium, or hard.",
        )

    try:
        session = InterviewSession(
            difficulty=difficulty,
            total_questions=request.num_questions,
        )

        first_question = session.start()
        session_id = str(uuid.uuid4())

        with sessions_lock:
            interview_sessions[session_id] = {
                "session": session,
                "repository_url": request.repo_url,
            }

        return {
            "status": "success",
            "session_id": session_id,
            "repository_url": request.repo_url,
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
            detail="Could not start the interview. Check the backend terminal.",
        )



from pydantic import BaseModel, Field


class SubmitAnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=20000)


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
            "feedback": result.get("feedback") if result["finished"] else None,
        }

    except Exception as exc:
        print(f"Failed to process interview answer: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Could not process your answer. Check the backend terminal.",
        )
