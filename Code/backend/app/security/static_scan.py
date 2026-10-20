import re
from typing import List, Dict

try:
    import tree_sitter_c as tsc
    from tree_sitter import Language, Parser
    _C_LANGUAGE = Language(tsc.language())
    _TS_PARSER = Parser(_C_LANGUAGE)
except Exception:
    _C_LANGUAGE = None
    _TS_PARSER = None

from app.security.vulnerability_map import VULNERABILITY_PATTERNS
from app.security.automotive_rules import AUTOMOTIVE_PATTERNS


class StaticScanner:
    """
    Deterministic static scanner for C/C++ source code.

    Regex rules are used for direct vulnerability patterns.
    Additional context-aware checks are used for pointer
    dereferences and unsafe operations.
    """

    def __init__(self):
        self.patterns = VULNERABILITY_PATTERNS.copy()
        self.patterns.update(AUTOMOTIVE_PATTERNS)

    # =========================================================
    # Utility
    # =========================================================

    @staticmethod
    def _add_finding(
        vulnerabilities: List[Dict],
        vuln_type: str,
        severity: str,
        category: str,
        line_num: int,
        line: str,
        description: str = "",
        source: str = "PROJECT_RULE"
    ):
        vulnerabilities.append(
            {
                "type": vuln_type,
                "severity": severity,
                "category": category,
                "line": line_num,
                "code": line.strip(),
                "description": description,
                "source": source
            }
        )

    @staticmethod
    def _mask_non_code(code: str) -> List[str]:
        """Mask comments and literals while preserving source line positions."""
        masked = []
        state = "code"
        escaped = False
        index = 0

        while index < len(code):
            char = code[index]
            if state == "line_comment":
                if char == "\n":
                    state = "code"
                    masked.append(char)
                else:
                    masked.append(" ")
                index += 1
                continue

            if state == "block_comment":
                if char == "\n":
                    masked.append(char)
                else:
                    masked.append(" ")
                if char == "*" and index + 1 < len(code) and code[index + 1] == "/":
                    masked.append(" ")
                    index += 2
                    state = "code"
                    continue
                index += 1
                continue

            if state in ("string", "char"):
                if char == "\n":
                    state = "code"
                    escaped = False
                    masked.append(char)
                else:
                    masked.append(" ")
                    if escaped:
                        escaped = False
                    elif char == "\\":
                        escaped = True
                    elif (state == "string" and char == '"') or (state == "char" and char == "'"):
                        state = "code"
                index += 1
                continue

            if char == "/":
                if index + 1 < len(code) and code[index + 1] == "/":
                    state = "line_comment"
                    masked.extend([" ", " "])
                    index += 2
                    continue
                if index + 1 < len(code) and code[index + 1] == "*":
                    state = "block_comment"
                    masked.extend([" ", " "])
                    index += 2
                    continue
                masked.append(char)
            elif char == '"':
                state = "string"
                masked.append(" ")
            elif char == "'":
                state = "char"
                masked.append(" ")
            else:
                masked.append(char)

            index += 1

        return "".join(masked).splitlines()

    # =========================================================
    # NULL POINTER ANALYSIS
    # =========================================================

    def _check_null_pointer(
        self,
        lines: List[str],
        source_lines: List[str],
        vulnerabilities: List[Dict],
    ):
        """
        Detect actual dereferences of pointers that are known
        to be initialized to NULL/NULLPTR.

        Example detected:

            char *ptr = NULL;
            printf("%d", *ptr);

        The declaration itself is NOT reported.
        """

        null_pointers = set()

        for i, line in enumerate(lines):

            stripped = line.strip()

            # -------------------------------------------------
            # Detect:
            # char *ptr = NULL;
            # int *p = NULL;
            # ptr = NULL;
            # -------------------------------------------------

            match = re.search(
                r"\b(?:char|int|long|short|float|double|void)"
                r"\s*\*+\s*(\w+)\s*=\s*(?:NULL|nullptr|0)\s*;",
                stripped,
                re.IGNORECASE,
            )

            if match:
                null_pointers.add(match.group(1))
                continue

            assignment = re.search(
                r"\b(\w+)\s*=\s*(?:NULL|nullptr)\s*;",
                stripped,
                re.IGNORECASE,
            )

            if assignment:
                null_pointers.add(assignment.group(1))
                continue

            # -------------------------------------------------
            # Check actual dereference
            # -------------------------------------------------

            for pointer in list(null_pointers):

                dereference = re.search(
                    rf"\*\s*{re.escape(pointer)}\b",
                    stripped,
                )

                if dereference:

                    self._add_finding(
                        vulnerabilities,
                        vuln_type="NULL_POINTER",
                        severity="HIGH",
                        category="NULL_POINTER",
                        line_num=i + 1,
                        line=source_lines[i],
                        description=(
                            f"Pointer '{pointer}' is known to be NULL "
                            "and is dereferenced."
                        ),
                    )

                    # Avoid repeatedly reporting the same pointer
                    null_pointers.discard(pointer)

    # =========================================================
    # UNSAFE STRING OPERATIONS
    # =========================================================

    def _check_unsafe_strings(
        self,
        lines: List[str],
        source_lines: List[str],
        vulnerabilities: List[Dict],
    ):
        """
        Detect inherently unsafe C string functions.

        Examples:
            gets(buffer);
            strcpy(dest, src);
            strcat(dest, src);
        """

        unsafe_functions = {
            "gets": "CRITICAL",
            "strcpy": "HIGH",
            "strcat": "HIGH",
            "sprintf": "HIGH",
        }

        for i, line in enumerate(lines):

            stripped = line.strip()

            for function, severity in unsafe_functions.items():

                if re.search(
                    rf"\b{function}\s*\(",
                    stripped,
                ):

                    self._add_finding(
                        vulnerabilities,
                        vuln_type="UNSAFE_STRING_OPS",
                        severity=severity,
                        category="UNSAFE_STRING_OPS",
                        line_num=i + 1,
                        line=source_lines[i],
                        description=(
                            f"Use of unsafe string function "
                            f"'{function}()' without explicit "
                            "bounds control."
                        ),
                    )

    # =========================================================
    # BOUNDARY ANALYSIS
    # =========================================================

    def _check_boundary_violations(
        self,
        lines: List[str],
        source_lines: List[str],
        vulnerabilities: List[Dict],
    ):
        """
        Detect obvious fixed-buffer boundary issues.

        Example:

            char buffer[10];
            strcpy(buffer, input);
        """

        buffers = {}

        for i, line in enumerate(lines):

            stripped = line.strip()

            # Detect fixed-size arrays
            match = re.search(
                r"\b(?:char|int|short|long|float|double)"
                r"\s+(\w+)\s*\[\s*(\d+)\s*\]",
                stripped,
            )

            if match:
                variable = match.group(1)
                size = int(match.group(2))
                buffers[variable] = size
                continue

            # Detect strcpy into known fixed buffer
            strcpy_match = re.search(
                r"\bstrcpy\s*\(\s*(\w+)\s*,",
                stripped,
            )

            if strcpy_match:

                destination = strcpy_match.group(1)

                if destination in buffers:

                    self._add_finding(
                        vulnerabilities,
                        vuln_type="BOUNDARY_VIOLATION",
                        severity="HIGH",
                        category="BOUNDARY_VIOLATION",
                        line_num=i + 1,
                        line=source_lines[i],
                        description=(
                            f"'{destination}' is a fixed-size "
                            f"buffer of {buffers[destination]} bytes "
                            "and is passed to strcpy(), which performs "
                            "no destination bounds checking."
                        ),
                    )

    # =========================================================
    # INTEGER ARITHMETIC / OVERFLOW ANALYSIS (AST-FIRST)
    # =========================================================

    def _check_integer_overflow(
        self,
        code: str,
        lines: List[str],
        source_lines: List[str],
        vulnerabilities: List[Dict],
    ):
        """
        Detect arithmetic operations with potential for integer overflow or
        invalid division (e.g. division by -1).
        Uses Tree-Sitter AST when available to distinguish binary_expression (*)
        from pointer_declarator (e.g. FILE *fp, char *p), eliminating false alarms.
        """
        reported_lines = set()

        if _TS_PARSER is not None:
            try:
                tree = _TS_PARSER.parse(code.encode("utf-8"))

                def walk(node):
                    if node.type == "binary_expression":
                        op = None
                        right_text = ""
                        for child in node.children:
                            if child.type in ("*", "/"):
                                op = child.type
                            elif op == "/":
                                right_text = child.text.decode("utf-8", errors="ignore").strip()

                        line_num = node.start_point[0] + 1

                        if op == "*" and line_num not in reported_lines:
                            reported_lines.add(line_num)
                            self._add_finding(
                                vulnerabilities,
                                vuln_type="INTEGER_OVERFLOW",
                                severity="MEDIUM",
                                category="INTEGER_OVERFLOW",
                                line_num=line_num,
                                line=source_lines[line_num - 1] if 0 <= line_num - 1 < len(source_lines) else "",
                                description="Potential integer overflow in arithmetic expression.",
                            )
                        elif op == "/" and right_text == "-1" and line_num not in reported_lines:
                            reported_lines.add(line_num)
                            self._add_finding(
                                vulnerabilities,
                                vuln_type="INTEGER_OVERFLOW",
                                severity="MEDIUM",
                                category="INTEGER_OVERFLOW",
                                line_num=line_num,
                                line=source_lines[line_num - 1] if 0 <= line_num - 1 < len(source_lines) else "",
                                description="Potential integer overflow or invalid signed division (division by -1).",
                            )
                    for child in node.children:
                        walk(child)

                walk(tree.root_node)
                return
            except Exception:
                pass

        # Regex fallback with strict pointer declaration exclusion
        type_keywords = (
            r'\b(?:int|char|short|long|float|double|void|FILE|size_t|ssize_t|'
            r'int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t|'
            r'uintptr_t|intptr_t|bool|auto|const|struct|unsigned|signed|[A-Z]\w*)\b'
        )
        declaration_pattern = re.compile(
            rf'^\s*(?:const\s+|static\s+|volatile\s+|struct\s+)?(?:[A-Za-z_]\w*::)*[A-Za-z_]\w+\s*\*+\s*[A-Za-z_]\w*'
        )
        param_or_type_ptr_pattern = re.compile(
            rf'{type_keywords}\s*\*+\s*[A-Za-z_]\w*'
        )
        arithmetic_pattern = re.compile(
            r'(?:\b[a-zA-Z_]\w*\s*[\*]\s*(?:[a-zA-Z_]\w*|\d+)\b(?!\s*[\*=]))|(?:\b[a-zA-Z_]\w*\s*/\s*-1\b)'
        )

        for line_num, line in enumerate(lines, start=1):
            stripped = line.strip()
            if declaration_pattern.match(stripped) or re.search(r'\b[A-Za-z_]\w+\s*\*+\s*[A-Za-z_]\w+\s*=', stripped):
                continue
            if re.search(r'\(.*\*+.*\)', stripped) and not re.search(r'sizeof\s*\(', stripped):
                if param_or_type_ptr_pattern.search(stripped):
                    continue
            if arithmetic_pattern.search(stripped) and line_num not in reported_lines:
                m = arithmetic_pattern.search(stripped)
                if m and param_or_type_ptr_pattern.search(m.group(0)):
                    continue
                reported_lines.add(line_num)
                self._add_finding(
                    vulnerabilities,
                    vuln_type="INTEGER_OVERFLOW",
                    severity="MEDIUM",
                    category="INTEGER_OVERFLOW",
                    line_num=line_num,
                    line=source_lines[line_num - 1],
                    description="Potential integer overflow or invalid signed division.",
                )

    # =========================================================
    # UNCHECKED RETURN VALUE ANALYSIS (AST-FIRST)
    # =========================================================

    def _check_unchecked_return_value(
        self,
        code: str,
        lines: List[str],
        source_lines: List[str],
        vulnerabilities: List[Dict],
    ):
        """
        Detect unchecked return values from system calls and I/O operations
        (e.g., fopen, fdopen, freopen, popen) where failure returns NULL but
        the returned handle is used without checking if it is NULL.
        """
        CHECK_FUNCS = {"fopen", "popen", "fdopen", "freopen", "open"}
        reported_lines = set()

        if _TS_PARSER is not None:
            try:
                tree = _TS_PARSER.parse(code.encode("utf-8"))

                def check_ast(node):
                    var_name = None
                    func_name = None
                    line_num = None
                    stmt_node = None

                    if node.type == "declaration":
                        for child in node.children:
                            if child.type == "init_declarator":
                                decl_target = None
                                call_expr = None
                                for c in child.children:
                                    if c.type in ("pointer_declarator", "identifier"):
                                        decl_target = c
                                    elif c.type == "call_expression":
                                        call_expr = c
                                if decl_target and call_expr:
                                    fn_node = call_expr.child_by_field_name("function") or (call_expr.children[0] if call_expr.children else None)
                                    if fn_node and fn_node.type == "identifier":
                                        fname = fn_node.text.decode("utf-8", errors="ignore")
                                        if fname in CHECK_FUNCS:
                                            func_name = fname
                                            line_num = node.start_point[0] + 1
                                            stmt_node = node
                                            if decl_target.type == "pointer_declarator":
                                                for sub in decl_target.children:
                                                    if sub.type == "identifier":
                                                        var_name = sub.text.decode("utf-8", errors="ignore")
                                            else:
                                                var_name = decl_target.text.decode("utf-8", errors="ignore")

                    elif node.type == "assignment_expression":
                        left = node.child_by_field_name("left") or (node.children[0] if node.children else None)
                        right = node.child_by_field_name("right") or (node.children[2] if len(node.children) > 2 else None)
                        if left and right and right.type == "call_expression":
                            fn_node = right.child_by_field_name("function") or (right.children[0] if right.children else None)
                            if fn_node and fn_node.type == "identifier":
                                fname = fn_node.text.decode("utf-8", errors="ignore")
                                if fname in CHECK_FUNCS:
                                    func_name = fname
                                    line_num = node.start_point[0] + 1
                                    var_name = left.text.decode("utf-8", errors="ignore")
                                    stmt_node = node.parent if node.parent and node.parent.type == "expression_statement" else node

                    if var_name and func_name and stmt_node and line_num not in reported_lines:
                        parent = stmt_node.parent
                        if parent:
                            siblings = parent.children
                            stmt_idx = -1
                            for i, s in enumerate(siblings):
                                if s.id == stmt_node.id:
                                    stmt_idx = i
                                    break

                            has_check = False
                            used_before_check = False
                            for s in siblings[stmt_idx + 1:]:
                                s_text = s.text.decode("utf-8", errors="ignore").strip()
                                if s.type == "if_statement":
                                    cond_node = s.child_by_field_name("condition")
                                    cond_text = cond_node.text.decode("utf-8", errors="ignore") if cond_node else s_text.split("{")[0]
                                    if re.search(rf"\b{re.escape(var_name)}\b", cond_text):
                                        has_check = True
                                        break
                                if re.search(rf"\b{re.escape(var_name)}\b", s_text):
                                    used_before_check = True
                                    break

                            if used_before_check or not has_check:
                                reported_lines.add(line_num)
                                self._add_finding(
                                    vulnerabilities,
                                    vuln_type="UNCHECKED_RETURN_VALUE",
                                    severity="MEDIUM",
                                    category="UNCHECKED_RETURN_VALUE",
                                    line_num=line_num,
                                    line=source_lines[line_num - 1] if 0 <= line_num - 1 < len(source_lines) else "",
                                    description=(
                                        f"Return value of '{func_name}()' assigned to '{var_name}' "
                                        "is used without checking for NULL/failure."
                                    ),
                                )

                    for child in node.children:
                        check_ast(child)

                check_ast(tree.root_node)
                return
            except Exception:
                pass

        # Regex fallback
        for i, line in enumerate(lines):
            stripped = line.strip()
            for fn in sorted(CHECK_FUNCS, key=len, reverse=True):
                m = re.search(r'(?:[A-Za-z_]\w*\s*\*+|\b)([A-Za-z_]\w*)\s*=\s*\b' + fn + r'\s*\(', stripped)
                if m:
                    var_name = m.group(1)
                    line_num = i + 1
                    if line_num in reported_lines:
                        continue

                    has_check = False
                    used_before_check = False
                    for j in range(i + 1, min(i + 15, len(lines))):
                        next_line = lines[j].strip()
                        if re.search(rf'\bif\s*\([^)]*\b{re.escape(var_name)}\b', next_line):
                            has_check = True
                            break
                        if re.search(rf'\b{re.escape(var_name)}\b', next_line):
                            used_before_check = True
                            break

                    if used_before_check or not has_check:
                        reported_lines.add(line_num)
                        self._add_finding(
                            vulnerabilities,
                            vuln_type="UNCHECKED_RETURN_VALUE",
                            severity="MEDIUM",
                            category="UNCHECKED_RETURN_VALUE",
                            line_num=line_num,
                            line=source_lines[i],
                            description=(
                                f"Return value of '{fn}()' assigned to '{var_name}' "
                                "is used without checking for NULL/failure."
                            ),
                        )

    # =========================================================
    # REGEX RULES
    # =========================================================

    def _run_pattern_rules(
        self,
        lines: List[str],
        source_lines: List[str],
        vulnerabilities: List[Dict],
    ):
        """
        Run existing deterministic vulnerability patterns.

        These rules are retained for categories that are directly
        identifiable from a single source line.
        """

        for vuln_type, pattern_info in self.patterns.items():

            pattern = pattern_info["pattern"]
            severity = pattern_info["severity"]

            for line_num, line in enumerate(lines, start=1):

                if re.search(
                    pattern,
                    line,
                    re.IGNORECASE,
                ):

                    # Avoid duplicate NULL_POINTER findings because
                    # NULL_POINTER is now handled contextually.
                    if vuln_type == "NULL_POINTER":
                        continue

                    # Avoid duplicate unsafe string findings because
                    # these are handled explicitly above.
                    if vuln_type == "UNSAFE_STRING_OPS":
                        continue

                    # Avoid duplicate boundary findings.
                    if vuln_type == "BOUNDARY_VIOLATION":
                        continue

                    # Handled contextually by AST-first analysis
                    if vuln_type in ("INTEGER_OVERFLOW", "UNCHECKED_RETURN_VALUE"):
                        continue

                    self._add_finding(
                        vulnerabilities,
                        vuln_type=vuln_type,
                        severity=severity,
                        category=pattern_info.get(
                            "category",
                            vuln_type,
                        ),
                        line_num=line_num,
                        line=source_lines[line_num - 1],
                        description=pattern_info.get(
                            "description",
                            "",
                        ),
                    )

    def _check_division_by_zero(
        self,
        lines: List[str],
        source_lines: List[str],
        vulnerabilities: List[Dict],
    ):
        """Detect division by a variable or literal zero in executable code."""
        division_pattern = re.compile(
            r"(?<![/%])/(?![/])\s*(?P<divisor>[A-Za-z_]\w*|[-+]?\d+)"
        )
        guard_pattern = re.compile(
            r"\bif\s*\([^)]*\b{divisor}\b\s*(?:!=|>)\s*0"
        )

        for index, line in enumerate(lines):
            match = division_pattern.search(line)
            if not match:
                continue

            divisor = match.group("divisor")
            if divisor.lstrip("+-").isdigit() and int(divisor) != 0:
                continue

            guarded = False
            if not divisor.lstrip("+-").isdigit():
                guard = guard_pattern.pattern.format(divisor=re.escape(divisor))
                previous_lines = lines[max(0, index - 5):index]
                guarded = any(re.search(guard, previous, re.IGNORECASE) for previous in previous_lines)
                guarded = guarded or bool(re.search(guard, line[:match.start()], re.IGNORECASE))
            if guarded:
                continue

            self._add_finding(
                vulnerabilities,
                vuln_type="DIVISION_BY_ZERO",
                severity="MEDIUM",
                category="DIVISION_BY_ZERO",
                line_num=index + 1,
                line=source_lines[index],
                description=f"Division uses '{divisor}' without an obvious non-zero guard.",
            )

    # =========================================================
    # DEDUPLICATION
    # =========================================================

    @staticmethod
    def _deduplicate(
        vulnerabilities: List[Dict],
    ) -> List[Dict]:
        if not vulnerabilities:
            return []

        def _score(v: Dict) -> int:
            cat = str(v.get("category") or v.get("type") or "").upper()
            if cat in ("STATIC_ANALYSIS", "COMPILER_WARNING", "UNKNOWN", "CPPCHECK_ISSUE"):
                return 1
            if cat in ("UNCHECKED_RETURN_VALUE", "RESOURCE_MISMANAGEMENT", "UNSAFE_STRING_OPS", "DIVISION_BY_ZERO"):
                return 3
            return 2

        line_map: Dict[int, List[Dict]] = {}
        no_line: List[Dict] = []
        for vuln in vulnerabilities:
            line = vuln.get("line", 0)
            if line > 0:
                line_map.setdefault(line, []).append(vuln)
            else:
                no_line.append(vuln)

        merged_by_line: List[Dict] = []
        for line, group in line_map.items():
            if len(group) == 1:
                merged_by_line.append(group[0])
                continue

            group.sort(key=_score, reverse=True)
            primary = group[0].copy()
            for secondary in group[1:]:
                if secondary.get("source") and secondary.get("source") != primary.get("source"):
                    primary["source"] = "COMBINED"
                if "supporting_evidence" not in primary:
                    primary["supporting_evidence"] = []

                sec_desc = secondary.get("description") or secondary.get("message") or secondary.get("type") or ""
                if sec_desc and not any(e.get("description") == sec_desc for e in primary["supporting_evidence"]):
                    primary["supporting_evidence"].append({
                        "source": secondary.get("source", "CPPCHECK"),
                        "severity": secondary.get("severity"),
                        "description": sec_desc
                    })
            merged_by_line.append(primary)

        resource_findings = [f for f in merged_by_line if f.get("category") == "RESOURCE_MISMANAGEMENT"]
        unchecked_findings = [f for f in merged_by_line if f.get("category") == "UNCHECKED_RETURN_VALUE"]

        final_findings: List[Dict] = []
        for finding in merged_by_line:
            rule_type = str(finding.get("type", "")).lower()
            desc = str(finding.get("description", "")).lower()

            if ("memleak" in rule_type or "memory leak" in desc) and resource_findings:
                matched_res = None
                m_leak = re.search(r"leak:\s*([a-zA-Z_]\w*)", desc)
                if m_leak:
                    var = m_leak.group(1)
                    for rf in resource_findings:
                        if var in rf.get("code", "") or var in rf.get("description", ""):
                            matched_res = rf
                            break
                if not matched_res and len(resource_findings) == 1:
                    matched_res = resource_findings[0]

                if matched_res and matched_res is not finding:
                    matched_res["source"] = "COMBINED"
                    if "supporting_evidence" not in matched_res:
                        matched_res["supporting_evidence"] = []
                    sec_desc = finding.get("description") or finding.get("message") or finding.get("type") or ""
                    if sec_desc and not any(e.get("description") == sec_desc for e in matched_res["supporting_evidence"]):
                        matched_res["supporting_evidence"].append({
                            "source": finding.get("source", "CPPCHECK"),
                            "severity": finding.get("severity"),
                            "description": sec_desc
                        })
                    continue

            if ("nullpointer" in rule_type or "null pointer" in desc) and unchecked_findings:
                matched_uncheck = None
                m_var = re.search(r"dereference:\s*([a-zA-Z_]\w*)", desc)
                if m_var:
                    var = m_var.group(1)
                    for uf in unchecked_findings:
                        if var in uf.get("code", "") or var in uf.get("description", ""):
                            matched_uncheck = uf
                            break
                if not matched_uncheck:
                    for uf in unchecked_findings:
                        if abs(finding.get("line", 0) - uf.get("line", 0)) < 15:
                            matched_uncheck = uf
                            break

                if matched_uncheck and matched_uncheck is not finding:
                    matched_uncheck["source"] = "COMBINED"
                    if "supporting_evidence" not in matched_uncheck:
                        matched_uncheck["supporting_evidence"] = []
                    sec_desc = finding.get("description") or finding.get("message") or finding.get("type") or ""
                    if sec_desc and not any(e.get("description") == sec_desc for e in matched_uncheck["supporting_evidence"]):
                        matched_uncheck["supporting_evidence"].append({
                            "source": finding.get("source", "CPPCHECK"),
                            "severity": finding.get("severity"),
                            "description": sec_desc
                        })
                    continue

            final_findings.append(finding)

        final_findings.extend(no_line)
        return final_findings

    # =========================================================
    # MAIN SCAN
    # =========================================================

    def scan(self, code: str) -> List[Dict]:
        """
        Scan C/C++ source code for deterministic security findings.
        """

        if not code or not code.strip():
            return []

        vulnerabilities = []

        source_lines = code.splitlines()
        lines = self._mask_non_code(code)

        # -----------------------------------------------------
        # 1. Existing deterministic patterns
        # -----------------------------------------------------

        self._run_pattern_rules(
            lines,
            source_lines,
            vulnerabilities,
        )

        # -----------------------------------------------------
        # 2. Division safety
        # -----------------------------------------------------

        self._check_division_by_zero(
            lines,
            source_lines,
            vulnerabilities,
        )

        # -----------------------------------------------------
        # 3. Context-aware NULL pointer analysis
        # -----------------------------------------------------

        self._check_null_pointer(
            lines,
            source_lines,
            vulnerabilities,
        )

        # -----------------------------------------------------
        # 4. Unsafe C string functions
        # -----------------------------------------------------

        self._check_unsafe_strings(
            lines,
            source_lines,
            vulnerabilities,
        )

        # -----------------------------------------------------
        # 5. Buffer boundary checks
        # -----------------------------------------------------

        self._check_boundary_violations(
            lines,
            source_lines,
            vulnerabilities,
        )

        # -----------------------------------------------------
        # 6. Integer overflow checks (AST-first)
        # -----------------------------------------------------

        self._check_integer_overflow(
            code,
            lines,
            source_lines,
            vulnerabilities,
        )

        # -----------------------------------------------------
        # 7. Unchecked return value checks (AST-first)
        # -----------------------------------------------------

        self._check_unchecked_return_value(
            code,
            lines,
            source_lines,
            vulnerabilities,
        )

        # -----------------------------------------------------
        # 8. Remove duplicates
        # -----------------------------------------------------

        vulnerabilities = self._deduplicate(
            vulnerabilities
        )

        # Sort by source-code line
        vulnerabilities.sort(
            key=lambda x: x["line"]
        )

        return vulnerabilities