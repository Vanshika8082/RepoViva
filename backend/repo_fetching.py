
# repo_fetching.py

import json
import os
from pathlib import PurePosixPath
from urllib.parse import urlparse

from dotenv import load_dotenv
from github import Github

load_dotenv()

token = os.getenv("GITHUB_TOKEN")
g = Github(token) if token else Github()

VALID_EXTENSIONS = (
    ".py", ".ipynb", ".js", ".jsx", ".ts", ".tsx",
    ".java", ".cpp", ".c", ".h", ".hpp", ".html",
    ".css", ".go", ".rb", ".php", ".rs", ".swift",
    ".kt", ".m", ".scala", ".sh", ".r", ".pl",
)

IGNORE_FOLDERS = {
    ".github", ".git", "node_modules", "venv", ".venv",
    "__pycache__", "dist", "build", "tests", "test",
    "docs", "examples", "scripts", ".next", "coverage",
}

# Keep the file-fetching behavior focused on source code.
def extract_ipynb_code(content):
    """Extract code cells from a Jupyter notebook."""
    try:
        notebook = json.loads(content)
        code_cells = []

        for cell in notebook.get("cells", []):
            if cell.get("cell_type") == "code":
                source = cell.get("source", [])
                code_cells.append(
                    "".join(source) if isinstance(source, list) else source
                )

        return "\n\n".join(code_cells)
    except (ValueError, TypeError, AttributeError):
        return ""


def _parse_repo_url(url):
    """Accept a GitHub URL or owner/repository."""
    value = url.strip()

    if "://" not in value:
        value = f"https://github.com/{value}"

    parsed = urlparse(value)

    if parsed.hostname not in {"github.com", "www.github.com"}:
        raise ValueError("Please provide a valid GitHub repository URL.")

    parts = [part for part in parsed.path.strip("/").split("/") if part]

    if len(parts) != 2:
        raise ValueError(
            "Use a URL like https://github.com/owner/repository"
        )

    owner, name = parts
    if name.endswith(".git"):
        name = name[:-4]

    return owner, name


def get_repository_metadata(url):
    """
    Return actual GitHub metadata and repository paths.
    The paths include manifests and configuration files, not just source code.
    """
    owner, name = _parse_repo_url(url)
    repo = g.get_repo(f"{owner}/{name}")

    tree = repo.get_git_tree(repo.default_branch, recursive=True)
    paths = []

    for item in tree.tree:
        if item.type != "blob":
            continue

        path = item.path
        parts = PurePosixPath(path).parts

        if any(part in IGNORE_FOLDERS for part in parts):
            continue

        paths.append(path)

    return {
        "repository_name": repo.name,
        "owner": repo.owner.login,
        "repository_url": repo.html_url.rstrip("/"),
        "description": repo.description or "",
        "default_branch": repo.default_branch,
        "languages": repo.get_languages(),
        "file_paths": paths,
    }


def fetch_repo(url):
    """Fetch supported source files, preserving the existing return shape."""
    owner, name = _parse_repo_url(url)
    repo = g.get_repo(f"{owner}/{name}")

    contents = list(repo.get_contents(""))
    files = []

    while contents:
        file_content = contents.pop(0)
        parts = PurePosixPath(file_content.path).parts

        if any(part in IGNORE_FOLDERS for part in parts):
            continue

        if file_content.type == "dir":
            contents.extend(repo.get_contents(file_content.path))
            continue

        if file_content.type != "file":
            continue

        if not file_content.name.lower().endswith(VALID_EXTENSIONS):
            continue

        try:
            decoded = file_content.decoded_content.decode("utf-8")

            if file_content.name.lower().endswith(".ipynb"):
                decoded = extract_ipynb_code(decoded)

            if decoded.strip():
                files.append({
                    "filename": file_content.path,
                    "content": decoded,
                })
        except (UnicodeDecodeError, ValueError):
            # Ignore binary files or files that cannot be decoded as text.
            continue

    return files
