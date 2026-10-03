# RepoViva

> AI-powered technical interviews based on your own GitHub projects.

RepoViva is a project-focused technical interview preparation tool.

The goal is simple: give RepoViva your GitHub repository, let it understand the project's code and structure, and then use that information to conduct a technical interview based on the project you actually built.

## Current Progress

The project is currently in the repository ingestion stage.

Currently, RepoViva can:

- Connect to GitHub using the GitHub API
- Accept a GitHub repository URL
- Explore repository folders recursively
- Ignore unwanted directories
- Identify supported source-code files
- Read source-code files
- Extract code cells from Jupyter notebooks
- Return the collected code as Python data

## Planned Features

- Analyze the repository structure
- Understand project architecture
- Identify important technical decisions
- Generate project-specific interview questions
- Conduct an interactive technical interview
- Ask follow-up questions based on the user's answers
- Evaluate responses
- Provide personalized feedback and areas to improve

## Tech Stack

- Python
- PyGithub
- GitHub API
- python-dotenv

## Project Structure

```text
RepoViva/
└── backend/
    ├── repo_fetching.py
    ├── requirements.txt
    ├── .gitignore
    └── .env
