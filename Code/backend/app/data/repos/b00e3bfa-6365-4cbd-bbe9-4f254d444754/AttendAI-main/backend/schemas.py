"""
schemas.py — Pydantic request/response schemas for AttendAI.
"""
from __future__ import annotations
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime


# ─── Classroom Auth ──────────────────────────────────────────────────────────

class ClassroomCreate(BaseModel):
    name:     str
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Classroom name cannot be empty")
        return s

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 4:
            raise ValueError("Password must be at least 4 characters long")
        return v


class ClassroomLogin(BaseModel):
    name:     str
    password: str


class ClassroomResponse(BaseModel):
    id:         int
    name:       str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    classroom:    ClassroomResponse


# ─── Students ────────────────────────────────────────────────────────────────

class StudentResponse(BaseModel):
    id:              int
    classroom_id:    int
    name:            str
    roll_number:     Optional[str] = None
    created_at:      datetime
    embedding_count: int
    has_photo:       bool = False
    photo_url:       Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Attendance Capture ───────────────────────────────────────────────────────

class FaceBox(BaseModel):
    """A detected face that could not be matched."""
    bbox:             List[int]  # [x1, y1, x2, y2] in original image pixels
    confidence_level: str        # "unmatched"


class RecognizedFace(BaseModel):
    """A detected face successfully matched to a student in this classroom."""
    student_id:       int
    name:             str
    roll_number:      Optional[str] = None
    confidence:       float          # cosine similarity 0–1
    confidence_level: str            # "high" (>=0.7) | "low" (0.5–0.7)
    bbox:             List[int]      # [x1, y1, x2, y2]


class AttendanceCaptureResponse(BaseModel):
    image_width:  int
    image_height: int
    recognized:   List[RecognizedFace]
    unmatched:    List[FaceBox]
    total_faces:  int


# ─── Attendance Confirm ───────────────────────────────────────────────────────

class AttendanceRecordInput(BaseModel):
    student_id:       int
    status:           str           # "present" | "absent"
    confidence_score: Optional[float] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ("present", "absent"):
            raise ValueError("status must be 'present' or 'absent'")
        return v


class AttendanceConfirmRequest(BaseModel):
    date:    date
    records: List[AttendanceRecordInput]


# ─── Attendance Responses ─────────────────────────────────────────────────────

class StudentBrief(BaseModel):
    student_id:  int
    name:        str
    roll_number: Optional[str] = None


class AttendanceRecordResponse(BaseModel):
    id:               int
    student_id:       int
    student_name:     str
    roll_number:      Optional[str] = None
    status:           str
    confidence_score: Optional[float] = None

    model_config = {"from_attributes": True}


class SessionListItem(BaseModel):
    id:                    int
    classroom_id:          int
    classroom_name:        str
    date:                  date
    created_at:            datetime
    total_present:         int
    total_absent:          int
    total_students:        int
    attendance_percentage: float
    absent_students:       List[StudentBrief]

    model_config = {"from_attributes": True}


class AttendanceSessionResponse(BaseModel):
    id:                    int
    classroom_id:          int
    classroom_name:        str
    date:                  date
    created_at:            datetime
    records:               List[AttendanceRecordResponse]
    present_students:      List[StudentBrief]
    absent_students:       List[StudentBrief]
    total_present:         int
    total_absent:          int
    total_students:        int
    attendance_percentage: float

    model_config = {"from_attributes": True}


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    classroom_id:         int
    classroom_name:       str
    total_students:       int
    total_embeddings:     int
    total_sessions:       int
    last_session_rate:    Optional[float] = None
    last_session_date:    Optional[date]  = None
    last_session_present: Optional[int]   = None
    last_session_absent:  Optional[int]   = None


# ─── Admin Auth & Portal ──────────────────────────────────────────────────────

class AdminLogin(BaseModel):
    username: str
    password: str


class AdminResponse(BaseModel):
    id:         int
    username:   str
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    admin:        AdminResponse


class GlobalStudentResponse(BaseModel):
    id:                 int
    name:               str
    roll_number:        Optional[str] = None
    created_at:         datetime
    embedding_count:    int
    has_photo:          bool = False
    photo_url:          Optional[str] = None
    enrolled_classrooms: List[str] = []

    model_config = {"from_attributes": True}


class AdminDashboardStats(BaseModel):
    total_classrooms: int
    total_students:   int
    total_sessions:   int
    total_records:    int
    overall_rate:     Optional[float] = None

