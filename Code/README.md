# SecureCodeRAG — Source Code Directory

This directory contains the complete source code for **Case Study 4: Secure Code Debugging and Review Assistant**.

## Directory Structure
- `backend/`: FastAPI application, AST parsing engine, Cppcheck integration, multi-compiler build log parser, FAISS RAG engine, SQLite persistence, and report generator.
- `frontend/`: React 19 + TypeScript + Vite frontend with reviewer workbench, single-file/repository ingestion, audit trail log, and compliance export.
- `docker-compose.yml`: Multi-container Docker orchestration for backend and frontend services.
- `requirements.txt`: Python package dependencies.
- `.env.example`: Environment variables template.

## Quick Start (Docker)
```bash
# 1. Start Ollama on host machine (ensure qwen2.5-coder:3b and nomic-embed-text are pulled)
ollama pull qwen2.5-coder:3b
ollama pull nomic-embed-text

# 2. Build and launch containers
docker compose up --build -d

# 3. Access applications:
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/docs
```

## Manual Start (Local Development)
### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
