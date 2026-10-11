
from embeddings import create_embeddings
from mongodb import get_database


def search_similar_chunks(query, limit=5, repo_url=None):
    if not repo_url:
        raise ValueError(
            "repo_url is required for repository-specific retrieval."
        )

    normalized_repo_url = repo_url.strip().rstrip("/")

    db = get_database()
    collection = db["code_chunks"]

    embedding_model = create_embeddings()
    query_vector = embedding_model.embed_query(query)

    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": 100,
                "limit": limit,
                "filter": {
                    "repo_url": normalized_repo_url
                }
            }
        },
        {
            "$project": {
                "_id": 0,
                "content": 1,
                "source": 1,
                "language": 1,
                "repo_url": 1,
                "score": {
                    "$meta": "vectorSearchScore"
                }
            }
        }
    ]

    return list(collection.aggregate(pipeline))
