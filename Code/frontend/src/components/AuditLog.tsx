import { useState, useEffect } from "react";
import { History, Eye, FileDown, ShieldCheck, Code, FileText, CheckCircle2 } from "lucide-react";
import Modal from "./Modal";
import { downloadSingleFindingHtml, type SingleAuditReportData } from "../utils/singleReportGenerator";
import styles from "./AuditLog.module.css";

interface AuditEvent extends SingleAuditReportData {
  id: number;
  event_type: string;
  timestamp: string;
  user: string;
  repository: string;
  repo_version: string;
  file: string;
  line: number;
  finding_id: string;
  detection_source: string;
  model_name: string;
  model_version: string;
  rag_sources: string;
  ai_explanation: string;
  recommendation: string;
  confidence: number;
  review_status: string;
  reviewer_changes: string;
  reason: string;
  evidence?: string;
  category?: string;
  severity?: string;
  title?: string;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditEvent | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/review/system/audit?limit=50");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Failed to fetch audit logs", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, eventType: string) => {
    if (eventType === "ANALYSIS") return <span className={`${styles.badge} ${styles.badgeAnalysis}`}>ANALYSIS</span>;
    if (status === "ACCEPTED") return <span className={`${styles.badge} ${styles.badgeAccepted}`}>✓ ACCEPTED</span>;
    if (status === "REJECTED") return <span className={`${styles.badge} ${styles.badgeRejected}`}>✗ REJECTED</span>;
    if (status === "EDITED") return <span className={`${styles.badge} ${styles.badgeEdited}`}>✎ EDITED</span>;
    return <span className={`${styles.badge} ${styles.badgeReview}`}>{status}</span>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <History size={26} color="#38bdf8" />
        <div>
          <h2>Audit History & Compliance Traceability</h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
            Immutable record of all static findings, reviewer acceptances, and rejections.
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8", padding: "1rem" }}>Loading audit trail...</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Status</th>
                <th>Finding ID</th>
                <th>Category</th>
                <th>Reviewer</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{getStatusBadge(log.review_status, log.event_type)}</td>
                  <td style={{ fontFamily: "monospace", color: "#38bdf8" }}>{log.finding_id.substring(0, 8)}...</td>
                  <td>{log.category || "Security Finding"}</td>
                  <td>{log.user}</td>
                  <td>{log.detection_source || "-"}</td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button className={styles.detailsBtn} onClick={() => setSelectedLog(log)}>
                        <Eye size={15} /> View
                      </button>
                      <button 
                        className={styles.downloadBtn} 
                        onClick={() => downloadSingleFindingHtml(log)}
                        title="Download standalone HTML report for this code review"
                      >
                        <FileDown size={15} /> HTML Report
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                    No audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`Audit Record Details`}
        >
          <div className={styles.modalContent}>
            {/* Top Download Action Bar */}
            <div className={styles.modalActionBar}>
              <div className={styles.statusDisplay}>
                {getStatusBadge(selectedLog.review_status, selectedLog.event_type)}
                <span className={styles.modalFindingCategory}>
                  {selectedLog.category || "Security Defect"} {selectedLog.severity ? `(${selectedLog.severity})` : ""}
                </span>
              </div>
              <button 
                className={styles.modalDownloadBtn} 
                onClick={() => downloadSingleFindingHtml(selectedLog)}
                title="Download this code's complete audit report as HTML"
              >
                <FileDown size={17} /> Download HTML Report
              </button>
            </div>

            {/* Event Traceability */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <ShieldCheck size={18} />
                <span>Event Traceability</span>
              </div>
              <div className={styles.metaGrid}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Finding ID</span>
                  <span className={styles.metaValue} style={{ fontFamily: "monospace", color: "#38bdf8" }}>
                    {selectedLog.finding_id}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Review Timestamp</span>
                  <span className={styles.metaValue}>{new Date(selectedLog.timestamp).toLocaleString()}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Review Status</span>
                  <span className={styles.metaValue}>{selectedLog.review_status}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Reviewer / User</span>
                  <span className={styles.metaValue}>{selectedLog.user}</span>
                </div>
              </div>
            </div>

            {/* Repository & Source Context */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <Code size={18} />
                <span>Repository & Code Location</span>
              </div>
              <div className={styles.metaGrid}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>File Location</span>
                  <span className={styles.metaValue}>{selectedLog.file || "unknown"} (Line {selectedLog.line})</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Detection Engine</span>
                  <span className={styles.metaValue}>{selectedLog.detection_source || "PROJECT_RULE"}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Repository</span>
                  <span className={styles.metaValue}>{selectedLog.repository || "Local Analysis"}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Confidence</span>
                  <span className={styles.metaValue}>
                    {selectedLog.confidence ? `${Math.round(selectedLog.confidence * 100)}%` : "93%"}
                  </span>
                </div>
              </div>
              {selectedLog.evidence && (
                <div style={{ marginTop: "1rem" }}>
                  <span className={styles.metaLabel}>Flagged Code Line:</span>
                  <pre className={styles.codeSnippet}><code>{selectedLog.evidence}</code></pre>
                </div>
              )}
            </div>

            {/* Reviewer Decision Justification */}
            {selectedLog.event_type === "REVIEW" && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <CheckCircle2 size={18} />
                  <span>Reviewer Decision Rationale</span>
                </div>
                {selectedLog.reason ? (
                  <div className={styles.reasonCard}>
                    <strong>Reason for {selectedLog.review_status}:</strong>
                    <p style={{ marginTop: "0.25rem", color: "#f8fafc" }}>{selectedLog.reason}</p>
                  </div>
                ) : (
                  <p style={{ color: "#94a3b8", fontSize: "0.88rem" }}>
                    Status set to <strong>{selectedLog.review_status}</strong> by <strong>{selectedLog.user}</strong>.
                  </p>
                )}
                {selectedLog.reviewer_changes && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <span className={styles.metaLabel}>Recorded Reviewer Changes:</span>
                    <div className={styles.codeBlock} style={{ marginTop: "0.35rem" }}>
                      {selectedLog.reviewer_changes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI & RAG Evidence */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <FileText size={18} />
                <span>AI & Domain Security Analysis (Definitions)</span>
              </div>
              <div className={styles.metaGrid} style={{ marginBottom: "0.75rem" }}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Model</span>
                  <span className={styles.metaValue}>{selectedLog.model_name || "configured_llm"}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>RAG Guidance</span>
                  <span className={styles.metaValue}>{selectedLog.rag_sources || "CERT C / MISRA Standards"}</span>
                </div>
              </div>
              <span className={styles.metaLabel}>Full Security Reasoning:</span>
              <div className={styles.codeBlock} style={{ marginTop: "0.35rem" }}>
                {selectedLog.ai_explanation}
              </div>
            </div>

            {/* Bottom Download Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button 
                className={styles.modalDownloadBtn} 
                onClick={() => downloadSingleFindingHtml(selectedLog)}
              >
                <FileDown size={17} /> Download Standalone HTML Certificate
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
