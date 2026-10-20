"""
routers/students.py — Student enrollment endpoints with classroom isolation.

POST /students          — enroll a new student into current classroom
GET  /students          — list all enrolled students for current classroom
GET  /students/{id}/photo — serve the student's reference photo
DELETE /students/{id}  — remove a student and all their embeddings
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from auth_utils import get_current_classroom
from database import get_db
from face_utils import extract_embeddings
from models import Classroom, Student, StudentEmbedding, ClassroomStudent
from schemas import StudentResponse, GlobalStudentResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/students", tags=["Students"])

# Directory where reference photos are stored
PHOTOS_DIR = Path(__file__).resolve().parent.parent / "student_photos"
PHOTOS_DIR.mkdir(exist_ok=True)

# Dataset directory fallback for seeded photos
DATASET_DIR = Path(__file__).resolve().parent.parent.parent / "dataset"


import base64
import json
from typing import Any, List, Optional


def get_raw_photo_bytes(photo_data: Any) -> bytes | None:
    """Parse raw binary bytes from bytes, memoryview, Buffer dict, JSON string, or Base64."""
    if not photo_data:
        return None
    if isinstance(photo_data, (bytes, bytearray)):
        return bytes(photo_data)
    if isinstance(photo_data, memoryview):
        return photo_data.tobytes()
    if isinstance(photo_data, dict):
        if "data" in photo_data and isinstance(photo_data["data"], list):
            return bytes(photo_data["data"])
    if isinstance(photo_data, str):
        s = photo_data.strip()
        if s.startswith("{") and "data" in s:
            try:
                parsed = json.loads(s)
                if isinstance(parsed, dict) and "data" in parsed and isinstance(parsed["data"], list):
                    return bytes(parsed["data"])
            except Exception:
                pass
        if s.startswith("data:image"):
            try:
                base64_str = s.split(",", 1)[1]
                return base64.b64decode(base64_str)
            except Exception:
                pass
        try:
            return base64.b64decode(s)
        except Exception:
            pass
        return s.encode("utf-8")
    return None


def detect_media_type(photo_bytes: bytes) -> str:
    """Detect image MIME type from binary magic header bytes."""
    if photo_bytes.startswith(b"\x89PNG"):
        return "image/png"
    if photo_bytes.startswith(b"RIFF") and b"WEBP" in photo_bytes[:16]:
        return "image/webp"
    if photo_bytes.startswith(b"GIF8"):
        return "image/gif"
    return "image/jpeg"


def check_has_photo(student: Student) -> bool:
    """Check if reference photo exists in database, student_photos, or dataset folder."""
    if student.photo_data is not None:
        raw = get_raw_photo_bytes(student.photo_data)
        if raw and len(raw) > 0:
            return True
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        if (PHOTOS_DIR / f"{student.id}{ext}").exists():
            return True
    for emb in student.embeddings:
        if emb.reference_photo_filename and (DATASET_DIR / emb.reference_photo_filename).exists():
            return True
    return False


# ─── Enroll ──────────────────────────────────────────────────────────────────

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    name:              str             = Form(...,  description="Student full name"),
    roll_number:       Optional[str]   = Form(None, description="Roll / ID number"),
    photos:            Optional[List[UploadFile]] = File(None, description="One or more reference photos"),
    current_classroom: Classroom       = Depends(get_current_classroom),
    db:                Session         = Depends(get_db),
):
    """
    Enroll a student into the currently logged-in classroom.
    Strictly isolates students per classroom: a student/roll number cannot be enrolled in multiple classrooms.
    """
    clean_name = name.strip()
    clean_roll = roll_number.strip() if roll_number and roll_number.strip() else None

    if not clean_name:
        raise HTTPException(status_code=400, detail="Student name cannot be empty.")

    # 1. Global check by Roll Number — Roll numbers are strictly unique per student and classroom
    if clean_roll:
        existing_by_roll = (
            db.query(Student)
            .filter(Student.roll_number.ilike(clean_roll))
            .first()
        )
        if existing_by_roll:
            c_names = [c.name for c in existing_by_roll.classrooms]
            cls_str = f"classroom '{c_names[0]}'" if c_names else "another classroom"
            if current_classroom.name in c_names:
                raise HTTPException(
                    status_code=400,
                    detail=f"Roll number '{clean_roll}' ({existing_by_roll.name}) is already enrolled in this classroom.",
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Roll number '{clean_roll}' is already assigned to student '{existing_by_roll.name}' in {cls_str}. Duplicate enrollment across classrooms is not allowed.",
                )

    # 2. Global check by Name — Students cannot be enrolled in multiple classrooms
    existing_by_name = (
        db.query(Student)
        .filter(Student.name.ilike(clean_name))
        .first()
    )
    if existing_by_name:
        c_names = [c.name for c in existing_by_name.classrooms]
        cls_str = f"classroom '{c_names[0]}'" if c_names else "another classroom"
        if current_classroom.name in c_names:
            raise HTTPException(
                status_code=400,
                detail=f"Student '{clean_name}' is already enrolled in this classroom.",
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Student '{clean_name}' is already enrolled in {cls_str}. Duplicate enrollment across classrooms is not allowed.",
            )

    # 3. Reference photos are required for enrolling a new student
    if not photos or len(photos) == 0:
        raise HTTPException(
            status_code=400,
            detail="At least one reference photo is required for enrolling a student.",
        )



    # Process uploaded photos and extract embeddings first
    embeddings_to_add: list[tuple[list[float], str]] = []
    errors: list[str] = []
    first_photo_raw: bytes | None = None
    first_photo_ext: str = ".jpg"

    for photo in photos:
        raw = await photo.read()
        try:
            faces = extract_embeddings(raw)
        except Exception as exc:
            logger.error("Error extracting embedding for photo %s: %s", photo.filename, exc)
            errors.append(f"{photo.filename}: {exc}")
            continue

        if not faces:
            errors.append(f"{photo.filename}: no face detected")
            continue

        best = faces[0]
        embeddings_to_add.append((best["embedding"], photo.filename or "photo.jpg"))

        if first_photo_raw is None:
            first_photo_raw = raw
            first_photo_ext = Path(photo.filename or "photo.jpg").suffix.lower() or ".jpg"

    if not embeddings_to_add:
        detail = "No faces were detected in any uploaded photo."
        if errors:
            detail += " Details: " + " | ".join(errors)
        raise HTTPException(status_code=400, detail=detail)

    # Insert student and embeddings atomically
    student = Student(
        classroom_id=current_classroom.id,
        name=clean_name,
        roll_number=clean_roll,
        photo_data=first_photo_raw,
    )
    db.add(student)
    db.flush()

    for emb_vector, filename in embeddings_to_add:
        db.add(
            StudentEmbedding(
                student_id=student.id,
                embedding=emb_vector,
                reference_photo_filename=filename,
            )
        )

    # Add classroom link
    db.add(ClassroomStudent(classroom_id=current_classroom.id, student_id=student.id))

    # Save photo to disk
    if first_photo_raw is not None:
        photo_path = PHOTOS_DIR / f"{student.id}{first_photo_ext}"
        photo_path.write_bytes(first_photo_raw)

    db.commit()
    db.refresh(student)

    if errors:
        logger.warning("Partial enrollment for %s: %s", clean_name, errors)

    has_photo = (first_photo_raw is not None) or check_has_photo(student)
    photo_url = f"/api/students/{student.id}/photo" if has_photo else None

    return StudentResponse(
        id=student.id,
        classroom_id=current_classroom.id,
        name=student.name,
        roll_number=student.roll_number,
        created_at=student.created_at,
        embedding_count=len(student.embeddings),
        has_photo=has_photo,
        photo_url=photo_url,
    )


# ─── Available Global Students ────────────────────────────────────────────────

@router.get("/available", response_model=List[StudentResponse])
def get_available_students(
    current_classroom: Classroom = Depends(get_current_classroom),
    db:                Session   = Depends(get_db),
):
    """
    Get all existing students in the system who are NOT yet enrolled in the current classroom.
    """
    # Subquery enrolled student IDs
    enrolled_ids = (
        db.query(ClassroomStudent.student_id)
        .filter(ClassroomStudent.classroom_id == current_classroom.id)
        .subquery()
    )

    available = (
        db.query(Student)
        .filter(Student.id.not_in(enrolled_ids))
        .order_by(Student.name.asc())
        .all()
    )

    res = []
    for s in available:
        hp = check_has_photo(s)
        p_url = f"/api/students/{s.id}/photo" if hp else None
        res.append(
            StudentResponse(
                id=s.id,
                classroom_id=current_classroom.id,
                name=s.name,
                roll_number=s.roll_number,
                created_at=s.created_at,
                embedding_count=len(s.embeddings),
                has_photo=hp,
                photo_url=p_url,
            )
        )
    return res


@router.post("/{student_id}/enroll", response_model=StudentResponse)
def enroll_existing_student(
    student_id:        int,
    current_classroom: Classroom = Depends(get_current_classroom),
    db:                Session   = Depends(get_db),
):
    """
    Enroll an existing system student into the current classroom.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    already_enrolled = (
        db.query(ClassroomStudent)
        .filter(
            ClassroomStudent.classroom_id == current_classroom.id,
            ClassroomStudent.student_id == student.id,
        )
        .first()
    )
    if already_enrolled:
        raise HTTPException(status_code=400, detail="Student is already enrolled in this classroom.")

    db.add(ClassroomStudent(classroom_id=current_classroom.id, student_id=student.id))
    db.commit()

    hp = check_has_photo(student)
    p_url = f"/api/students/{student.id}/photo" if hp else None

    return StudentResponse(
        id=student.id,
        classroom_id=current_classroom.id,
        name=student.name,
        roll_number=student.roll_number,
        created_at=student.created_at,
        embedding_count=len(student.embeddings),
        has_photo=hp,
        photo_url=p_url,
    )


# ─── List ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[StudentResponse])
def list_students(
    current_classroom: Classroom = Depends(get_current_classroom),
    db:                Session   = Depends(get_db),
):
    """Return all enrolled students for the currently logged-in classroom."""
    students = (
        db.query(Student)
        .join(ClassroomStudent, ClassroomStudent.student_id == Student.id)
        .filter(ClassroomStudent.classroom_id == current_classroom.id)
        .order_by(ClassroomStudent.enrolled_at.desc())
        .all()
    )
    res = []
    for s in students:
        hp = check_has_photo(s)
        p_url = f"/api/students/{s.id}/photo" if hp else None
        res.append(
            StudentResponse(
                id=s.id,
                classroom_id=current_classroom.id,
                name=s.name,
                roll_number=s.roll_number,
                created_at=s.created_at,
                embedding_count=len(s.embeddings),
                has_photo=hp,
                photo_url=p_url,
            )
        )
    return res


# ─── Photo ────────────────────────────────────────────────────────────────────

@router.get("/{student_id}/photo")
def get_student_photo(
    student_id: int,
    db:         Session = Depends(get_db),
):
    """Serve the reference profile photo for a student by ID."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        path = PHOTOS_DIR / f"{student_id}{ext}"
        if path.exists():
            return FileResponse(
                str(path),
                media_type=f"image/{ext.lstrip('.')}",
                headers={"Cache-Control": "max-age=86400"},
            )

    if student.photo_data is not None:
        raw_bytes = get_raw_photo_bytes(student.photo_data)
        if raw_bytes and len(raw_bytes) > 0:
            media_type = detect_media_type(raw_bytes)
            ext = ".png" if media_type == "image/png" else ".jpg"
            try:
                (PHOTOS_DIR / f"{student_id}{ext}").write_bytes(raw_bytes)
            except Exception:
                pass
            return Response(
                content=raw_bytes,
                media_type=media_type,
                headers={"Cache-Control": "max-age=86400"},
            )

    for emb in student.embeddings:
        if emb.reference_photo_filename:
            path_in_photos = PHOTOS_DIR / emb.reference_photo_filename
            if path_in_photos.exists():
                ext = path_in_photos.suffix.lower() or ".jpg"
                return FileResponse(
                    str(path_in_photos),
                    media_type=f"image/{ext.lstrip('.')}",
                    headers={"Cache-Control": "max-age=86400"},
                )
            dataset_path = DATASET_DIR / emb.reference_photo_filename
            if dataset_path.exists():
                ext = dataset_path.suffix.lower() or ".jpg"
                return FileResponse(
                    str(dataset_path),
                    media_type=f"image/{ext.lstrip('.')}",
                    headers={"Cache-Control": "max-age=86400"},
                )

    raise HTTPException(status_code=404, detail="Photo not found for this student.")


# ─── Delete ───────────────────────────────────────────────────────────────────

@router.delete("/{student_id}", status_code=200)
def delete_student(
    student_id:        int,
    current_classroom: Classroom = Depends(get_current_classroom),
    db:                Session   = Depends(get_db),
):
    """Remove a student from the current classroom. Deletes student globally if not in any classroom."""
    link = (
        db.query(ClassroomStudent)
        .filter(
            ClassroomStudent.classroom_id == current_classroom.id,
            ClassroomStudent.student_id == student_id,
        )
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="Student not found in this classroom.")

    student = db.query(Student).filter(Student.id == student_id).first()
    name = student.name if student else "Student"

    db.delete(link)
    db.commit()

    # Check if student is still enrolled in any other classrooms
    remaining = (
        db.query(ClassroomStudent)
        .filter(ClassroomStudent.student_id == student_id)
        .count()
    )
    if remaining == 0 and student:
        db.delete(student)
        db.commit()
        for ext in (".jpg", ".jpeg", ".png", ".webp"):
            path = PHOTOS_DIR / f"{student_id}{ext}"
            if path.exists():
                path.unlink()
                break

    return {"message": f"Student '{name}' removed from classroom successfully."}

