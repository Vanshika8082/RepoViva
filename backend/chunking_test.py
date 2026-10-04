from repo_fetching import fetch_repo
from document_processor import create_documents
from chunking import chunk_documents


repo_url = "https://github.com/Vanshika8082/To-Do-List"

files = fetch_repo(repo_url)

documents = create_documents(files)

chunks = chunk_documents(documents)

print("Documents:", len(documents))
print("Chunks:", len(chunks))

for chunk in chunks[:5]:
    print("\nSource:", chunk.metadata["source"])
    print("Language:", chunk.metadata["language"])
    print("Content:", chunk.page_content[:200])
    print("-" * 50)