import json
from datetime import datetime
import html

def generate_report_data(project_id: str, findings: list, audit_logs: list) -> dict:
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    
    # Calculate summary by severity
    severity_summary = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    
    # Calculate summary by category
    category_summary = {}
    
    # Reviewer status counts
    status_summary = {"PENDING_REVIEW": 0, "ACCEPTED": 0, "EDITED": 0, "REJECTED": 0}
    
    # Get repo_version from latest audit log if available
    repo_version = "UNKNOWN"
    if audit_logs:
        for log in audit_logs:
            if log.get("repo_version"):
                repo_version = log.get("repo_version")
                break
                
    # Combine findings with their audit data
    enriched_findings = []
    
    for f in findings:
        sev = f.get("severity", "INFO").upper()
        if sev in severity_summary:
            severity_summary[sev] += 1
            
        cat = f.get("category", "Uncategorized")
        category_summary[cat] = category_summary.get(cat, 0) + 1
        
        status = f.get("status", "PENDING_REVIEW")
        status_summary[status] = status_summary.get(status, 0) + 1
            
        # Find related audit log for this finding (latest analysis event)
        f_audit = [a for a in audit_logs if a.get("finding_id") == f.get("finding_id") and a.get("event_type") == "ANALYSIS"]
        latest_audit = f_audit[0] if f_audit else {}
        
        rag_sources = []
        if latest_audit.get("rag_sources"):
            try:
                rag_sources = json.loads(latest_audit.get("rag_sources"))
            except:
                pass
                
        enriched_findings.append({
            "finding_id": f.get("finding_id"),
            "status": status,
            "severity": sev,
            "category": cat,
            "title": f.get("title"),
            "file": f.get("file"),
            "line_start": f.get("line_start"),
            "function": f.get("function"),
            "confidence": f.get("confidence"),
            "diagnostic_message": f.get("diagnostic_message"),
            "evidence_status": f.get("evidence_status", "INSUFFICIENT_CONTEXT"),
            "source": f.get("source"),
            "rule": f.get("rule"),
            "evidence": f.get("evidence"), # Source evidence
            "finding": f.get("finding"), # Static-analysis evidence / explanation
            "root_cause": f.get("root_cause"),
            "recommendation": f.get("recommendation"), # AI recommendation
            "suggested_fix": f.get("suggested_fix"),
            "rag_references": rag_sources
        })
        
    return {
        "project_info": {
            "project_id": project_id,
            "repo_version": repo_version,
            "analysis_timestamp": timestamp,
        },
        "summaries": {
            "severity": severity_summary,
            "category": category_summary,
            "status": status_summary
        },
        "findings": enriched_findings
    }

def generate_json_report(project_id: str, findings: list, audit_logs: list) -> str:
    data = generate_report_data(project_id, findings, audit_logs)
    return json.dumps(data, indent=2)

def generate_html_report(project_id: str, findings: list, audit_logs: list) -> str:
    data = generate_report_data(project_id, findings, audit_logs)
    pi = data["project_info"]
    ss = data["summaries"]["severity"]
    sc = data["summaries"]["category"]
    st = data["summaries"]["status"]
    
    html_out = f"""
    <html>
    <head>
        <title>Automotive Secure Code Review Report - {pi['project_id']}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; color: #333; }}
            h1, h2, h3 {{ color: #222; }}
            .container {{ max-width: 1200px; margin: auto; }}
            .metadata-box {{ display: flex; gap: 20px; margin-bottom: 30px; }}
            .summary-card {{ flex: 1; background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #ddd; }}
            .finding {{ border: 1px solid #e0e0e0; padding: 20px; margin-bottom: 25px; border-radius: 8px; background: #fff; }}
            .CRITICAL {{ border-left: 6px solid #d9534f; }}
            .HIGH {{ border-left: 6px solid #f0ad4e; }}
            .MEDIUM {{ border-left: 6px solid #5bc0de; }}
            .LOW {{ border-left: 6px solid #5cb85c; }}
            .INFO {{ border-left: 6px solid #aaa; }}
            table {{ border-collapse: collapse; width: 100%; margin-bottom: 15px; }}
            th, td {{ text-align: left; padding: 10px; border-bottom: 1px solid #eee; }}
            th {{ width: 150px; color: #666; }}
            pre {{ background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: Consolas, monospace; font-size: 14px; border: 1px solid #e0e0e0; }}
            .badge {{ display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }}
            .badge-status {{ background: #e9ecef; color: #495057; border: 1px solid #ced4da; }}
            .badge-severity {{ background: #343a40; color: #fff; }}
            ul.no-bullets {{ list-style-type: none; padding: 0; }}
            ul.no-bullets li {{ margin-bottom: 5px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Automotive Secure Code Review Report</h1>
            
            <div class="metadata-box">
                <div class="summary-card">
                    <h2>Project Information</h2>
                    <p><strong>Project ID:</strong> {html.escape(pi['project_id'])}</p>
                    <p><strong>Repo Version:</strong> {html.escape(pi['repo_version'])}</p>
                    <p><strong>Analysis Timestamp:</strong> {html.escape(pi['analysis_timestamp'])}</p>
                </div>
                
                <div class="summary-card">
                    <h2>Summary by Severity</h2>
                    <ul class="no-bullets">
                        <li><span class="badge badge-severity" style="background:#d9534f">CRITICAL</span> : {ss['CRITICAL']}</li>
                        <li><span class="badge badge-severity" style="background:#f0ad4e">HIGH</span> : {ss['HIGH']}</li>
                        <li><span class="badge badge-severity" style="background:#5bc0de">MEDIUM</span> : {ss['MEDIUM']}</li>
                        <li><span class="badge badge-severity" style="background:#5cb85c">LOW</span> : {ss['LOW']}</li>
                        <li><span class="badge badge-severity" style="background:#aaa">INFO</span> : {ss['INFO']}</li>
                    </ul>
                </div>

                <div class="summary-card">
                    <h2>Reviewer Status</h2>
                    <ul class="no-bullets">
                        <li><strong>Pending Review:</strong> {st.get('PENDING_REVIEW', 0)}</li>
                        <li><strong>Accepted:</strong> {st.get('ACCEPTED', 0)}</li>
                        <li><strong>Edited:</strong> {st.get('EDITED', 0)}</li>
                        <li><strong>Rejected:</strong> {st.get('REJECTED', 0)}</li>
                    </ul>
                </div>
            </div>

            <div class="metadata-box">
                <div class="summary-card" style="width: 100%;">
                    <h2>Summary by Category</h2>
                    <ul>
                        {"".join(f"<li>{html.escape(k)}: {v}</li>" for k, v in sc.items())}
                    </ul>
                </div>
            </div>
            
            <h2>Detailed Findings ({len(data['findings'])})</h2>
    """
    
    for f in data['findings']:
        rag_html = ""
        if f['rag_references']:
            rag_html = "<ul>" + "".join(f"<li>{html.escape(str(r))}</li>" for r in f['rag_references']) + "</ul>"
        else:
            rag_html = "<em>No RAG references retrieved for this finding.</em>"
            
        html_out += f"""
            <div class="finding {f['severity']}">
                <h3>[{html.escape(f['finding_id'])}] {html.escape(f['title'])}</h3>
                <div style="margin-bottom: 15px;">
                    <span class="badge badge-status">{html.escape(f['status'])}</span>
                    <span class="badge badge-severity">{html.escape(f['severity'])}</span>
                </div>
                <table>
                    <tr><th>Category</th><td>{html.escape(f['category'])}</td></tr>
                    <tr><th>Location</th><td>{html.escape(f.get('file', ''))} : Line {f.get('line_start', '')}</td></tr>
                    <tr><th>Function</th><td>{html.escape(f.get('function') or 'N/A')}</td></tr>
                    <tr><th>Confidence</th><td>{f.get('confidence')}</td></tr>
                    <tr><th>Evidence Status</th><td>{html.escape(f.get('evidence_status') or 'INSUFFICIENT_CONTEXT')}</td></tr>
                    <tr><th>Diagnostic</th><td>{html.escape(f.get('rule') or '')}: {html.escape(f.get('diagnostic_message') or '')}</td></tr>
                    <tr><th>Source/Rule</th><td>{html.escape(f.get('source', ''))} / {html.escape(f.get('rule') or 'N/A')}</td></tr>
                </table>
                
                <h4>Source Evidence (Code)</h4>
                <pre>{html.escape(f.get('evidence') or 'No code evidence provided.')}</pre>
                
                <h4>Static Analysis / AI Explanation</h4>
                <p>{html.escape(f.get('finding') or 'N/A')}</p>
                
                <h4>AI Recommendations</h4>
                <p>{html.escape(f.get('recommendation') or 'No recommendation provided.')}</p>
                
                <h4>RAG Context References</h4>
                {rag_html}
            </div>
        """
        
    html_out += """
        </div>
    </body>
    </html>
    """
    return html_out


def generate_single_finding_html_report(item: dict) -> str:
    """
    Generate a standalone, downloadable HTML audit report for a single code finding / review record.
    Clearly presents whether the item was ACCEPTED or REJECTED with all definitions and evidence.
    """
    finding_id = html.escape(str(item.get("finding_id") or item.get("id") or "UNKNOWN"))
    status = (item.get("review_status") or item.get("status") or "PENDING_REVIEW").upper()
    timestamp = html.escape(str(item.get("timestamp") or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")))
    user = html.escape(str(item.get("user") or item.get("reviewer") or "admin"))
    category = html.escape(str(item.get("category") or "SECURITY_DEFECT"))
    severity = html.escape(str(item.get("severity") or "MEDIUM").upper())
    file_path = html.escape(str(item.get("file") or "unknown"))
    line = str(item.get("line") or item.get("line_start") or "N/A")
    detection = html.escape(str(item.get("detection_source") or item.get("source") or "Deterministic Static Scan"))
    model = html.escape(str(item.get("model_name") or "configured_llm"))
    
    raw_conf = item.get("confidence", 0.0)
    try:
        conf_float = float(raw_conf)
        conf_pct = f"{int(conf_float * 100)}%" if conf_float <= 1.0 else f"{int(conf_float)}%"
    except Exception:
        conf_pct = "N/A"
        
    evidence = html.escape(str(item.get("evidence") or item.get("code") or "")).strip()
    explanation = str(item.get("ai_explanation") or item.get("finding") or "").strip()
    reason = html.escape(str(item.get("reason") or item.get("review_reason") or "")).strip()
    reviewer_changes = html.escape(str(item.get("reviewer_changes") or "")).strip()

    # Determine Status Visual Banner
    if status == "ACCEPTED":
        status_bg = "#064e3b"
        status_border = "#10b981"
        status_badge_bg = "#10b981"
        status_text_color = "#ecfdf5"
        status_icon = "✓ VERIFIED TRUE POSITIVE — ACCEPTED"
        status_desc = "This security defect was reviewed and formally ACCEPTED by the security engineer. Remediation required before production release."
    elif status == "REJECTED":
        status_bg = "#450a0a"
        status_border = "#ef4444"
        status_badge_bg = "#ef4444"
        status_text_color = "#fef2f2"
        status_icon = "✗ DISMISSED / REJECTED"
        status_desc = "This finding was reviewed and REJECTED as a false positive, unreachable code path, or accepted risk."
    elif status == "EDITED":
        status_bg = "#1e3a8a"
        status_border = "#3b82f6"
        status_badge_bg = "#3b82f6"
        status_text_color = "#eff6ff"
        status_icon = "✎ EDITED & APPROVED"
        status_desc = "This finding was MODIFIED AND APPROVED with updated security analysis or customized remediation."
    else:
        status_bg = "#78350f"
        status_border = "#f59e0b"
        status_badge_bg = "#f59e0b"
        status_text_color = "#fffbeb"
        status_icon = "⏳ PENDING REVIEW"
        status_desc = "This finding has been detected by the automated engine and is awaiting security reviewer determination."

    # Format Explanation into structured cards if formatted with standard headers
    formatted_explanation = ""
    if explanation:
        sections = []
        current_title = ""
        current_lines = []
        for line_str in explanation.splitlines():
            line_stripped = line_str.strip()
            if line_stripped.endswith(":") and len(line_stripped) < 40 and not line_stripped.startswith("http"):
                if current_title:
                    sections.append((current_title, "\n".join(current_lines).strip()))
                current_title = line_stripped.rstrip(":")
                current_lines = []
            else:
                current_lines.append(line_str)
        if current_title:
            sections.append((current_title, "\n".join(current_lines).strip()))

        if sections:
            for s_title, s_body in sections:
                formatted_explanation += f"""
                <div class="analysis-card">
                    <h4>{html.escape(s_title)}</h4>
                    <p>{html.escape(s_body)}</p>
                </div>
                """
        else:
            formatted_explanation = f"""
            <div class="analysis-card">
                <h4>Security Findings & Reasoning</h4>
                <p>{html.escape(explanation)}</p>
            </div>
            """
    else:
        formatted_explanation = "<p><em>No explanation recorded.</em></p>"

    # Reason section if rejected or edited
    reason_html = ""
    if reason:
        reason_html = f"""
        <div class="detail-section">
            <h3>Reviewer Justification / Rationale</h3>
            <div class="reason-box">{reason}</div>
        </div>
        """

    evidence_html = ""
    if evidence:
        evidence_html = f"""
        <div class="detail-section">
            <h3>Source Code Evidence (Line {line})</h3>
            <pre class="code-box"><code>{evidence}</code></pre>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SecureCodeRAG Audit Report - {finding_id} ({status})</title>
    <style>
        :root {{
            --bg-color: #0b1120;
            --card-bg: #1e293b;
            --card-border: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #38bdf8;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            padding: 30px 20px;
            line-height: 1.6;
        }}
        .report-container {{
            max-width: 900px;
            margin: 0 auto;
            background: var(--card-bg);
            border-radius: 12px;
            border: 1px solid var(--card-border);
            padding: 36px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--card-border);
            padding-bottom: 20px;
            margin-bottom: 24px;
        }}
        .header-title h1 {{
            font-size: 1.5rem;
            color: #ffffff;
            font-weight: 700;
            letter-spacing: -0.02em;
        }}
        .header-title p {{
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-top: 4px;
        }}
        .status-banner {{
            background: {status_bg};
            border: 1px solid {status_border};
            border-radius: 8px;
            padding: 18px 24px;
            margin-bottom: 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}
        .status-banner-content h2 {{
            font-size: 1.25rem;
            color: {status_text_color};
            font-weight: 700;
        }}
        .status-banner-content p {{
            font-size: 0.9rem;
            color: {status_text_color};
            opacity: 0.9;
            margin-top: 4px;
        }}
        .badge {{
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 0.8rem;
            background: {status_badge_bg};
            color: #ffffff;
            letter-spacing: 0.03em;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 28px;
        }}
        .meta-item {{
            background: #0f172a;
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 14px 18px;
        }}
        .meta-label {{
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
            font-weight: 600;
        }}
        .meta-value {{
            font-size: 0.95rem;
            font-weight: 600;
            color: #f1f5f9;
            margin-top: 4px;
            word-break: break-all;
        }}
        .detail-section {{
            margin-bottom: 28px;
        }}
        .detail-section h3 {{
            font-size: 1.05rem;
            color: var(--accent);
            margin-bottom: 12px;
            border-bottom: 1px solid #334155;
            padding-bottom: 8px;
        }}
        .code-box {{
            background: #090d16;
            border: 1px solid #334155;
            border-left: 4px solid var(--accent);
            border-radius: 6px;
            padding: 16px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.9rem;
            color: #38bdf8;
            overflow-x: auto;
        }}
        .analysis-card {{
            background: #0f172a;
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 14px;
        }}
        .analysis-card h4 {{
            font-size: 0.9rem;
            color: #e2e8f0;
            margin-bottom: 6px;
            font-weight: 600;
        }}
        .analysis-card p {{
            font-size: 0.88rem;
            color: #cbd5e1;
            white-space: pre-wrap;
        }}
        .reason-box {{
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-left: 4px solid #ef4444;
            padding: 14px 18px;
            border-radius: 6px;
            font-size: 0.9rem;
            color: #fecaca;
        }}
        .footer {{
            border-top: 1px solid var(--card-border);
            padding-top: 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8rem;
            color: var(--text-secondary);
        }}
        @media print {{
            body {{ background: #ffffff; color: #000000; padding: 0; }}
            .report-container {{ box-shadow: none; border: 1px solid #ccc; }}
            .code-box {{ background: #f8fafc; color: #000; border: 1px solid #ccc; }}
            .meta-item, .analysis-card {{ background: #f8fafc; border: 1px solid #ccc; }}
            .meta-value, .analysis-card h4, .analysis-card p {{ color: #000; }}
            .status-banner {{ border: 1px solid #000; }}
        }}
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
                <span class="badge">{status}</span>
            </div>
        </div>

        <div class="status-banner">
            <div class="status-banner-content">
                <h2>{status_icon}</h2>
                <p>{status_desc}</p>
            </div>
        </div>

        <div class="grid">
            <div class="meta-item">
                <div class="meta-label">Finding Identifier</div>
                <div class="meta-value">{finding_id}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Review Status & Action</div>
                <div class="meta-value">{status} by {user}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Audit Timestamp</div>
                <div class="meta-value">{timestamp}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Category & Severity</div>
                <div class="meta-value">{category} ({severity})</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Location (File & Line)</div>
                <div class="meta-value">{file_path} : Line {line}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Detection Engine & Confidence</div>
                <div class="meta-value">{detection} • {conf_pct} Confidence</div>
            </div>
        </div>

        {evidence_html}

        {reason_html}

        <div class="detail-section">
            <h3>Defect Definitions & AI RAG Security Analysis</h3>
            {formatted_explanation}
        </div>

        <div class="footer">
            <div>Engine: SecureCodeRAG Deterministic Engine • LLM: {model}</div>
            <div>Audit Sign-off Verified • Immutable Record ID: {finding_id}</div>
        </div>
    </div>
</body>
</html>
"""
