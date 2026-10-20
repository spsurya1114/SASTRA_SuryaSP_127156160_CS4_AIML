import type { AnalysisResult } from "../types/analysis";

export type FindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

const VALID_SEVERITIES = new Set<FindingSeverity>([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
]);

export interface FindingSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  securitySeverityFindings: number;
}

/**
 * Counts the canonical severities returned by the backend. Unknown/missing
 * severities are shown as INFO defensively; they are never promoted to HIGH.
 */
export function summarizeFindings(findings: readonly AnalysisResult[]): FindingSummary {
  const summary: FindingSummary = {
    total: findings.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    securitySeverityFindings: 0,
  };

  for (const finding of findings) {
    const candidate = String(finding.severity ?? "").toUpperCase() as FindingSeverity;
    const severity = VALID_SEVERITIES.has(candidate) ? candidate : "INFO";
    switch (severity) {
      case "CRITICAL":
        summary.critical += 1;
        break;
      case "HIGH":
        summary.high += 1;
        break;
      case "MEDIUM":
        summary.medium += 1;
        break;
      case "LOW":
        summary.low += 1;
        break;
      case "INFO":
      default:
        summary.info += 1;
        break;
    }
  }

  summary.securitySeverityFindings = summary.critical + summary.high + summary.medium + summary.low;
  return summary;
}

export function formatConfidenceLabel(confidence: number): string {
  const numeric = Number(confidence);
  if (!Number.isFinite(numeric)) return "Confidence: N/A";
  const ratio = numeric > 1 ? numeric / 100 : numeric;
  const percentage = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return `Confidence: ${percentage}%`;
}
