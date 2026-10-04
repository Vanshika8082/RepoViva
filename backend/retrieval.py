from embeddings import create_embeddings
from mongodb import get_database


def search_similar_chunks(query, limit=5):
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
                "numCandidates": 50,
                "limit": limit
            }
        },
        {
            "$project": {
                "_id": 0,
                "content": 1,
                "source": 1,
                "language": 1,
                "score": {
                    "$meta": "vectorSearchScore"
                }
            }
        }
    ]

    results = collection.aggregate(pipeline)

    return list(results)