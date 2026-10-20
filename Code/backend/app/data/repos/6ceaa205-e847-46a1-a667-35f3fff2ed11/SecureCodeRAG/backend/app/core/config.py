import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    PROJECT_NAME = "Secure Code Review RAG Agent"

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "dummy")
    LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.0-flash-exp")
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    VECTORSTORE_PATH = "vectorstore"
    TOP_K = 4

    CONFIDENCE_HIGH = 0.75
    CONFIDENCE_MEDIUM = 0.45

settings = Settings()

# Debug: Print if key is loaded (remove after testing)
if settings.GEMINI_API_KEY:
    print(f"[INFO] Gemini API key loaded (starts with: {settings.GEMINI_API_KEY[:10]}...)")
else:
    print("[WARNING] No Gemini API key found. Using Dummy or Ollama mode.")
