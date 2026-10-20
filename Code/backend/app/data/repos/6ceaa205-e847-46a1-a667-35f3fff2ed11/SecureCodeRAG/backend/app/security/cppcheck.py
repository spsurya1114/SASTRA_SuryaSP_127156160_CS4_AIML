import subprocess
import os
from typing import List, Dict

def run_cppcheck(repo_path: str) -> List[Dict]:
    """
    Runs cppcheck against the selected repository and parses findings.
    Fails gracefully if cppcheck is not installed.
    """
    if not os.path.exists(repo_path):
        return []
        
    try:
        # Run cppcheck with XML output
        # --xml enables XML output, --enable=all turns on all checks
        result = subprocess.run(
            ['cppcheck', '--enable=all', '--xml', '--inconclusive', '.'],
            cwd=repo_path,
            capture_output=True,
            text=True
        )
        
        # cppcheck outputs XML to stderr
        xml_output = result.stderr
        
        if not xml_output or "<?xml" not in xml_output:
            return []
            
        return parse_cppcheck_xml(xml_output, repo_path)
        
    except FileNotFoundError:
        # cppcheck is not installed
        print("cppcheck is not installed. AI/static pattern analysis is still available.")
        return []
    except Exception as e:
        print(f"Error running cppcheck: {e}")
        return []

def map_cppcheck_category(rule_id: str) -> str:
    rule_id = rule_id.lower()
    if "uninit" in rule_id:
        return "UNINITIALIZED_VARIABLE"
    elif "outofbounds" in rule_id or "arrayindex" in rule_id:
        return "OUT_OF_BOUNDS"
    elif "zerodiv" in rule_id:
        return "DIVISION_BY_ZERO"
    elif "overflow" in rule_id or "shift" in rule_id:
        return "INTEGER_OVERFLOW"
    elif "nullpointer" in rule_id:
        return "NULL_POINTER"
    elif "buffer" in rule_id:
        return "BUFFER_OVERFLOW"
    elif "leak" in rule_id or "free" in rule_id or "autovariable" in rule_id:
        return "MEMORY_ERROR"
    elif "misra" in rule_id:
        return "MISRA"
    elif "str" in rule_id:
        return "UNSAFE_STRING_OPS"
    else:
        return "STATIC_ANALYSIS"

def parse_cppcheck_xml(xml_content: str, repo_path: str) -> List[Dict]:
    import xml.etree.ElementTree as ET
    findings = []
    try:
        root = ET.fromstring(xml_content)
        errors = root.find('errors')
        if errors is None:
            return findings
            
        for error in errors.findall('error'):
            msg = error.get('msg', '')
            severity = error.get('severity', 'style')
            rule_id = error.get('id', '')
            
            # Map cppcheck severity to our scale
            sev_map = {
                'error': 'HIGH',
                'warning': 'MEDIUM',
                'style': 'LOW',
                'performance': 'LOW',
                'portability': 'LOW',
                'information': 'INFO'
            }
            mapped_severity = sev_map.get(severity, 'INFO')
            category = map_cppcheck_category(rule_id)
            
            for location in error.findall('location'):
                file_path = location.get('file', '')
                line_num = int(location.get('line', 0))
                
                findings.append({
                    "file": file_path,
                    "line": line_num,
                    "severity": mapped_severity,
                    "message": msg,
                    "rule": rule_id,
                    "source": "cppcheck",
                    "category": category
                })
    except Exception as e:
        print(f"Failed to parse cppcheck XML: {e}")
        
    return findings

def run_cppcheck_on_code(code: str, language: str = "c") -> List[Dict]:
    import tempfile
    
    ext = ".cpp" if language == "cpp" else ".c"
    
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False, mode='w', encoding='utf-8') as f:
        f.write(code)
        temp_path = f.name
        
    try:
        result = subprocess.run(
            ['cppcheck', '--enable=all', '--xml', '--inconclusive', temp_path],
            capture_output=True,
            text=True
        )
        
        xml_output = result.stderr
        
        if not xml_output or "<?xml" not in xml_output:
            return []
            
        findings = parse_cppcheck_xml(xml_output, os.path.dirname(temp_path))
        
        # We need to map the temp file back to generic findings and add lines
        lines = code.splitlines()
        
        formatted_findings = []
        for finding in findings:
            line_num = finding.get("line", 1)
            line_content = lines[line_num - 1] if 0 < line_num <= len(lines) else ""
            
            diagnostic_id = finding.get("rule", "CPPCHECK_ISSUE")
            diagnostic_message = finding.get("message", "")
            formatted_findings.append({
                "type": diagnostic_id,
                "rule": diagnostic_id,
                "diagnostic_id": diagnostic_id,
                "diagnostic_message": diagnostic_message,
                "severity": finding.get("severity", "INFO"),
                "category": finding.get("category", "STATIC_ANALYSIS"),
                "line": line_num,
                "code": line_content.strip(),
                "description": diagnostic_message,
                "source": "CPPCHECK"
            })
            
        return formatted_findings
    except FileNotFoundError:
        print("[WARNING] Cppcheck is not installed or not in PATH.")
        raise RuntimeError("Static-analysis tooling (cppcheck) is unavailable.")
    except Exception as e:
        print(f"Error running cppcheck on code: {e}")
        return []
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
