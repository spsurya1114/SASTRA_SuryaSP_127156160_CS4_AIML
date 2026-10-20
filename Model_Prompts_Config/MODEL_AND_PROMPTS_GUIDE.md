# Model, Prompts & Configuration Guide

This guide documents the model architecture, prompt engineering strategies, guardrails, and vector configurations used in **Case Study 4: Secure Code Debugging and Review Assistant**.

---

## 1. Model Architecture & Selection

In accordance with the automotive project specification (Page 17 & 24):
- **Reasoning LLM**: `Qwen2.5-Coder:3B`
  - Selected for deep specialization in C/C++ memory semantics, pointers, control flow graphs, and low-level firmware syntax.
  - Deployed locally via Ollama to guarantee 100% intellectual property sovereignty with zero source-code leakage to external clouds.
  - Temperature set to `0.1` to enforce deterministic, factual explanations rather than creative prose.
- **Embedding Model**: `nomic-embed-text`
  - 8,192 token context window, 768-dimensional normalized dense vectors.
  - Highly performant on technical syntax and automotive standard terminology (MISRA, ISO 26262, OWASP).

---

## 2. Prompt Engineering & Guardrail Strategy

### A. Strict Separation of Powers (Authority Boundary)
- Traditional code-review AI tools ask an LLM: *"Find all bugs in this code"*. This leads to rampant hallucinations (inventing buffer overflows where bounds checks exist, or hallucinating severity).
- In SecureCodeRAG, **detection is 100% deterministic**:
  - The AST and Cppcheck engines establish the finding type, file, line number, and base severity.
  - The prompt explicitly instructs the LLM:
    > *"You are NOT performing independent vulnerability classification. You are ONLY explaining the supplied deterministic finding. Category, Severity, File, and Line are AUTHORITATIVE. NEVER change them."*

### B. Programmatic Contradiction Guardrail
Even with strict system prompts, LLMs may exhibit subtle category bleed (e.g., discussing null pointers in an array boundary violation).
SecureCodeRAG implements a post-generation verification filter in `app/rag/generator.py`:
- Scans LLM output against the `contradiction_guardrail_rules.json` matrix.
- If prohibited keywords or contradictions appear, the LLM response is rejected immediately.
- The system automatically serves a pre-computed deterministic fallback explanation grounded in the AST facts.

---

## 3. RAG Orchestration & Dual-Namespace FAISS

1. **Dual-Namespace Indexing**:
   - `knowledge`: Persistent index containing ISO 26262 guidelines, MISRA C:2012 rules, and safe coding standards.
   - `project_id`: Dynamic per-repository index created on archive upload to index repository headers, helper functions, and call targets.
2. **Context-Aware Slicing**:
   - Rather than sending raw unformatted code files, `code_context.py` slices the target function, enclosing `if` branches, boundary checks, and pointer dereferences.
   - This provides the LLM with precise structural context while respecting token limits and preventing prompt injection from repository comments.
