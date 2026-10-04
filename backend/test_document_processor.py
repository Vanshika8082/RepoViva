from repo_fetching import fetch_repo
from document_processor import create_documents


repo_url = "https://github.com/Vanshika8082/To-Do-List"

files = fetch_repo(repo_url)

documents = create_documents(files)

print("Number of documents:", len(documents))
print()

for doc in documents[:5]:
    print("Source:", doc.metadata["source"])
    print("Language:", doc.metadata["language"])
    print("Content preview:", doc.page_content[:100])
    print("-" * 50)