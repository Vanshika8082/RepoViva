from langchain_core.documents import Document
from pathlib import Path


def get_language(filename):
    extension = Path(filename).suffix.lower()

    languages = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".jsx": "javascript",
        ".tsx": "typescript",
        ".java": "java",
        ".cpp": "cpp",
        ".c": "c",
        ".h": "c",
        ".hpp": "cpp",
        ".go": "go",
        ".rs": "rust",
        ".rb": "ruby",
        ".php": "php",
        ".swift": "swift",
        ".kt": "kotlin",
        ".kts": "kotlin",
        ".scala": "scala",
        ".sh": "shell",
        ".r": "r",
        ".html": "html",
        ".css": "css",
        ".scss": "scss",
        ".json": "json",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".md": "markdown",
    }

    return languages.get(extension, "unknown")


def create_documents(files):
    documents = []

    for file in files:
        filename = file["filename"]
        content = file["content"]

        document = Document(
            page_content=content,
            metadata={
                "source": filename,
                "language": get_language(filename)
            }
        )

        documents.append(document)

    return documents