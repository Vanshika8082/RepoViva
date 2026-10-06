RepoViva
AI-powered technical interviews based on your own GitHub projects.

RepoViva is an AI-powered technical interview preparation platform that analyzes a user's GitHub repository and generates a realistic, project-specific technical interview.
Instead of asking generic interview questions, RepoViva understands the candidate's actual codebase and asks questions based on their implementation, architecture, technologies, and technical decisions.
🚀 Project Overview
Preparing for technical interviews often means practicing generic questions that may not be related to the projects you actually built.
RepoViva takes a different approach.
The platform:
1. Fetches a GitHub repository
2. Filters and cleans relevant source files
3. Converts the code into LangChain documents
4. Splits the code into chunks
5. Generates embeddings
6. Stores code chunks and embeddings in MongoDB Atlas
7. Uses MongoDB Vector Search for semantic retrieval
8. Generates a technical project summary
9. Generates project-specific interview questions using Groq
10. Conducts a one-question-at-a-time AI interview
11. Evaluates candidate answers internally
12. Generates detailed final interview feedback
The goal is to make the interview feel like a conversation with a real technical interviewer who has actually studied your project.
🧠 How RepoViva Works
                GitHub Repository
                       │
                       ▼
               Repository Fetching
                       │
                       ▼
                File Filtering
                       │
                       ▼
              LangChain Documents
                       │
                       ▼
                    Chunking
                       │
                       ▼
                  Embeddings
                       │
                       ▼
                MongoDB Atlas
                       │
                       ▼
             MongoDB Vector Search
                       │
                       ▼
             Relevant Code Retrieval
                       │
                       ▼
              Project Understanding
                       │
                       ▼
            Project-Specific Questions
                       │
                       ▼
              AI Technical Interview
                       │
                       ▼
             Internal Answer Evaluation
                       │
                       ▼
                Final Feedback
