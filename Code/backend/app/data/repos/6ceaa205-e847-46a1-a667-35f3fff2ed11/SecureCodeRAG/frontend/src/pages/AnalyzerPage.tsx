import { useState } from "react";
import { analyzeCode } from "../api/analyzer";
import type { AnalysisResult } from "../types/analysis";
import { Shield, Search, Loader2, Trash2, ShieldCheck, History } from "lucide-react";

import CodeEditor from "../components/CodeEditor";
import Modal from "../components/Modal";
import AnalysisResults from "../components/AnalysisResults";
import Toast from "../components/Toast";
import AuditLog from "../components/AuditLog";
import RepositoryUploader from "../components/RepositoryUploader";

import styles from "./AnalyzerPage.module.css";

interface ToastMessage {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

export default function AnalyzerPage() {
  const [code, setCode] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>();
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [analysisResponse, setAnalysisResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  async function handleAnalyze() {
    if (!code.trim()) {
      addToast("Please enter code to analyze", "error");
      return;
    }

    setLoading(true);
    setIsModalOpen(true);
    setResults([]);
    setAnalysisResponse(null);

    try {
      const data = await analyzeCode(code, projectId);
      const safeResults: AnalysisResult[] = Array.isArray(data?.vulnerabilities) ? data.vulnerabilities : [];
      setResults(safeResults);
      setAnalysisResponse(data);

      if (safeResults.length === 0) {
        if (data?.status === "PARTIAL") {
          addToast("Analysis partially failed. See warnings.", "info");
        } else {
          addToast("No analysis findings detected", "success");
        }
      } else {
        addToast(`Found ${safeResults.length} analysis finding(s)`, "info");
      }
    } catch (err) {
      addToast("Analysis failed. Please try again.", "error");
      setIsModalOpen(false);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleClear = () => {
    setCode("");
    setProjectId(undefined);
    setResults([]);
    addToast("Code cleared", "info");
  };

  const handleFileSelect = (selectedCode: string, pId: string) => {
    setCode(selectedCode);
    setProjectId(pId);
    addToast("File loaded for analysis", "success");
  };

  const handleCloseModal = () => {
    if (!loading) {
      setIsModalOpen(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <Shield size={40} className={styles.logoIcon} />
            <h1>SecureCodeRAG</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p className={styles.subtitle}>
              AI-Powered Security Code Review with RAG
            </p>
            <button 
              className={styles.clearBtn} 
              onClick={() => setShowAudit(!showAudit)}
              style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <History size={16} /> {showAudit ? "Back to Analyzer" : "Audit Log"}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        {showAudit ? (
          <AuditLog />
        ) : (
          <div className={styles.splitLayout}>
            <div className={styles.leftPane}>
              <RepositoryUploader onFileSelect={handleFileSelect} />
            </div>
            <div className={styles.rightPane}>
              <CodeEditor value={code} onChange={setCode} />

              <div className={styles.controls}>
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !code.trim()}
                  className={styles.analyzeBtn}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className={styles.spinner} /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Search size={18} /> Analyze Code
                    </>
                  )}
                </button>

                <button
                  onClick={handleClear}
                  disabled={loading || !code.trim()}
                  className={styles.clearBtn}
                >
                  <Trash2 size={18} /> Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Security Analysis Results"
        icon={<ShieldCheck size={24} />}
      >
        <AnalysisResults results={results} isLoading={loading} response={analysisResponse} />
      </Modal>

      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}