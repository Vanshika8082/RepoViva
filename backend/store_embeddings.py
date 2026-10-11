
from embeddings import create_embeddings
from mongodb import get_database


def store_chunks(chunks, repo_url):
    db = get_database()
    collection = db["code_chunks"]

    embedding_model = create_embeddings()
    texts = [chunk.page_content for chunk in chunks]

    if not texts:
        return 0

    vectors = embedding_model.embed_documents(texts)
    documents = []

    for chunk, vector in zip(chunks, vectors):
        documents.append({
            "content": chunk.page_content,
            "source": chunk.metadata.get("source"),
            "language": chunk.metadata.get("language"),
            "repo_url": repo_url.rstrip("/"),
            "embedding": vector
        })

    # Replace the existing chunks for this repository only.
    collection.delete_many({"repo_url": repo_url.rstrip("/")})
    collection.insert_many(documents)

    return len(documents)
