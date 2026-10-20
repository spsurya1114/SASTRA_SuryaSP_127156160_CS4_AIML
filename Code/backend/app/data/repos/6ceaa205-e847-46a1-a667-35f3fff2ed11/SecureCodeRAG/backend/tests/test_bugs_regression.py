import sys
import os
import json
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath('backend'))
from app.main import app
from app.core.auth import get_current_user

# Mock auth
def override_get_current_user():
    return {"username": "admin", "role": "ADMIN", "projects": ["*"]}

app.dependency_overrides[get_current_user] = override_get_current_user
client = TestClient(app)

def test_strcpy_classification_and_deduplication():
    # Priority 1 and Priority 2 tests
    code = """
void test_func() {
    char dest[10];
    char src[20] = "abcdefghij";
    strcpy(dest, src);
}
"""
    req_data = {
        "code": code,
        "language": "c"
    }
    
    response = client.post("/api/analyze", json=req_data)
    assert response.status_code == 200, response.text
    vulns = response.json().get("vulnerabilities", [])
    
    # Check that strcpy is classified as UNSAFE_STRING_OPS, not Weak Cryptography
    categories = [v.get("category") for v in vulns]
    types = [v.get("type") for v in vulns]
    
    assert "Weak Cryptography" not in categories, "strcpy was incorrectly classified as Weak Cryptography"
    assert "Weak Cryptography" not in types, "strcpy was incorrectly classified as Weak Cryptography"
    
    assert "UNSAFE_STRING_OPS" in categories, "strcpy was not classified as UNSAFE_STRING_OPS"
    
    # Verify deduplication for UNSAFE_STRING_OPS
    unsafe_ops = [v for v in vulns if v.get("category") == "UNSAFE_STRING_OPS"]
    assert len(unsafe_ops) == 1, f"Expected 1 UNSAFE_STRING_OPS finding, got {len(unsafe_ops)}"
    
def test_review_workflow_and_audit():
    # Priority 4: Test reviewer workflow
    # 1. Generate finding
    code = """
void test_func() {
    char dest[10];
    strcpy(dest, "abc");
}
"""
    response = client.post("/api/analyze", json={"code": code, "language": "c"})
    assert response.status_code == 200
    vulns = response.json().get("vulnerabilities", [])
    assert len(vulns) > 0
    finding_id = vulns[0]["finding_id"]
    
    # 2. Test Accept
    accept_res = client.post(f"/api/review/{finding_id}/accept")
    assert accept_res.status_code == 200, f"Accept failed: {accept_res.text}"
    
    # 3. Test Reject
    reject_res = client.post(f"/api/review/{finding_id}/reject", json={"reason": "False positive"})
    assert reject_res.status_code == 200, f"Reject failed: {reject_res.text}"
    
    # 4. Test Edit
    edit_res = client.post(f"/api/review/{finding_id}/edit", json={"severity": "LOW"})
    assert edit_res.status_code == 200, f"Edit failed: {edit_res.text}"
    
    # 5. Test Audit retrieval
    audit_res = client.get("/api/review/system/audit")
    assert audit_res.status_code == 200, f"Audit failed: {audit_res.text}"
    logs = audit_res.json()
    assert len(logs) > 0
    finding_logs = [log for log in logs if log["finding_id"] == finding_id]
    assert len(finding_logs) >= 3, "Missing audit logs for Accept, Reject, Edit"

def test_report_generation():
    # Priority 5: Verify reports
    report_res = client.get("/api/reports/unknown?format=json")
    assert report_res.status_code in [200, 404] # Depending on if 'unknown' project exists, 404 is fine if not

if __name__ == "__main__":
    print("Testing strcpy classification and deduplication...")
    test_strcpy_classification_and_deduplication()
    print("Testing review workflow and audit endpoints...")
    test_review_workflow_and_audit()
    print("Testing report generation...")
    test_report_generation()
    print("All regression tests passed successfully!")
