import os
from app.core.config import settings

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

try:
    from langchain_community.chat_models import ChatOllama
except ImportError:
    try:
        from langchain_community.llms import Ollama as ChatOllama
    except ImportError:
        ChatOllama = None

# Dummy LLM for testing
class DummyLLM:
    def __call__(self, prompt, **kwargs):
        return f"Dummy explanation for: {prompt}"
    
    def predict(self, text, **kwargs):
        """LangChain compatibility method"""
        return f"Dummy explanation: This code may have security issues. Context: {text[:100]}..."
    
    def invoke(self, messages, **kwargs):
        """LangChain LCEL compatibility"""
        text = str(messages)
        return type(
            'Response',
            (),
            {'content': f"Dummy explanation for the security issue found in the code. Context: {text[:100]}..."}
        )()

_CACHED_LLM = None
_CACHED_LLM_KEY = None

def get_llm():
    global _CACHED_LLM, _CACHED_LLM_KEY
    provider = settings.LLM_PROVIDER.lower()
    current_key = (provider, settings.LLM_MODEL, settings.OLLAMA_BASE_URL)
    
    if _CACHED_LLM is not None and _CACHED_LLM_KEY == current_key:
        return _CACHED_LLM
    
    if provider == "ollama" and ChatOllama is not None:
        print(f"[INFO] Using Ollama LLM (Model: {settings.LLM_MODEL} at {settings.OLLAMA_BASE_URL})")
        llm = ChatOllama(
            model=settings.LLM_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=0,
            num_predict=220,
            num_ctx=2048
        )
        _CACHED_LLM = llm
        _CACHED_LLM_KEY = current_key
        return llm
    elif provider == "gemini" and settings.GEMINI_API_KEY and ChatGoogleGenerativeAI is not None:
        llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0,
            convert_system_message_to_human=True
        )
        _CACHED_LLM = llm
        _CACHED_LLM_KEY = current_key
        return llm
        
    print("[WARNING] Using Dummy LLM - no valid provider/API key set")
    dummy = DummyLLM()
    _CACHED_LLM = dummy
    _CACHED_LLM_KEY = current_key
    return dummy