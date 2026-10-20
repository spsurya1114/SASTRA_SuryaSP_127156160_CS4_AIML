import type { AnalysisResponse } from "../types/analysis";

const API_BASE = "/api";

export async function analyzeCode(code: string, projectId?: string): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ code, project_id: projectId })
  });

  if (!res.ok) {
    throw new Error("Failed to analyze code");
  }

  return res.json();
}
