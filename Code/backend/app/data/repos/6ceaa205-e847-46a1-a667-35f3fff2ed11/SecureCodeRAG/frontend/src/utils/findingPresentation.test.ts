import assert from "node:assert/strict";
import { test } from "node:test";
import type { AnalysisResult } from "../types/analysis.ts";
import { formatConfidenceLabel, summarizeFindings } from "./findingPresentation.ts";

function informationalFinding(index: number): AnalysisResult {
  return {
    finding_id: `finding-${index}`,
    project_id: "project-test",
    file: "main.c",
    line_start: index,
    severity: "INFO",
    category: "STATIC_ANALYSIS",
    title: "missingInclude detected",
    finding: "Informational build/configuration diagnostic. Evidence Status: INSUFFICIENT_CONTEXT",
    evidence: '#include "utils.h"',
    source: "CPPCHECK",
    confidence: 0.9,
    status: "PENDING_REVIEW",
    rule: "missingInclude",
    diagnostic_id: "missingInclude",
    diagnostic_message: "Include file not found.",
  };
}

test("confidence is rendered independently from finding severity", () => {
  assert.equal(formatConfidenceLabel(0.9), "Confidence: 90%");
  const summary = summarizeFindings([informationalFinding(1)]);
  assert.equal(summary.info, 1);
  assert.equal(summary.high, 0);
});

test("four informational findings do not increase security severity counts", () => {
  const summary = summarizeFindings([
    informationalFinding(1),
    informationalFinding(2),
    informationalFinding(3),
    informationalFinding(4),
  ]);

  assert.equal(summary.total, 4);
  assert.equal(summary.info, 4);
  assert.equal(summary.critical, 0);
  assert.equal(summary.high, 0);
  assert.equal(summary.medium, 0);
  assert.equal(summary.low, 0);
  assert.equal(summary.securitySeverityFindings, 0);
});
