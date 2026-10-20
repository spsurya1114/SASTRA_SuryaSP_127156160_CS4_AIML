# AI-Tool Usage Declaration Matrix

**Project Title**: SecureCodeRAG — Secure Code Review & Defect Analysis Assistant  
**Case Study**: Case Study 4 (Automotive Engineering AI)  
**Student Name**: Surya S P  
**Register Number**: 127156160  
**Degree**: B.Tech Computer Science and Engineering (AI & DS)  
**College**: SASTRA University  
**Academic Year**: 2026–2027  

In accordance with institutional guidelines requiring transparency regarding the utilization of artificial intelligence systems in academic capstone projects, the following matrix details all AI models, tools, and assistants utilized across the project lifecycle:

---

## Detailed AI-Tool Usage Matrix

| AI Model/Tool | Purpose | Artifact affected | Verified by student |
|---|---|---|---|
| **Qwen2.5-Coder:3B**<br>`(3B Q4_K_M via Ollama)` | Local on-premises inference for generating contextual root cause explanations, operational impact assessments, and MISRA C:2012 compliant remediation code. | `Code/backend/app/rag/generator.py`<br>`Model_Prompts_Config/prompts/` | Verified against deterministic AST findings using programmatic contradiction filters (`contradiction_guardrail_rules.json`); output was manually inspected line-by-line to guarantee zero hallucinated vulnerabilities and zero severity drift. |
| **Nomic-Embed-Text**<br>`(v1.5 768-dim via Ollama)` | Dense semantic embedding generation for indexing automotive safety guidelines (ISO 26262, MISRA C:2012) and repository context into the FAISS vector database. | `Code/backend/app/vectorstore/index.py`<br>`Code/backend/app/rag/retriever.py` | Cosine similarity scores evaluated against gold-standard MISRA queries; chunk retrieval coverage and citation metadata were verified via `test_workflow.py`. |
| **Antigravity AI Coding Assistant**<br>`(Claude 3.7 Sonnet / Gemini 2.5 Pro)` | Pair-programming assistance for test suite construction, script refactoring, benchmark script automation, and documentation structuring. | `Evaluation_Results/test_scripts/`<br>`Code/docker-compose.yml`<br>`Documentation/*.md` | Every test script was executed locally on the Windows/WSL2 environment; terminal exit codes, assertion outputs, SQLite database records (`review.db`), and HTML report integrity were independently verified. |

---

## Ethical Adherence & Academic Responsibility Statement

1. **Human Ownership & Intellectual Responsibility**:
   All core architectural decisions—including the hybrid deterministic-RAG separation of powers, the choice of local on-premises deployment for automotive IP protection, the authority boundary enforcement, and the database schema design—were conceived and directed by the candidate.
2. **Deterministic Precedence**:
   No AI model was granted autonomous authority to detect vulnerabilities without deterministic validation or commit code without human review.
3. **Data Privacy**:
   Zero proprietary code or institution-specific assets were transmitted to commercial public cloud AI endpoints.

---

### Candidate Acknowledgment:

**Candidate Signature**: *Surya S P*  
**Student Name**: Surya S P  
**Register Number**: 127156160  
**Date**: October 20, 2026  
