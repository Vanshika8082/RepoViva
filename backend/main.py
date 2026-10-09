
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="RepoViva API")

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


@app.get("/")
def home():
    return {"message": "RepoViva API is running"}


@app.post("/repos/analyze")
def analyze_repository():
    return {
        "status": "success",
        "message": "Repository analysis endpoint reached"
    }
