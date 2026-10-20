# SecureCodeRAG — Secure Code Review & Defect Analysis Assistant

SecureCodeRAG is an AI-assisted automotive and C/C++ security analysis platform combining deterministic static analysis, retrieval-augmented generation (RAG) using FAISS, and local LLM inference powered by Ollama.

---

## 1. Project Overview & Architecture

### Key Capabilities
- **Hybrid Analysis Pipeline**: Fast deterministic static detection (AST analysis, regular expression rules, Cppcheck integration) coupled with LLM reasoning.
- **Evidence-Grounded AI Explanations**: DeepSeek-Coder-V2:16B explains findings, identifies root causes, and recommends fixes without overriding deterministic findings or altering severity.
- **Project-Aware RAG**: FAISS vector store indexing automotive domain guidelines (MISRA, OWASP, memory safety) and project repository context using `nomic-embed-text` embeddings.
- **Reviewer Workflow**: Interactive Accept / Edit / Reject controls for security engineers with complete SQLite persistence.
- **Audit Trails & Export**: Tamper-evident audit logging with downloadable HTML and JSON compliance reports.

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                      React 19 Frontend                      │
│        (Vite + TypeScript + Tailwind-free Vanilla CSS)      │
│                     http://localhost:5173                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON
┌──────────────────────────────▼──────────────────────────────┐
│                     FastAPI Backend                         │
│                     http://localhost:8000                   │
│                                                             │
│  ┌────────────────────┐   ┌───────────────────────────────┐ │
│  │ Deterministic Scan │   │  RAG Retriever (FAISS)        │ │
│  │ (Cppcheck + AST)   │   │  - Knowledge base guidelines  │ │
│  └─────────┬──────────┘   │  - Uploaded repository code   │ │
│            │              └───────────────┬───────────────┘ │
│            └──────────────┬───────────────┘                 │
│                           ▼                                 │
│             ┌───────────────────────────┐                   │
│             │ Generator & Guardrails    │                   │
│             └─────────────┬─────────────┘                   │
└───────────────────────────┼─────────────────────────────────┘
                            │ http://host.docker.internal:11434
┌───────────────────────────▼─────────────────────────────────┐
│              Local Ollama Service (Windows Host)             │
│  - deepseek-coder-v2:16b (Reasoning & Explanations)         │
│  - nomic-embed-text (Vector Embeddings)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites for Windows

Before starting, ensure the following software is installed on Windows:

1. **Docker Desktop for Windows**:
   - Download: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
   - Ensure WSL 2 backend is enabled in Docker Desktop Settings.
2. **Ollama for Windows**:
   - Download: [ollama.com/download](https://ollama.com/download)
   - Ensure Ollama is running (check the llama icon in the Windows taskbar).
3. *(Optional - for running directly on host without Docker)*:
   - Python 3.11+
   - Node.js 18+ (LTS)
   - Cppcheck (`winget install Cppcheck.Cppcheck` or from source)

---

## 3. Required Ollama Models & Download

Open PowerShell or Windows Terminal and pull the required models:

```powershell
# 1. Pull the reasoning model (DeepSeek-Coder-V2:16B)
ollama pull deepseek-coder-v2:16b

# 2. Pull the embedding model (Nomic Embed Text)
ollama pull nomic-embed-text
```

Verify that both models are installed:
```powershell
ollama list
```
You should see `deepseek-coder-v2:16b` and `nomic-embed-text` listed.

---

## 4. Environment Configuration

The application reads settings from `backend/.env`.

A prepared `.env` file is included in `backend/.env`. If missing, copy it from `.env.example`:
```powershell
# In PowerShell (from project root):
Copy-Item .env.example backend\.env
```

### Key Settings Explained
| Variable | Default Value | Description |
|---|---|---|
| `LLM_PROVIDER` | `ollama` | Inference engine (`ollama`, `gemini`, or `dummy`) |
| `LLM_MODEL` | `deepseek-coder-v2:16b` | Ollama model name |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Ollama endpoint accessible from Docker |
| `OLLAMA_EMBED_MODEL`| `nomic-embed-text` | Embedding model for FAISS vector search |
| `VECTORSTORE_PATH` | `vectorstore` | Relative path to vector storage directory |
| `TOP_K` | `4` | Number of context documents retrieved per finding |

> **Note for Docker users:** Inside Docker containers on Windows, `http://host.docker.internal:11434` resolves to the Ollama service running on your Windows host. If running the backend directly on Windows (outside Docker), set `OLLAMA_BASE_URL=http://localhost:11434`.

---

## 5. Starting & Stopping the Project

### Option A: Using Docker Compose (Recommended)

1. **Build and start all services:**
   ```powershell
   docker compose up --build
   ```
   Add `-d` to run in detached (background) mode:
   ```powershell
   docker compose up -d
   ```

2. **Check container logs:**
   ```powershell
   docker compose logs -f
   ```

3. **Stop the services:**
   ```powershell
   docker compose down
   ```

### Option B: Running Locally on Windows (Without Docker)

1. **Start Backend:**
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Start Frontend:**
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

---

## 6. Accessing the Application & Default Accounts

Once the containers are up:

| Interface | URL | Description |
|---|---|---|
| **Frontend Web UI** | [http://localhost:5173](http://localhost:5173) | Interactive reviewer dashboard & scan upload |
| **Backend API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI / Swagger interface |
| **Health Check** | [http://localhost:8000/api/health](http://localhost:8000/api/health) | System health & status check |

### Default Development Accounts
The system initializes with preconfigured demo accounts for local role testing:

| Username | Password | Role | Permissions |
|---|---|---|---|
| `admin` | `admin123` | `ADMIN` | Full administrative access across all projects |
| `reviewer`| `review123` | `REVIEWER` | Reviewer workflow (Accept, Edit, Reject findings) |
| `dev` | `dev123` | `DEVELOPER` | Scan submission and finding inspection |

---

## 7. How to Test Code Analysis

1. Log into the frontend at [http://localhost:5173](http://localhost:5173) using `admin` / `admin123`.
2. Upload a C repository ZIP archive (you can use `synthetic_repo.zip` included in the root directory, or any C/C++ source code archive).
3. The dashboard executes:
   - File ingestion and syntax checking
   - Deterministic rule scanning and Cppcheck analysis
   - Context-grounded LLM inference via DeepSeek-Coder-V2:16B
4. Review detected findings, examine AI explanations and MISRA references, and use the **Accept**, **Edit**, or **Reject** actions to record review decisions.
5. Generate compliance reports in JSON or formatted HTML format.

---

## 8. Troubleshooting

### 1. Backend cannot connect to Ollama (`Connection Refused`)
- Ensure Ollama is running in Windows: open PowerShell and test `curl http://localhost:11434`.
- If Docker fails to resolve `host.docker.internal`, check that Docker Desktop has `extra_hosts: ["host.docker.internal:host-gateway"]` in `docker-compose.yml` (already configured).
- If Windows Firewall blocks Docker traffic to port 11434, set the environment variable `OLLAMA_HOST=0.0.0.0:11434` in Windows and restart Ollama.

### 2. Slow Inference / Model Out of Memory
- `deepseek-coder-v2:16b` requires ~10-12 GB VRAM for full GPU offloading, or 16+ GB system RAM for CPU inference.
- To inspect Ollama resource usage: run `ollama ps` in PowerShell.
- Ensure Docker Desktop is allocated sufficient memory (WSL 2 memory limit in `.wslconfig`).

### 3. Port Conflicts (`Port 5173` or `Port 8000` already in use)
- Identify the process occupying the port:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess
  ```
- Either stop the conflicting process or change the host port mappings in `docker-compose.yml`.

### 4. Database Reset
- If you wish to reset review history and start clean: delete `backend/data/review.db`. A clean database with all required tables will be regenerated automatically on the next startup.