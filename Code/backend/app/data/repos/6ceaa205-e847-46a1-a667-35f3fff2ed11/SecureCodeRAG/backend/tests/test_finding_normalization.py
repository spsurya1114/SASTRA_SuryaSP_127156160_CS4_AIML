import json

from app.reports.generator import generate_html_report, generate_json_report, generate_report_data
from app.security.finding_normalization import normalize_finding
from app.security.cppcheck import parse_cppcheck_xml


def make_include_finding(index: int, diagnostic_id: str = "missingInclude") -> dict:
    return {
        "finding_id": f"finding-{index}",
        "project_id": "normalization-test",
        "file": "main.c",
        "line_start": index,
        "severity": "HIGH",  # Simulate a stale/misclassified record from an old run.
        "category": "STATIC_ANALYSIS",
        "title": f"{diagnostic_id} detected",
        "finding": "Informational build/configuration diagnostic. Evidence Status: INSUFFICIENT_CONTEXT",
        "evidence": '#include "utils.h"',
        "rule": diagnostic_id,
        "diagnostic_id": diagnostic_id,
        "diagnostic_message": 'Include file: "utils.h" not found.',
        "source": "CPPCHECK",
        "confidence": 0.9,
        "status": "PENDING_REVIEW",
    }


def test_missing_include_diagnostics_normalize_to_info_and_preserve_cppcheck_metadata():
    for diagnostic_id in ("missingInclude", "missingIncludeSystem"):
        finding = normalize_finding(make_include_finding(1, diagnostic_id))
        assert finding["severity"] == "INFO"
        assert finding["diagnostic_id"] == diagnostic_id
        assert finding["rule"] == diagnostic_id
        assert finding["diagnostic_message"] == 'Include file: "utils.h" not found.'


def test_invalid_or_missing_severity_never_defaults_to_high():
    assert normalize_finding({"title": "Unknown", "severity": None})["severity"] == "INFO"
    assert normalize_finding({"title": "Unknown"})["severity"] == "INFO"


def test_four_informational_findings_are_separate_from_security_severity_counts():
    findings = [
        make_include_finding(1),
        make_include_finding(2),
        make_include_finding(3, "missingIncludeSystem"),
        make_include_finding(4, "missingIncludeSystem"),
    ]
    report = generate_report_data("normalization-test", findings, [])

    assert report["summaries"]["severity"] == {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
        "INFO": 4,
    }
    assert report["summaries"]["total_findings"] == 4
    assert report["summaries"]["security_severity_findings"] == 0
    assert all(finding["severity"] == "INFO" for finding in report["findings"])


def test_html_and_json_exports_agree_on_severity_confidence_and_diagnostic_provenance():
    finding = make_include_finding(1)
    html_report = generate_html_report("normalization-test", [finding], [])
    json_report = json.loads(generate_json_report("normalization-test", [finding], []))
    exported_finding = json_report["findings"][0]

    assert exported_finding["severity"] == "INFO"
    assert exported_finding["confidence"] == 0.9
    assert exported_finding["confidence_percent"] == 90
    assert exported_finding["diagnostic_id"] == "missingInclude"
    assert exported_finding["diagnostic_message"] == 'Include file: "utils.h" not found.'
    assert 'class="finding INFO"' in html_report
    assert '<span class="badge badge-severity">INFO</span>' in html_report
    assert "90%" in html_report
    assert "missingInclude" in html_report
    assert 'Include file: &quot;utils.h&quot; not found.' in html_report
    assert json_report["summaries"]["total_findings"] == 1
    assert json_report["summaries"]["security_severity_findings"] == 0


def test_real_high_severity_finding_keeps_high_severity():
    finding = normalize_finding({
        "title": "Unsafe strcpy detected",
        "category": "UNSAFE_STRING_OPS",
        "severity": "HIGH",
        "source": "PROJECT_RULE",
    })
    assert finding["severity"] == "HIGH"


def test_cppcheck_parser_preserves_native_rule_id_and_message():
    xml = '''<?xml version="1.0"?>
    <results version="2">
      <errors>
        <error id="missingInclude" severity="information"
               msg="Include file: &quot;utils.h&quot; not found.">
          <location file="main.c" line="1"/>
        </error>
      </errors>
    </results>'''
    parsed = parse_cppcheck_xml(xml, "/tmp")
    assert len(parsed) == 1
    assert parsed[0]["rule"] == "missingInclude"
    assert parsed[0]["message"] == 'Include file: "utils.h" not found.'
    assert parsed[0]["severity"] == "INFO"


def test_database_persists_diagnostic_provenance(tmp_path, monkeypatch):
    from app.schemas.findings import StructuredFinding, SeverityEnum, FindingStatus
    from app.review import findings as finding_store

    monkeypatch.setattr(finding_store, "DB_PATH", str(tmp_path / "review.db"))
    finding_store.init_db()
    record = StructuredFinding(
        finding_id="db-normalization-test",
        project_id="normalization-test",
        file="main.c",
        line_start=1,
        line_end=1,
        severity=SeverityEnum.INFO,
        category="STATIC_ANALYSIS",
        title="missingInclude detected",
        finding="Build/configuration diagnostic. Evidence Status: INSUFFICIENT_CONTEXT",
        evidence='#include "utils.h"',
        rule="missingInclude",
        diagnostic_id="missingInclude",
        diagnostic_message='Include file: "utils.h" not found.',
        source="CPPCHECK",
        confidence=0.9,
        status=FindingStatus.PENDING_REVIEW,
    )

    finding_store.save_finding(record)
    stored = finding_store.get_finding("db-normalization-test")

    assert stored["severity"] == "INFO"
    assert stored["rule"] == "missingInclude"
    assert stored["diagnostic_id"] == "missingInclude"
    assert stored["diagnostic_message"] == 'Include file: "utils.h" not found.'
    assert stored["confidence"] == 0.9


def test_analysis_api_returns_normalized_severity_and_separate_counts(monkeypatch):
    import asyncio
    import importlib
    from app.schemas.request import CodeRequest
    from app.security import cppcheck as cppcheck_module
    from app.review import findings as finding_store
    from app.review import audit as audit_store

    analysis_module = importlib.import_module("app.api.analyze")
    monkeypatch.setattr(analysis_module.settings, "LLM_PROVIDER", "dummy")
    monkeypatch.setattr(
        cppcheck_module,
        "run_cppcheck_on_code",
        lambda code, language: [{
            "type": "missingInclude",
            "rule": "missingInclude",
            "diagnostic_id": "missingInclude",
            "diagnostic_message": 'Include file: "utils.h" not found.',
            "severity": "HIGH",  # Stale/misclassified tool metadata is normalized.
            "category": "STATIC_ANALYSIS",
            "line": 1,
            "code": '#include "utils.h"',
            "description": 'Include file: "utils.h" not found.',
            "source": "CPPCHECK",
        }],
    )
    monkeypatch.setattr(finding_store, "save_finding", lambda _finding: None)
    monkeypatch.setattr(audit_store, "log_audit_event", lambda **_kwargs: None)

    response = asyncio.run(analysis_module.analyze_code(
        CodeRequest(code='#include "utils.h"', language="c"),
        current_user={"username": "test", "role": "ADMIN", "projects": ["*"]},
    ))

    assert len(response.vulnerabilities) == 1
    finding = response.vulnerabilities[0]
    assert finding.severity.value == "INFO"
    assert finding.rule == "missingInclude"
    assert finding.diagnostic_id == "missingInclude"
    assert finding.diagnostic_message == 'Include file: "utils.h" not found.'
    assert "Evidence Status:\nINSUFFICIENT_CONTEXT" in finding.finding
    assert response.total_findings == 1
    assert response.total_vulnerabilities == 0
