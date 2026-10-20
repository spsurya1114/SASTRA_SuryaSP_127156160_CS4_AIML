"""
routers/attendance.py — Attendance capture, confirmation, history, and stats endpoints.

POST   /attendance/capture   — upload classroom photo → detect + match faces against current classroom
POST   /attendance/confirm   — save confirmed attendance session for current classroom
GET    /attendance/sessions  — list all saved sessions for current classroom
GET    /attendance/stats     — dashboard statistics for current classroom
GET    /attendance/{id}      — single session details
DELETE /attendance/{id}      — delete session record after confirmation
"""
from __future__ import annotations

import logging
import os
from typing import List, Optional

import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth_utils import get_current_classroom
from database import get_db
from face_utils import extract_embeddings, get_image_dimensions
from models import AttendanceRecord, AttendanceSession, Classroom, Student, ClassroomStudent
from schemas import (
    AttendanceCaptureResponse,
    AttendanceConfirmRequest,
    AttendanceRecordResponse,
    AttendanceSessionResponse,
    DashboardStats,
    FaceBox,
    RecognizedFace,
    SessionListItem,
    StudentBrief,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["Attendance"])

_DEFAULT_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.5"))


# ─── Capture ─────────────────────────────────────────────────────────────────

@router.post("/capture", response_model=AttendanceCaptureResponse)
async def capture_attendance(
    file:              UploadFile    = File(..., description="Classroom group photo"),
    threshold:         Optional[float] = Query(
        default=None, ge=0.0, le=1.0,
        description="Override cosine-similarity threshold",
    ),
    current_classroom: Classroom     = Depends(get_current_classroom),
    db:                Session       = Depends(get_db),
):
    """
    Detect all faces in a group photo and match them ONLY against students
    enrolled in the currently logged-in classroom.
    """
    effective_threshold = threshold if threshold is not None else _DEFAULT_THRESHOLD

    raw = await file.read()

    try:
        face_detections = extract_embeddings(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not face_detections:
        raise HTTPException(
            status_code=400,
            detail=(
                "No faces were detected in the uploaded photo. "
                "Please ensure the photo is clear and well-lit."
            ),
        )

    w, h = get_image_dimensions(raw)

    # Fetch stored embeddings ONLY for students in the current classroom
    all_embeddings = db.execute(
        text(
            "SELECT se.student_id, s.name, s.roll_number, se.embedding "
            "FROM student_embeddings se "
            "JOIN students s ON s.id = se.student_id "
            "JOIN classroom_students cs ON cs.student_id = s.id "
            "WHERE cs.classroom_id = :cid"
        ),
        {"cid": current_classroom.id},
    ).fetchall()

    if not all_embeddings:
        return AttendanceCaptureResponse(
            image_width=w,
            image_height=h,
            recognized=[],
            unmatched=[
                FaceBox(bbox=f["bbox"], confidence_level="unmatched")
                for f in face_detections
            ],
            total_faces=len(face_detections),
        )

    recognized:       list[RecognizedFace] = []
    unmatched:        list[FaceBox]        = []
    used_student_ids: set[int]             = set()

    for face in face_detections:
        face_emb = np.array(face["embedding"], dtype=np.float32)
        best_similarity = -1.0
        best_match = None

        for rec in all_embeddings:
            raw_emb = rec.embedding
            if isinstance(raw_emb, str):
                cleaned = raw_emb.strip('[]').split(',')
                parsed_emb = [float(x) for x in cleaned if x.strip()]
            else:
                parsed_emb = raw_emb
            stored_emb = np.array(parsed_emb, dtype=np.float32)
            sim = np.dot(face_emb, stored_emb) / (
                np.linalg.norm(face_emb) * np.linalg.norm(stored_emb)
            )
            if sim > best_similarity:
                best_similarity = float(sim)
                best_match = rec

        if (
            best_match is not None
            and best_similarity > effective_threshold
            and best_match.student_id not in used_student_ids
        ):
            level = "high" if best_similarity >= 0.7 else "low"
            recognized.append(
                RecognizedFace(
                    student_id=best_match.student_id,
                    name=best_match.name.title(),
                    roll_number=best_match.roll_number,
                    confidence=round(best_similarity, 4),
                    confidence_level=level,
                    bbox=face["bbox"],
                )
            )
            used_student_ids.add(best_match.student_id)
        else:
            unmatched.append(FaceBox(bbox=face["bbox"], confidence_level="unmatched"))

    return AttendanceCaptureResponse(
        image_width=w,
        image_height=h,
        recognized=recognized,
        unmatched=unmatched,
        total_faces=len(face_detections),
    )


# ─── Confirm ─────────────────────────────────────────────────────────────────

@router.post("/confirm", status_code=status.HTTP_201_CREATED)
def confirm_attendance(
    request:           AttendanceConfirmRequest,
    current_classroom: Classroom = Depends(get_current_classroom),
    db:                Session   = Depends(get_db),
):
    """
    Save confirmed attendance for the current classroom.
    Automatically includes all enrolled students not marked present as absent.
    """
    # Verify all students in request belong to current classroom
    enrolled_students = (
        db.query(Student)
        .join(ClassroomStudent, ClassroomStudent.student_id == Student.id)
        .filter(ClassroomStudent.classroom_id == current_classroom.id)
        .all()
    )
    enrolled_map = {s.id: s for s in enrolled_students}

    if not enrolled_map:
        raise HTTPException(
            status_code=400,
            detail="No students are enrolled in this classroom.",
        )

    session = AttendanceSession(
        classroom_id=current_classroom.id,
        date=request.date,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Process submitted record statuses
    submitted_ids = set()
    for rec in request.records:
        if rec.student_id in enrolled_map:
            db.add(
                AttendanceRecord(
                    session_id=session.id,
                    student_id=rec.student_id,
                    status=rec.status,
                    confidence_score=rec.confidence_score,
                )
            )
            submitted_ids.add(rec.student_id)

    # Automatically add any enrolled student not included in records as ABSENT
    for student_id in enrolled_map:
        if student_id not in submitted_ids:
            db.add(
                AttendanceRecord(
                    session_id=session.id,
                    student_id=student_id,
                    status="absent",
                    confidence_score=None,
                )
            )

    db.commit()
    return {"message": "Attendance saved successfully.", "session_id": session.id}


# ─── Sessions List ───────────────────────────────────────────────────────────

@router.get("/sessions", response_model=List[SessionListItem])
def list_sessions(
    current_classroom: Classroom = Depends(get_current_classroom),
    db:                Session   = Depends(get_db),
):
    """List all attendance sessions for the current classroom, newest first."""
    sessions = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.classroom_id == current_classroom.id)
        .order_by(AttendanceSession.date.desc(), AttendanceSession.created_at.desc())
        .all()
    )

    res = []
    for s in sessions:
        total_present = sum(1 for r in s.records if r.status == "present")
        total_absent  = sum(1 for r in s.records if r.status == "absent")
        total_st      = len(s.records)
        pct = round((total_present / total_st * 100), 1) if total_st > 0 else 0.0

        absent_list = [
            StudentBrief(
                student_id=r.student_id,
                name=r.student.name.title(),
                roll_number=r.student.roll_number,
            )
            for r in s.records
            if r.status == "absent" and r.student
        ]

        res.append(
            SessionListItem(
                id=s.id,
                classroom_id=s.classroom_id,
                classroom_name=current_classroom.name,
                date=s.date,
                created_at=s.created_at,
                total_present=total_present,
                total_absent=total_absent,
                total_students=total_st,
                attendance_percentage=pct,
                absent_students=absent_list,
            )
        )
    return res


# ─── Dashboard Stats ─────────────────────────────────────────────────────────

@router.get("/stats", response_model=DashboardStats)
def get_stats(
    current_classroom: Classroom = Depends(get_current_classroom),
    db:                Session   = Depends(get_db),
):
    """Aggregate statistics for the currently logged-in classroom."""
    total_students = (
        db.execute(
            text("SELECT COUNT(*) FROM classroom_students WHERE classroom_id = :cid"),
            {"cid": current_classroom.id},
        ).scalar()
        or 0
    )

    total_embeddings = (
        db.execute(
            text(
                "SELECT COUNT(se.id) FROM student_embeddings se "
                "JOIN classroom_students cs ON cs.student_id = se.student_id "
                "WHERE cs.classroom_id = :cid"
            ),
            {"cid": current_classroom.id},
        ).scalar()
        or 0
    )

    total_sessions = (
        db.execute(
            text("SELECT COUNT(*) FROM attendance_sessions WHERE classroom_id = :cid"),
            {"cid": current_classroom.id},
        ).scalar()
        or 0
    )

    last_row = db.execute(
        text(
            "SELECT id, date FROM attendance_sessions "
            "WHERE classroom_id = :cid "
            "ORDER BY date DESC, id DESC LIMIT 1"
        ),
        {"cid": current_classroom.id},
    ).first()

    last_session_rate    = None
    last_session_date    = None
    last_session_present = None
    last_session_absent  = None

    if last_row:
        last_session_date = last_row.date
        present = (
            db.execute(
                text(
                    "SELECT COUNT(*) FROM attendance_records "
                    "WHERE session_id = :sid AND status = 'present'"
                ),
                {"sid": last_row.id},
            ).scalar()
            or 0
        )
        total = (
            db.execute(
                text("SELECT COUNT(*) FROM attendance_records WHERE session_id = :sid"),
                {"sid": last_row.id},
            ).scalar()
            or 0
        )
        last_session_present = present
        last_session_absent  = total - present
        last_session_rate    = round((present / total * 100), 1) if total > 0 else 0.0

    return DashboardStats(
        classroom_id=current_classroom.id,
        classroom_name=current_classroom.name,
        total_students=total_students,
        total_embeddings=total_embeddings,
        total_sessions=total_sessions,
        last_session_rate=last_session_rate,
        last_session_date=last_session_date,
        last_session_present=last_session_present,
        last_session_absent=last_session_absent,
    )


# ─── Session Detail ───────────────────────────────────────────────────────────

@router.get("/{session_id}", response_model=AttendanceSessionResponse)
def get_session(
    session_id:        int,
    current_classroom: Classroom = Depends(get_current_classroom),
    db:                Session   = Depends(get_db),
):
    """Return full details for a single attendance session of the current classroom."""
    session = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.id == session_id,
            AttendanceSession.classroom_id == current_classroom.id,
        )
        .first()
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Attendance session not found.")

    records = [
        AttendanceRecordResponse(
            id=r.id,
            student_id=r.student_id,
            student_name=r.student.name.title() if r.student else "Unknown",
            roll_number=r.student.roll_number if r.student else None,
            status=r.status,
            confidence_score=r.confidence_score,
        )
        for r in session.records
    ]

    present_list = [
        StudentBrief(
            student_id=r.student_id,
            name=r.student.name.title(),
            roll_number=r.student.roll_number,
        )
        for r in session.records
        if r.status == "present" and r.student
    ]

    absent_list = [
        StudentBrief(
            student_id=r.student_id,
            name=r.student.name.title(),
            roll_number=r.student.roll_number,
        )
        for r in session.records
        if r.status == "absent" and r.student
    ]

    total_present = len(present_list)
    total_absent  = len(absent_list)
    total_st      = len(session.records)
    pct           = round((total_present / total_st * 100), 1) if total_st > 0 else 0.0

    return AttendanceSessionResponse(
        id=session.id,
        classroom_id=session.classroom_id,
        classroom_name=current_classroom.name,
        date=session.date,
        created_at=session.created_at,
        records=records,
        present_students=present_list,
        absent_students=absent_list,
        total_present=total_present,
        total_absent=total_absent,
        total_students=total_st,
        attendance_percentage=pct,
    )


# ─── Delete Session ───────────────────────────────────────────────────────────

@router.delete("/{session_id}", status_code=status.HTTP_200_OK)
def delete_session(
    session_id:        int,
    current_classroom: Classroom = Depends(get_current_classroom),
    db:                Session   = Depends(get_db),
):
    """Delete an attendance session after user confirmation."""
    session = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.id == session_id,
            AttendanceSession.classroom_id == current_classroom.id,
        )
        .first()
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Attendance session not found.")

    db.delete(session)
    db.commit()
    return {"message": "Attendance session deleted successfully."}
