import os #to interact with the underlying operating system
from dotenv import load_dotenv #to load environment variables from a .env file
from github import Github #to interact with the GitHub API
import json #to parse JSON data

load_dotenv() #load environment variables from .env file

token = os.getenv("GITHUB_TOKEN") #get github token from .env

if token:
    g=Github(token) #initialize Github object with token
else:
    g=Github() #initialize Github object without token (unauthenticated)

valid_extensions = (
    ".py", ".ipynb", ".js", ".java", ".cpp", ".c", ".html", ".css", ".ts", ".go", ".rb", ".php", ".rs", ".swift", ".kt", ".m", ".scala", ".sh", ".r", ".pl",
)

ignore_folders = (
    ".github", ".git", "node_modules", "venv", "__pycache__", "dist", "build", "tests", "test", "docs", "examples", "scripts", "config", "configs",
)

def extract_ipynb_code(content):
    """
    Extract only code cells from Jupyter notebook JSON.
    """
    try:
        notebook = json.loads(content)
        code_cells = []

        for cell in notebook.get("cells", []):
            if cell.get("cell_type") == "code":
                code_cells.append("".join(cell.get("source", [])))

        return "\n\n".join(code_cells)

    except Exception:
        return ""

def fetch_repo(url):
    parts=url.strip().split('/') 
    repo_name=parts[-1] #get the repository name from the URL
    owner_name=parts[-2] #get the owner name from the URL

    repo=g.get_repo(f"{owner_name}/{repo_name}") 
    contents = repo.get_contents("")
    files=[]

    while contents:
        file_content=contents.pop(0)

        #ignoring unwanted files like readme etc
        if any(folder in file_content.path for folder in ignore_folders):
            continue

        if(file_content.type=="dir"):
            contents.extend(repo.get_contents(file_content.path))

        elif file_content.type == "file":

            if file_content.name.endswith(valid_extensions):
                try:
                    decoded = file_content.decoded_content.decode("utf-8")

                    # If notebook, extract only code
                    if file_content.name.endswith(".ipynb"):
                        decoded = extract_ipynb_code(decoded)

                    if decoded.strip():
                        files.append({
                            "filename": file_content.path,
                            "content": decoded
                        })

                except Exception:
                    pass
    return files