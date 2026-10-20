"""
routers/admin.py — Admin Portal endpoints for global attendance history and system management.

GET /admin/stats      — system-wide analytics overview
GET /admin/history    — list all attendance sessions across all classrooms
GET /admin/classrooms — list all classrooms with student/session counts and attendance rates
GET /admin/students   — list all global students with enrolled classroom details
"""
from __future__ import annotations

import logging
from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth_utils import get_current_admin
from database import get_db
from models import Admin, AttendanceSession, Classroom, Student, StudentEmbedding, AttendanceRecord
from schemas import (
    AdminDashboardStats,
    SessionListItem,
    GlobalStudentResponse,
    StudentBrief,
    ClassroomResponse,
    AttendanceSessionResponse,
    AttendanceRecordResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminDashboardStats)
def get_admin_stats(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return system-wide statistics for the Admin dashboard."""
    total_classrooms = db.execute(text("SELECT COUNT(*) FROM classrooms")).scalar() or 0
    total_students = db.execute(text("SELECT COUNT(*) FROM students")).scalar() or 0
    total_sessions = db.execute(text("SELECT COUNT(*) FROM attendance_sessions")).scalar() or 0
    total_records = db.execute(text("SELECT COUNT(*) FROM attendance_records")).scalar() or 0

    total_present = db.execute(
        text("SELECT COUNT(*) FROM attendance_records WHERE status = 'present'")
    ).scalar() or 0

    overall_rate = (
        round((total_present / total_records * 100), 1) if total_records > 0 else None
    )

    return AdminDashboardStats(
        total_classrooms=total_classrooms,
        total_students=total_students,
        total_sessions=total_sessions,
        total_records=total_records,
        overall_rate=overall_rate,
    )


@router.get("/history", response_model=List[SessionListItem])
def get_all_sessions(
    classroom_id: Optional[int] = Query(None, description="Filter by classroom ID"),
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    List all attendance sessions across all classrooms with optional filters.
    """
    query = db.query(AttendanceSession).join(Classroom)

    if classroom_id is not None:
        query = query.filter(AttendanceSession.classroom_id == classroom_id)
    if date_from is not None:
        query = query.filter(AttendanceSession.date >= date_from)
    if date_to is not None:
        query = query.filter(AttendanceSession.date <= date_to)

    sessions = query.order_by(AttendanceSession.date.desc(), AttendanceSession.created_at.desc()).all()

    res = []
    for s in sessions:
        total_present = sum(1 for r in s.records if r.status == "present")
        total_absent = sum(1 for r in s.records if r.status == "absent")
        total_st = len(s.records)
        pct = round((total_present / total_st * 100), 1) if total_st > 0 else 0.0

        absent_list = [
            StudentBrief(
                student_id=r.student_id,
                name=r.student.name.title() if r.student else "Unknown",
                roll_number=r.student.roll_number if r.student else None,
            )
            for r in s.records
            if r.status == "absent" and r.student
        ]

        res.append(
            SessionListItem(
                id=s.id,
                classroom_id=s.classroom_id,
                classroom_name=s.classroom.name if s.classroom else "Deleted Classroom",
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


@router.get("/sessions/{session_id}", response_model=AttendanceSessionResponse)
def get_admin_session(
    session_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return full details for a single attendance session for Admin inspection."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Attendance session not found.")

    classroom_name = session.classroom.name if session.classroom else "Deleted Classroom"

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
    total_absent = len(absent_list)
    total_st = len(session.records)
    pct = round((total_present / total_st * 100), 1) if total_st > 0 else 0.0

    return AttendanceSessionResponse(
        id=session.id,
        classroom_id=session.classroom_id,
        classroom_name=classroom_name,
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


@router.get("/classrooms")
def list_admin_classrooms(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Return all registered classrooms with summary metrics.
    """
    classrooms = db.query(Classroom).order_by(Classroom.name.asc()).all()
    res = []
    for c in classrooms:
        st_count = db.execute(
            text(
                "SELECT COUNT(*) FROM classroom_students WHERE classroom_id = :cid"
            ),
            {"cid": c.id},
        ).scalar() or 0

        sess_count = db.execute(
            text(
                "SELECT COUNT(*) FROM attendance_sessions WHERE classroom_id = :cid"
            ),
            {"cid": c.id},
        ).scalar() or 0

        total_recs = db.execute(
            text(
                "SELECT COUNT(ar.id) FROM attendance_records ar "
                "JOIN attendance_sessions s ON s.id = ar.session_id "
                "WHERE s.classroom_id = :cid"
            ),
            {"cid": c.id},
        ).scalar() or 0

        present_recs = db.execute(
            text(
                "SELECT COUNT(ar.id) FROM attendance_records ar "
                "JOIN attendance_sessions s ON s.id = ar.session_id "
                "WHERE s.classroom_id = :cid AND ar.status = 'present'"
            ),
            {"cid": c.id},
        ).scalar() or 0

        rate = round((present_recs / total_recs * 100), 1) if total_recs > 0 else None

        res.append({
            "id": c.id,
            "name": c.name,
            "created_at": c.created_at,
            "student_count": st_count,
            "session_count": sess_count,
            "attendance_rate": rate,
        })
    return res


@router.get("/students", response_model=List[GlobalStudentResponse])
def list_admin_students(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    List all global students across the system and their enrolled classrooms.
    """
    students = db.query(Student).order_by(Student.created_at.desc()).all()
    from routers.students import check_has_photo

    res = []
    for s in students:
        c_names = db.execute(
            text(
                "SELECT c.name FROM classrooms c "
                "JOIN classroom_students cs ON cs.classroom_id = c.id "
                "WHERE cs.student_id = :sid ORDER BY c.name ASC"
            ),
            {"sid": s.id},
        ).fetchall()
        class_names = [row.name for row in c_names]

        hp = check_has_photo(s)
        p_url = f"/api/students/{s.id}/photo" if hp else None

        res.append(
            GlobalStudentResponse(
                id=s.id,
                name=s.name,
                roll_number=s.roll_number,
                created_at=s.created_at,
                embedding_count=len(s.embeddings),
                has_photo=hp,
                photo_url=p_url,
                enrolled_classrooms=class_names,
            )
        )
    return res

