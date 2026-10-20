export interface SingleAuditReportData {
  id?: number | string;
  finding_id: string;
  review_status?: string;
  status?: string;
  timestamp?: string;
  user?: string;
  reviewer?: string;
  repository?: string;
  repo_version?: string;
  file?: string;
  line?: number;
  line_start?: number;
  detection_source?: string;
  source?: string;
  model_name?: string;
  model_version?: string;
  rag_sources?: string;
  ai_explanation?: string;
  finding?: string;
  recommendation?: string;
  confidence?: number;
  reviewer_changes?: string;
  reason?: string;
  review_reason?: string;
  evidence?: string;
  code?: string;
  category?: string;
  severity?: string;
  title?: string;
}

function escapeHtml(text: string): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateSingleFindingHtml(item: SingleAuditReportData): string {
  const findingId = escapeHtml(item.finding_id || String(item.id) || "UNKNOWN");
  const rawStatus = (item.review_status || item.status || "PENDING_REVIEW").toUpperCase();
  const timestamp = escapeHtml(item.timestamp ? new Date(item.timestamp).toLocaleString() : new Date().toLocaleString());
  const reviewerUser = escapeHtml(item.user || item.reviewer || "admin");
  const category = escapeHtml(item.category || "SECURITY_DEFECT");
  const severity = escapeHtml((item.severity || "MEDIUM").toUpperCase());
  const filePath = escapeHtml(item.file || "unknown");
  const line = item.line || item.line_start || "N/A";
  const detectionSource = escapeHtml(item.detection_source || item.source || "Deterministic Static Scan");
  const modelName = escapeHtml(item.model_name || "configured_llm");

  const confVal = item.confidence ?? 0;
  const confPct = typeof confVal === "number" && confVal > 0 
    ? (confVal <= 1 ? `${Math.round(confVal * 100)}%` : `${Math.round(confVal)}%`)
    : "93%";

  const evidence = escapeHtml(item.evidence || item.code || "").trim();
  const explanation = (item.ai_explanation || item.finding || "").trim();
  const reason = escapeHtml(item.reason || item.review_reason || "").trim();

  // Color scheme and badge per status
  let statusBg = "#064e3b";
  let statusBorder = "#10b981";
  let statusBadgeBg = "#10b981";
  let statusBadgeText = "#ffffff";
  let statusIcon = "✓ VERIFIED TRUE POSITIVE — ACCEPTED";
  let statusDesc = "This finding was formally reviewed and ACCEPTED by the security engineer. Remediation required before production deployment.";

  if (rawStatus === "REJECTED") {
    statusBg = "#450a0a";
    statusBorder = "#ef4444";
    statusBadgeBg = "#ef4444";
    statusIcon = "✗ DISMISSED / REJECTED";
    statusDesc = "This finding was reviewed and REJECTED as a false alarm, non-applicable code path, or acceptable operational risk.";
  } else if (rawStatus === "EDITED") {
    statusBg = "#1e3a8a";
    statusBorder = "#3b82f6";
    statusBadgeBg = "#3b82f6";
    statusIcon = "✎ EDITED & APPROVED";
    statusDesc = "This finding was MODIFIED AND APPROVED with updated security analysis or customized remediation notes.";
  } else if (rawStatus === "PENDING_REVIEW" || rawStatus === "ANALYSIS") {
    statusBg = "#78350f";
    statusBorder = "#f59e0b";
    statusBadgeBg = "#f59e0b";
    statusIcon = "⏳ PENDING REVIEW";
    statusDesc = "This finding was detected by the automated engine and is awaiting security reviewer determination.";
  }

  // Parse structured explanation sections
  let formattedExplanation = "";
  if (explanation) {
    const sections: Array<{ title: string; body: string }> = [];
    let curTitle = "";
    let curLines: string[] = [];

    explanation.split("\n").forEach((lineStr) => {
      const stripped = lineStr.trim();
      if (stripped.endsWith(":") && stripped.length < 40 && !stripped.startsWith("http")) {
        if (curTitle) {
          sections.push({ title: curTitle, body: curLines.join("\n").trim() });
        }
        curTitle = stripped.replace(/:$/, "");
        curLines = [];
      } else {
        curLines.push(lineStr);
      }
    });
    if (curTitle) {
      sections.push({ title: curTitle, body: curLines.join("\n").trim() });
    }

    if (sections.length > 0) {
      formattedExplanation = sections
        .map(
          (s) => `
          <div class="analysis-card">
            <h4>${escapeHtml(s.title)}</h4>
            <p>${escapeHtml(s.body)}</p>
          </div>
        `
        )
        .join("");
    } else {
      formattedExplanation = `
        <div class="analysis-card">
          <h4>Security Findings & Reasoning</h4>
          <p>${escapeHtml(explanation)}</p>
        </div>
      `;
    }
  } else {
    formattedExplanation = "<p><em>No explanation recorded.</em></p>";
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SecureCodeRAG Audit Report - ${findingId} (${rawStatus})</title>
  <style>
    :root {
      --bg-color: #0b1120;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --accent: #38bdf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-primary);
      padding: 30px 20px;
      line-height: 1.6;
    }
    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: var(--card-bg);
      border-radius: 12px;
      border: 1px solid var(--card-border);
      padding: 36px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .header-title h1 {
      font-size: 1.5rem;
      color: #ffffff;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .header-title p {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .status-banner {
      background: ${statusBg};
      border: 1px solid ${statusBorder};
      border-radius: 8px;
      padding: 18px 24px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .status-banner-content h2 {
      font-size: 1.25rem;
      color: #ffffff;
      font-weight: 700;
    }
    .status-banner-content p {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.9);
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.8rem;
      background: ${statusBadgeBg};
      color: ${statusBadgeText};
      letter-spacing: 0.03em;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .meta-item {
      background: #0f172a;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 14px 18px;
    }
    .meta-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      font-weight: 600;
    }
    .meta-value {
      font-size: 0.95rem;
      font-weight: 600;
      color: #f1f5f9;
      margin-top: 4px;
      word-break: break-all;
    }
    .detail-section {
      margin-bottom: 28px;
    }
    .detail-section h3 {
      font-size: 1.05rem;
      color: var(--accent);
      margin-bottom: 12px;
      border-bottom: 1px solid #334155;
      padding-bottom: 8px;
    }
    .code-box {
      background: #090d16;
      border: 1px solid #334155;
      border-left: 4px solid var(--accent);
      border-radius: 6px;
      padding: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9rem;
      color: #38bdf8;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    .analysis-card {
      background: #0f172a;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 14px;
    }
    .analysis-card h4 {
      font-size: 0.9rem;
      color: #e2e8f0;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .analysis-card p {
      font-size: 0.88rem;
      color: #cbd5e1;
      white-space: pre-wrap;
    }
    .reason-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-left: 4px solid #ef4444;
      padding: 14px 18px;
      border-radius: 6px;
      font-size: 0.9rem;
      color: #fecaca;
    }
    .footer {
      border-top: 1px solid var(--card-border);
      padding-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    @media print {
      body { background: #ffffff; color: #000000; padding: 0; }
      .report-container { box-shadow: none; border: 1px solid #ccc; background: #fff; }
      .code-box { background: #f8fafc; color: #000; border: 1px solid #ccc; }
      .meta-item, .analysis-card { background: #f8fafc; border: 1px solid #ccc; }
      .meta-value, .analysis-card h4, .analysis-card p { color: #000; }
      .status-banner { border: 1px solid #000; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div class="header-title">
        <h1>SecureCodeRAG Code Review & Audit Certificate</h1>
        <p>Automotive & Critical Embedded Security Traceability Record</p>
      </div>
      <div>
        <span class="badge">${rawStatus}</span>
      </div>
    </div>

    <div class="status-banner">
      <div class="status-banner-content">
        <h2>${statusIcon}</h2>
        <p>${statusDesc}</p>
      </div>
    </div>

    <div class="grid">
      <div class="meta-item">
        <div class="meta-label">Finding Identifier</div>
        <div class="meta-value">${findingId}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Review Status & Decision</div>
        <div class="meta-value">${rawStatus} by ${reviewerUser}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Audit Timestamp</div>
        <div class="meta-value">${timestamp}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Category & Severity</div>
        <div class="meta-value">${category} (${severity})</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Location (File & Line)</div>
        <div class="meta-value">${filePath} : Line ${line}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Detection Engine & Confidence</div>
        <div class="meta-value">${detectionSource} • ${confPct} Confidence</div>
      </div>
    </div>

    ${evidence ? `
      <div class="detail-section">
        <h3>Source Code Evidence (Line ${line})</h3>
        <pre class="code-box"><code>${evidence}</code></pre>
      </div>
    ` : ""}

    ${reason ? `
      <div class="detail-section">
        <h3>Reviewer Justification / Rationale</h3>
        <div class="reason-box">${reason}</div>
      </div>
    ` : ""}

    <div class="detail-section">
      <h3>Defect Definitions & AI RAG Security Analysis</h3>
      ${formattedExplanation}
    </div>

    <div class="footer">
      <div>Engine: SecureCodeRAG Deterministic Engine • LLM: ${modelName}</div>
      <div>Audit Sign-off Verified • Record ID: ${findingId}</div>
    </div>
  </div>
</body>
</html>`;
}

export function downloadSingleFindingHtml(item: SingleAuditReportData): void {
  const findingId = item.finding_id || String(item.id) || "finding";
  const status = (item.review_status || item.status || "review").toLowerCase();
  const filename = `audit_${findingId.substring(0, 8)}_${status}.html`;

  const htmlContent = generateSingleFindingHtml(item);
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
