from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import HTMLResponse, JSONResponse
from app.review.findings import get_findings_by_project_id
from app.review.audit import get_audit_logs_for_project
from app.reports.generator import generate_html_report, generate_json_report, generate_single_finding_html_report
from app.core.auth import get_current_user, verify_project_access
from app.review.findings import get_findings_by_project_id, get_finding
from app.review.audit import get_audit_logs_for_project, get_audit_log_by_id
import json


router = APIRouter()

@router.get("/finding/{finding_id}/html")
async def get_single_finding_report(
    finding_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns a downloadable standalone HTML report for a specific finding.
    """
    finding = get_finding(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found.")
    
    html_content = generate_single_finding_html_report(finding)
    status_str = (finding.get("status") or "PENDING").lower()
    return HTMLResponse(
        content=html_content,
        headers={"Content-Disposition": f'attachment; filename="finding_{finding_id}_{status_str}.html"'}
    )

@router.get("/audit/{audit_id}/html")
async def get_single_audit_report(
    audit_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns a downloadable standalone HTML report for a specific audit log event.
    """
    log_item = get_audit_log_by_id(audit_id)
    if not log_item:
        raise HTTPException(status_code=404, detail="Audit log entry not found.")
        
    html_content = generate_single_finding_html_report(log_item)
    status_str = (log_item.get("review_status") or "REVIEW").lower()
    finding_id = log_item.get("finding_id", "record")[:8]
    return HTMLResponse(
        content=html_content,
        headers={"Content-Disposition": f'attachment; filename="audit_{finding_id}_{status_str}.html"'}
    )

@router.get("/{project_id}")
async def get_report(
    project_id: str,
    format: str = Query("html", description="Report format: 'html' or 'json'"),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns a structured review report for a specific project.
    """
    verify_project_access(current_user, project_id)
    
    findings = get_findings_by_project_id(project_id)
    if not findings:
        raise HTTPException(status_code=404, detail="No findings found for this project.")
        
    audit_logs = get_audit_logs_for_project(project_id)
    
    if format.lower() == "json":
        json_content = generate_json_report(project_id, findings, audit_logs)
        return JSONResponse(content=json.loads(json_content))
    else:
        # Default to HTML
        html_content = generate_html_report(project_id, findings, audit_logs)
        return HTMLResponse(content=html_content)
