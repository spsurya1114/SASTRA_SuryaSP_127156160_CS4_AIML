# Input Data & Knowledge Base Directory Guide

This directory houses the input datasets, compiler logs, and curated domain guidelines powering **Case Study 4: Secure Code Debugging and Review Assistant (SecureCodeRAG)**.

---

## 1. Directory Organization

```
Input_Data/
├── sample_code/
│   ├── synthetic_repo.zip           # Compressed multi-file automotive C repository
│   ├── synthetic_repo/              # Uncompressed repository for direct inspection
│   │   ├── hardware.c / hardware.h
│   │   ├── main.c
│   │   ├── sensor.c / sensor.h
│   │   └── utils.c / utils.h
│   └── secure_sample.c              # Gold-standard MISRA C safe code (negative test)
├── compiler_logs/
│   ├── gcc_warning_log.txt          # Real GCC build warnings (-Wstringop-overflow, etc.)
│   ├── msvc_warning_log.txt         # Real MSVC build warnings (C4996, C6011, etc.)
│   ├── iar_warning_log.txt          # IAR Embedded Workbench build diagnostics
│   └── cppcheck_output.txt          # Raw Cppcheck static analysis diagnostics
└── knowledge_base_guidelines/
    ├── automotive_guidelines/       # ISO 26262 & MISRA C domain knowledge text files
    │   ├── buffer_boundary_safety.txt
    │   ├── pointer_safety.txt
    │   ├── memory_safety.txt
    │   ├── integer_safety.txt
    │   ├── misra_oriented_guidance.txt
    │   ├── resource_management.txt
    │   ├── secure_api_usage.txt
    │   ├── state_management.txt
    │   └── error_handling.txt
    └── owasp_docs/                  # OWASP Top 10 guidelines (CWE mappings)
        ├── A01_Broken_Authentication.txt
        ├── A02_Cryptographic_Failures.txt
        ├── A03_SQL_Injection.txt
        ├── A05_Broken_Access_Control.txt
        └── A07_XSS.txt
```

---

## 2. Input Data Description & Schema

### A. Target Repository Code (`sample_code/`)
- **Languages**: C (C99/C11) and C++ (C++14/C++17).
- **Domain**: Automotive Electronic Control Unit (ECU) firmware, sensor drivers, hardware abstraction layer (HAL), and CAN bus communications.
- **Defects Modeled**:
  - `CWE-120 / CWE-121`: Stack-based Buffer Overflow (unbounded `strcpy` in `main.c`).
  - `CWE-476`: Null Pointer Dereference (missing guard condition in `sensor.c`).
  - `CWE-190`: Integer Overflow / Boundary Wrap (unchecked arithmetic in `hardware.c`).
  - `CWE-401`: Memory / Resource Leak (unfreed heap allocation in `utils.c`).
- **Safe Baseline (`secure_sample.c`)**:
  - Implements bounded operations (`snprintf`), strict length validation, and defensive pointer checks to demonstrate 0% false positives.

### B. Multi-Compiler Logs (`compiler_logs/`)
SecureCodeRAG includes regex and token parsers supporting 4 major automotive compiler toolchains:
1. **GCC / Clang**: Regular expressions matching `filename:line:col: (warning|error): message [-Wflag]`.
2. **Microsoft Visual C++ (MSVC)**: Regular expressions matching `filename(line): (warning|error) C####: message`.
3. **IAR Embedded Workbench**: Regular expressions matching `"filename",line (Warning|Error)[Pa###]: message`.
4. **Cppcheck Static Analysis**: Formatted text matching `[filename:line]: (severity) message [id]`.

### C. Curated Knowledge Base Guidelines (`knowledge_base_guidelines/`)
Each domain document contains structured metadata headers indexed into the FAISS vector database:
```
TOPIC: Buffer Safety
CATEGORY: BOUNDARY_VIOLATION
APPLICABLE_VULNERABILITIES: strcpy, strcat, sprintf, gets
REFERENCE: MISRA C:2012 Rule 21.3 / CWE-120
SOURCE: Automotive Secure Coding Handbook
```
- **Embedding Model**: `nomic-embed-text` via local Ollama.
- **Chunking**: 500-token chunks with 50-token sliding overlap.
- **Vector Space**: FAISS FlatIP (Inner Product / Normalized Cosine Distance).
