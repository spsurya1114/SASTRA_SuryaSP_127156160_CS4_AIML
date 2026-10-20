import os
import requests
from langchain.embeddings.base import Embeddings
from app.core.config import settings


from functools import lru_cache

@lru_cache(maxsize=1000)
def _cached_embed_query(model: str, base_url: str, text: str):
    import time
    start_t = time.time()
    print(f"[TIMING] Embedding query API call started...")
    
    response = requests.post(
        f"{base_url}/api/embed",
        json={
            "model": model,
            "input": [text]
        },
        timeout=120
    )

    response.raise_for_status()

    data = response.json()
    elapsed = time.time() - start_t
    print(f"[TIMING] Embedding query API call finished in {elapsed:.3f}s")
    
    # Return as tuple to prevent callers from modifying the cached object
    return tuple(data["embeddings"][0])


class OllamaEmbeddings(Embeddings):
    """
    Lightweight Ollama-based embeddings.
    Avoids sentence-transformers and PyTorch.
    """

    def __init__(
        self,
        model="nomic-embed-text",
        base_url=None
    ):
        self.model = model
        self.base_url = (
            base_url
            or settings.OLLAMA_BASE_URL
        ).rstrip("/")

    def embed_documents(self, texts):
        if not texts:
            return []
            
        import time
        start_t = time.time()
        print(f"[TIMING] Embedding API call for {len(texts)} documents started...")

        response = requests.post(
            f"{self.base_url}/api/embed",
            json={
                "model": self.model,
                "input": texts
            },
            timeout=120
        )

        response.raise_for_status()

        data = response.json()
        elapsed = time.time() - start_t
        print(f"[TIMING] Embedding API call finished in {elapsed:.3f}s")
        return data["embeddings"]

    def embed_query(self, text):
        # Convert tuple back to list to ensure caller gets a mutable copy
        return list(_cached_embed_query(self.model, self.base_url, text))


def get_embeddings():
    """
    Use Ollama embeddings locally.

    This keeps embeddings private and avoids
    the large sentence-transformers/PyTorch dependency.
    """

    model = os.getenv(
        "OLLAMA_EMBED_MODEL",
        "nomic-embed-text"
    )

    base_url = settings.OLLAMA_BASE_URL

    print(
        f"[INFO] Using Ollama Embeddings "
        f"(Model: {model} at {base_url})"
    )

    return OllamaEmbeddings(
        model=model,
        base_url=base_url
    )