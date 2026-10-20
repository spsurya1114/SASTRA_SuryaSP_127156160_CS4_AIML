# 3. Academic Integrity and AI-Tool Usage Declaration

**Project Title**: SecureCodeRAG: Evidence-Grounded AI Assistant for Secure Automotive C/C++ Code Review & Defect Analysis  
**Case Study**: Case Study 4 — Secure Code Debugging and Review Assistant  
**Student Name**: Surya S P  
**Register Number**: 127156160  
**Degree**: B.Tech Computer Science and Engineering (AI & DS)  
**College**: SASTRA University  
**Date**: October 20, 2026  

---

## Instructions & Declaration Overview
- **Every student signs both declarations below; submissions without signed declarations are not evaluated.**
- **Academic integrity**: the submission is original work; all external code, datasets, models and documents are cited; results are not fabricated; individual contributions are accurately stated.
- **AI-tool usage**: each AI tool or pre-trained model used (including for coding assistance) is declared with its purpose, the artifact affected, and how the output was verified. Students remain accountable for correctness and must be able to explain all submitted work.

---

## 3.1 Academic Integrity Declaration

I hereby declare that:
1. **Originality of Submission**: This capstone project submission is my original work in software architecture, algorithm design, implementation, and empirical evaluation.
2. **Proper Citation of Sources**: All external code, datasets, pre-trained models, standards (ISO 26262, MISRA C:2012, ISO/SAE 21434, OWASP Top 10, CWE), and academic literature have been accurately cited and referenced.
3. **Data Authenticity**: All experimental results, benchmark metrics, latency profiling measurements, and audit records were obtained through verifiable executions and are not fabricated or falsified.
4. **Accountability**: Individual contributions to all system components, test suites, and project documentation are accurately stated, and I remain personally accountable for the correctness and explanation of all submitted work.

**Student Signature**: *Surya S P*  
**Student Name**: Surya S P  
**Register Number**: 127156160  
**Degree**: B.Tech Computer Science and Engineering (AI & DS)  
**College / University**: SASTRA University  
**Date**: October 20, 2026  
**Place**: Thanjavur, India  

---

## 3.2 AI-Tool Usage Declaration

Each AI tool and pre-trained model used across the project lifecycle—including local inference models, embedding models, and coding assistants—is declared below with its specific purpose, the artifacts affected, and the exact verification method performed:

| AI Model/Tool | Purpose | Artifact affected | Verified by student |
|---|---|---|---|
| **Qwen2.5-Coder:3B**<br>`(3B Q4_K_M via Ollama)` | Local on-premises inference for generating contextual root cause explanations, operational impact assessments, and MISRA C:2012 compliant remediation code. | `Code/backend/app/rag/generator.py`<br>`Model_Prompts_Config/prompts/` | Verified against deterministic AST findings using programmatic contradiction filters (`contradiction_guardrail_rules.json`); output was manually inspected line-by-line to guarantee zero hallucinated vulnerabilities and zero severity drift. |
| **Nomic-Embed-Text**<br>`(v1.5 768-dim via Ollama)` | Dense semantic embedding generation for indexing automotive safety guidelines (ISO 26262, MISRA C:2012) and repository context into the FAISS vector database. | `Code/backend/app/vectorstore/index.py`<br>`Code/backend/app/rag/retriever.py` | Cosine similarity scores evaluated against gold-standard MISRA queries; chunk retrieval coverage and citation metadata were verified via `test_workflow.py`. |
| **Antigravity AI Coding Assistant**<br>`(Claude 3.7 Sonnet / Gemini 2.5 Pro)` | Pair-programming assistance for test suite construction, script refactoring, benchmark script automation, and documentation structuring. | `Evaluation_Results/test_scripts/`<br>`Code/docker-compose.yml`<br>`Documentation/*.md` | Every test script was executed locally on the Windows/WSL2 environment; terminal exit codes, assertion outputs, SQLite database records (`review.db`), and HTML report integrity were independently verified. |

---

### Student Confirmation & Acknowledgment:

I confirm that I understand the code, design principles, and outputs generated with the assistance of the AI tools declared above, and I am fully prepared to explain and defend every component of the submitted capstone project.

**Student Signature**: *Surya S P*  
**Date**: October 20, 2026  
