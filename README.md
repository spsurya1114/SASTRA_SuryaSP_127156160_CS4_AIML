# Capstone Project Submission: Case Study 4

## Project Details:
- **Project Title**: SecureCodeRAG: Evidence-Grounded AI Assistant for Secure Automotive C/C++ Code Review & Defect Analysis
- **Selected Case Study**: **Case Study 4: Secure Code Debugging and Review Assistant**
- **Domain**: Automotive Engineering AI / CSx AIML
- **Student Name**: Surya S P
- **Register Number**: 127156160
- **Degree**: B.Tech Computer Science and Engineering (AI & DS)
- **University / Institute**: SASTRA University

---

## Folder Structure Index

```
SASTRA_SuryaSP_127156160_CS4_AIML/
├── Synopsis/
│   └── Project_Synopsis_CS4_Secure_Code_Review_Assistant.md
├── Input_Data/
│   ├── sample_code/ (synthetic_repo.zip, synthetic_repo/, secure_sample.c)
│   ├── compiler_logs/ (gcc, msvc, iar, cppcheck logs)
│   ├── knowledge_base_guidelines/ (ISO 26262, MISRA C, OWASP Top 10)
│   └── DATA_DICTIONARY_AND_GUIDE.md
├── Code/
│   ├── backend/ (FastAPI, AST parser, Cppcheck, FAISS RAG, SQLite)
│   ├── frontend/ (React 19, TypeScript, Vite, Reviewer Workbench)
│   ├── docker-compose.yml
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── Model_Prompts_Config/
│   ├── prompts/ (system_prompt, vulnerability_prompt, compiler_prompt, guardrail_rules)
│   ├── configs/ (model_config.yaml, vectorstore_faiss_config.json, env_reference)
│   └── MODEL_AND_PROMPTS_GUIDE.md
├── Evaluation_Results/
│   ├── test_scripts/ (test_phase1 to test_phase5, generalization, profiling)
│   ├── benchmark_data/ (benchmark_metrics_summary.json, latency_profiling.json)
│   ├── sample_reports/ (compliance_audit_report.html, compliance_audit_report.json)
│   └── EVALUATION_REPORT.md
├── Documentation/
│   └── DOCUMENTATION.md (Unified master documentation covering Architecture, Setup, User Guide, API, Report, Standards, and Case Study 4 mapping)
├── Video/
│   ├── VIDEO_SUBMISSION_LINK.md (Google Drive Video Demonstration Link)
├── Declarations/
│   ├── Academic_Integrity_Declaration.md (Includes 4-column AI Tool Usage table)
│   └── AI_Tool_Usage_Declaration.md
└── SASTRA_SuryaSP_127156160_CS4_AIML.zip (ZIP of entire folder)
```

---

## Quick Navigation Guide for Evaluators
1. **Video Demonstration (10 Mins)**: [Watch on Google Drive](https://drive.google.com/file/d/1oOU_aTygtOnap8oHmCJh0iCIuSW_z1jM/view?usp=sharing) (Details in `Video/VIDEO_SUBMISSION_LINK.md`).
2. **Master Documentation**: Everything is consolidated into [`Documentation/DOCUMENTATION.md`](Documentation/DOCUMENTATION.md).
3. **Executive Overview**: See [`Synopsis/Project_Synopsis_CS4_Secure_Code_Review_Assistant.md`](Synopsis/Project_Synopsis_CS4_Secure_Code_Review_Assistant.md).
4. **Running the Code**: Refer to [`Code/README.md`](Code/README.md) for single-command Docker deployment (`docker compose up --build -d`).
5. **Empirical Results**: Inspect [`Evaluation_Results/EVALUATION_REPORT.md`](Evaluation_Results/EVALUATION_REPORT.md) and sample reports at [`Evaluation_Results/sample_reports/compliance_audit_report.html`](Evaluation_Results/sample_reports/compliance_audit_report.html).
6. **Declarations**: Signed statements are in [`Declarations/Academic_Integrity_Declaration.md`](Declarations/Academic_Integrity_Declaration.md).
