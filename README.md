# RepoViva

> **AI-powered technical interviews based on your own GitHub projects.**

RepoViva is an AI-powered interview preparation platform that analyzes your GitHub repository and generates **project-specific technical interview questions** based on your actual code, architecture, and technical decisions.

## 🚀 How It Works

```text
GitHub Repository
       ↓
File Filtering & Processing
       ↓
Code Chunking
       ↓
Embeddings
       ↓
MongoDB Vector Search
       ↓
Relevant Code Retrieval
       ↓
LLM
       ↓
Project-Specific Interview
       ↓
Answer Evaluation
       ↓
Final Feedback
```

## ✨ Features

- 🔗 Analyze GitHub repositories
- 🧹 Filter irrelevant files and extract notebook code
- 🧩 Process code using LangChain
- 🔎 Semantic code search with embeddings
- 🗄️ MongoDB Atlas Vector Search
- 🤖 Groq-powered LLM interview generation
- 🎯 Easy, Medium, and Hard difficulty levels
- 💬 One-question-at-a-time interview experience
- 🔄 Context-aware follow-up questions
- 📊 Technical answer evaluation
- 📝 Detailed final interview feedback

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Python | Application logic |
| LangChain | RAG & document processing |
| Sentence Transformers | Code embeddings |
| MongoDB Atlas | Vector database |
| MongoDB Vector Search | Semantic retrieval |
| Groq | LLM inference |
| GPT-OSS-20B | Interview & analysis |
| PyGithub | GitHub repository fetching |

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd RepoViva
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

Activate it:

```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file:

```env
GITHUB_TOKEN=your_github_token
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
```

## 🗄️ MongoDB

RepoViva stores code chunks and their embeddings in MongoDB Atlas.

The Vector Search index uses:

```text
Dimensions: 384
Similarity: cosine
```

## 📌 Development Status

### Completed

- [x] GitHub repository processing
- [x] Code filtering and chunking
- [x] Embeddings
- [x] MongoDB Vector Search
- [x] RAG-based retrieval
- [x] Project summaries
- [x] Interview question generation
- [x] Answer evaluation
- [x] Follow-up questions
- [x] Final interview feedback

### In Progress

- [ ] Voice interviews
- [ ] Frontend UI
- [ ] Interview analytics
- [ ] Production optimization

## 🎯 Vision

RepoViva aims to make technical interview preparation more realistic by interviewing developers about **the projects they actually built**, rather than relying only on generic interview questions.

> **Your code. Your project. Your interview.**
