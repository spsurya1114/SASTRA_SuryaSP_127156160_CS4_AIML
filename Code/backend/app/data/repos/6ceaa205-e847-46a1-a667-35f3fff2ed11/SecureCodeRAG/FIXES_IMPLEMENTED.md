# Security Analysis Results UI and finding normalization fixes

## What changed

- Confidence now renders independently as `Confidence: 90%`; it is no longer styled or labelled as a severity such as `HIGH`.
- Finding cards show the normalized severity separately. The list heading is `Analysis Findings`, and its count is expressed as findings rather than vulnerabilities.
- The summary displays Critical, High, Medium, Low, and Informational counts, with total analysis findings kept separate from non-informational severity findings.
- A shared backend normalizer is used by the analysis API and HTML/JSON report generation. Unknown or absent severities default to `INFO`, never `HIGH`.
- Cppcheck's `missingInclude` and `missingIncludeSystem` are normalized to `INFO`. For these diagnostics, the explanation remains a build/configuration note with `Evidence Status: INSUFFICIENT_CONTEXT` instead of claiming a security vulnerability.
- Original Cppcheck diagnostic IDs and messages are returned by the API, persisted in the findings database, shown in the UI, and retained in both report formats.
- The findings database schema has a backward-compatible migration for the diagnostic ID/message columns.
- The API returns both `total_findings` (all findings, including INFO) and `total_vulnerabilities` (non-INFO findings).
- The underlying static-scanning rules and detection logic were not changed.

## Regression tests

Backend:

```bash
PYTHONPATH=backend python -m pytest -q backend/tests/test_finding_normalization.py
```

Frontend:

```bash
cd frontend
npm ci
npm test
npm run build
```

The targeted regression tests passed in the authoring environment (8 backend tests and 2 frontend tests). The full frontend production build was not verified because npm dependency installation timed out in that environment; install dependencies and run `npm run build` before merging.
