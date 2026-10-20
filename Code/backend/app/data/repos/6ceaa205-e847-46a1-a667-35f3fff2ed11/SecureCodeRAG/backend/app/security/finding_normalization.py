"""Canonical normalization shared by analysis responses and report exports.

This module does not detect vulnerabilities. It only normalizes the metadata emitted
by existing tools so downstream views do not disagree about severity or provenance.
"""

from typing import Any, Mapping

VALID_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"}
INFORMATIONAL_DIAGNOSTIC_IDS = {"missinginclude", "missingincludesystem"}


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if hasattr(value, "value"):
        value = value.value
    return str(value).strip()


def _infer_diagnostic_id(finding: Mapping[str, Any], source: str) -> str:
    diagnostic_id = _as_text(finding.get("diagnostic_id")) or _as_text(finding.get("rule"))
    if diagnostic_id:
        return diagnostic_id

    if "CPPCHECK" in source.upper():
        diagnostic_id = _as_text(finding.get("type"))
        if not diagnostic_id:
            title = _as_text(finding.get("title"))
            suffix = " detected"
            diagnostic_id = title[:-len(suffix)] if title.lower().endswith(suffix) else title
    return diagnostic_id


def normalize_severity(
    severity: Any,
    *,
    diagnostic_id: str = "",
) -> str:
    """Return a valid canonical severity; never silently promote unknowns to HIGH."""
    if diagnostic_id.strip().lower() in INFORMATIONAL_DIAGNOSTIC_IDS:
        return "INFO"

    normalized = _as_text(severity).upper()
    return normalized if normalized in VALID_SEVERITIES else "INFO"


def is_informational_diagnostic(finding: Mapping[str, Any]) -> bool:
    source = _as_text(finding.get("source"))
    diagnostic_id = _infer_diagnostic_id(finding, source)
    return diagnostic_id.lower() in INFORMATIONAL_DIAGNOSTIC_IDS


def build_informational_explanation(finding: Mapping[str, Any]) -> str:
    """Create a conservative explanation for unresolved-include diagnostics."""
    source = _as_text(finding.get("source")) or "CPPCHECK"
    diagnostic_id = _infer_diagnostic_id(finding, source) or "missingInclude"
    diagnostic_message = (
        _as_text(finding.get("diagnostic_message"))
        or _as_text(finding.get("message"))
        or _as_text(finding.get("description"))
    )
    if not diagnostic_message:
        diagnostic_message = "The analysis tool could not resolve an include file."

    return (
        "Root Cause:\n"
        f"Cppcheck reported the informational diagnostic '{diagnostic_id}': {diagnostic_message}\n\n"
        "Impact:\n"
        "This is a build/configuration diagnostic. By itself, it is not evidence of a security vulnerability. "
        "An unresolved header may prevent a complete build or cause analysis to miss declarations and definitions.\n\n"
        "Recommendation:\n"
        "Verify that the header exists and that the compiler and Cppcheck use the correct include paths and build configuration. "
        "Re-run analysis with the same include paths used by the project build.\n\n"
        "Guidance Reference:\n"
        "Project build-configuration guidance supports resolving missing headers.\n\n"
        "Evidence Status:\n"
        "INSUFFICIENT_CONTEXT"
    )


def normalize_finding(finding: Mapping[str, Any]) -> dict[str, Any]:
    """Return a copied finding with consistent severity and original tool metadata."""
    normalized = dict(finding)
    source = _as_text(normalized.get("source"))
    diagnostic_id = _infer_diagnostic_id(normalized, source)

    diagnostic_message = (
        _as_text(normalized.get("diagnostic_message"))
        or _as_text(normalized.get("message"))
        or _as_text(normalized.get("description"))
    )

    normalized["severity"] = normalize_severity(
        normalized.get("severity"), diagnostic_id=diagnostic_id
    )

    if diagnostic_id:
        normalized["diagnostic_id"] = diagnostic_id
        # Preserve the native rule ID for existing consumers of the `rule` field.
        if "CPPCHECK" in source.upper() and not _as_text(normalized.get("rule")):
            normalized["rule"] = diagnostic_id

    if diagnostic_message:
        normalized["diagnostic_message"] = diagnostic_message

    return normalized
