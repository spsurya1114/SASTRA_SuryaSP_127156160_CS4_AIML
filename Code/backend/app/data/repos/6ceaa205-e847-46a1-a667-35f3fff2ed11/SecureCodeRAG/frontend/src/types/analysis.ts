export interface AnalysisResult {
  finding_id: string;
  project_id: string;
  file: string;
  function?: string;
  line_start: number;
  line_end?: number;
  severity: string;
  category: string;
  title: string;
  finding: string;
  evidence: string;
  root_cause?: string;
  rule?: string;
  diagnostic_id?: string;
  diagnostic_message?: string;
  source: string;
  confidence: number;
  explanation_quality?: number;
  status: string;
}

export interface AnalysisResponse {
  vulnerabilities: AnalysisResult[];
  total_vulnerabilities: number;
  total_findings?: number;
  summary?: string;
  status?: string;
  warnings?: string[];
}