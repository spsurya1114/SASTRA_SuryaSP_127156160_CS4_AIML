import type { AnalysisResult, AnalysisResponse } from "../types/analysis";
import { ShieldAlert, ShieldCheck, CheckCircle, AlertTriangle } from "lucide-react";
import VulnerabilityList from "./VulnerabilityList";
import ExplanationPanel from "./ExplanationPanel";
import styles from "./AnalysisResults.module.css";
import { summarizeFindings } from "../utils/findingPresentation";

interface Props {
  results: AnalysisResult[];
  isLoading: boolean;
  response?: AnalysisResponse | null;
}

export default function AnalysisResults({ results, isLoading, response }: Props) {
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Analyzing your code for vulnerabilities...</p>
        <span className={styles.subtext}>This may take a few seconds</span>
      </div>
    );
  }

  if (results.length === 0) {
    if (response?.status === "PARTIAL" && response.warnings && response.warnings.length > 0) {
      return (
        <div className={styles.noVulnerabilities}>
          <AlertTriangle size={64} style={{ color: "orange" }} />
          <h3>Partial Analysis</h3>
          <p>Analysis completed but some tools failed.</p>
          <div className={styles.tips} style={{ textAlign: "left", marginTop: "1rem" }}>
            <h4>Warnings:</h4>
            <ul>
              {response.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>
      );
    }
    return (
      <div className={styles.noVulnerabilities}>
        <ShieldCheck size={64} className={styles.successIcon} />
        <h3>No Vulnerabilities Detected</h3>
        <p>Your code appears to be secure based on our analysis.</p>
        <div className={styles.tips}>
          <h4><CheckCircle size={16} /> Security Tips</h4>
          <ul>
            <li>Continue following secure coding practices</li>
            <li>Keep dependencies up to date</li>
            <li>Perform regular security audits</li>
          </ul>
        </div>
      </div>
    );
  }

  const severitySummary = summarizeFindings(results);


  return (
    <div className={styles.container}>
      {response?.status === "PARTIAL" && response.warnings && response.warnings.length > 0 && (
        <div className={styles.warningsBanner} style={{ backgroundColor: "#fffae6", color: "#8a6d3b", padding: "10px", borderRadius: "4px", marginBottom: "20px", border: "1px solid #faebcc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
            <AlertTriangle size={20} />
            Partial Analysis (Some tools failed)
          </div>
          <ul style={{ margin: "10px 0 0 28px", padding: 0 }}>
            {response.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
      <div className={styles.summary}>
        <div className={styles.summaryHeader}>
          <ShieldAlert size={24} />
          <h3>Analysis Summary</h3>
        </div>
        <div className={styles.stats}>
          <div className={`${styles.stat} ${styles.critical}`}>
            <span className={styles.statCount}>{severitySummary.critical}</span>
            <span className={styles.statLabel}>Critical</span>
          </div>
          <div className={`${styles.stat} ${styles.high}`}>
            <span className={styles.statCount}>{severitySummary.high}</span>
            <span className={styles.statLabel}>High</span>
          </div>
          <div className={`${styles.stat} ${styles.medium}`}>
            <span className={styles.statCount}>{severitySummary.medium}</span>
            <span className={styles.statLabel}>Medium</span>
          </div>
          <div className={`${styles.stat} ${styles.low}`}>
            <span className={styles.statCount}>{severitySummary.low}</span>
            <span className={styles.statLabel}>Low</span>
          </div>
          <div className={`${styles.stat} ${styles.info}`}>
            <span className={styles.statCount}>{severitySummary.info}</span>
            <span className={styles.statLabel}>Informational</span>
          </div>
        </div>
        <p className={styles.summaryTotals}>
          Total analysis findings: <strong>{severitySummary.total}</strong>
          <span aria-hidden="true"> · </span>
          Non-informational security-severity findings: <strong>{severitySummary.securitySeverityFindings}</strong>
        </p>
      </div>

      <div className={styles.resultsContent}>
        <VulnerabilityList results={results} />
        <ExplanationPanel results={results} />
      </div>
    </div>
  );
}