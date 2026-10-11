
from retrieval import search_similar_chunks
from groq_client import generate_response


def generate_project_summary(repo_url):
    repo_url = repo_url.strip().rstrip("/")

    queries = [
        "What is this project about?",
        "What are the main features of this project?",
        "What technologies and architecture does this project use?"
    ]

    retrieved_chunks = {}

    for query in queries:
        results = search_similar_chunks(
            query=query,
            limit=5,
            repo_url=repo_url
        )

        for chunk in results:
            key = (chunk.get("source"), chunk.get("content"))
            retrieved_chunks[key] = chunk

    if not retrieved_chunks:
        raise ValueError(
            f"No stored code chunks found for repository: {repo_url}"
        )

    context = "\n\n".join(
        f"File: {chunk.get('source', 'Unknown')}\n"
        f"{chunk['content']}"
        for chunk in retrieved_chunks.values()
    )

    prompt = f"""
Analyze code from this GitHub repository: {repo_url}

Summarize:
1. What the project does
2. Main features
3. Technologies used
4. Important components
5. How the components work together

Only use information supported by the provided code.
Do not invent features or describe unrelated repositories.

Repository code:
{context}
"""

    return generate_response(prompt)
