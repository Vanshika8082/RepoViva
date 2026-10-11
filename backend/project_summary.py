
from retrieval import search_similar_chunks
from groq_client import generate_response


def generate_project_summary(repo_url):
    queries = [
        "What is this project about?",
        "What are the main features of this project?",
        "What technologies and architecture does this project use?"
    ]

    retrieved_chunks = []

    for query in queries:
        results = search_similar_chunks(
            query,
            limit=5,
            repo_url=repo_url
        )
        retrieved_chunks.extend(results)

    # Remove duplicate chunks returned by multiple queries.
    unique_chunks = {
        (chunk.get("repo_url"), chunk.get("source"), chunk.get("content")): chunk
        for chunk in retrieved_chunks
    }

    context = "\n\n".join(
        f"File: {chunk.get('source')}\n{chunk['content']}"
        for chunk in unique_chunks.values()
    )

    if not context:
        return "No code chunks were found for this repository."

    prompt = f"""
Analyze code from this GitHub repository: {repo_url}

Create a concise technical project summary covering:
1. What the project does
2. Main features
3. Technologies used
4. Important components
5. How the components work together

Only use information supported by the provided code.
Do not invent features.

Repository code:
{context}
"""

    return generate_response(prompt)
