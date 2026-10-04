from retrieval import search_similar_chunks
from groq_client import generate_response


def generate_project_summary():
    queries = [
        "What is this project about?",
        "What are the main features of this project?",
        "What technologies and architecture does this project use?"
    ]

    retrieved_chunks = []

    for query in queries:
        results = search_similar_chunks(query, limit=5)
        retrieved_chunks.extend(results)

    context = "\n\n".join(
        f"File: {chunk['source']}\n{chunk['content']}"
        for chunk in retrieved_chunks
    )

    prompt = f"""
Analyze the following code from a GitHub repository.

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