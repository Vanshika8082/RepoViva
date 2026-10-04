from embeddings import create_embeddings
from mongodb import get_database

def store_chunks(chunks):
    db = get_database()
    collection = db["code_chunks"]

    embedding_model = create_embeddings()

    texts = [chunk.page_content for chunk in chunks]

    vectors = embedding_model.embed_documents(texts)

    documents = []

    for chunk, vector in zip(chunks, vectors):
        documents.append({
            "content": chunk.page_content,
            "source": chunk.metadata.get("source"),
            "language": chunk.metadata.get("language"),
            "embedding": vector
        })

    if documents:
        collection.insert_many(documents)

    return len(documents)