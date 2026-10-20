"""
seed.py — One-time seeding script.

Scans DATASET_PATH, groups files by student name using regex
{name}{number}.ext, extracts InsightFace embeddings for each
reference photo, and persists them to PostgreSQL.

Usage:
    cd backend
    python seed.py
"""
from __future__ import annotations

import os
import re
import sys
import logging
from pathlib import Path

# Allow running directly from backend/ without installing as a package
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from database import engine, SessionLocal
from models import Base, Classroom, Student, StudentEmbedding, ClassroomStudent
from auth_utils import hash_password
from face_utils import extract_embeddings_from_path, get_face_app

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
log = logging.getLogger("seed")

# ─── Config ───────────────────────────────────────────────────────────────────
DATASET_PATH: str = os.getenv(
    "DATASET_PATH",
    str(Path(__file__).parent.parent / "dataset"),
)

# Matches "alice3.jpg", "bob10.PNG", "rajesh_kumar2.jpeg", etc.
# Does NOT match "classroom_photo.jpg" (no trailing digits)
STUDENT_PHOTO_RE = re.compile(
    r"^([a-zA-Z][a-zA-Z0-9_]*)(\d+)\.(jpg|jpeg|png|bmp|webp)$",
    re.IGNORECASE,
)


def _ensure_schema() -> None:
    """Create pgvector extension + all tables if they don't exist."""
    from sqlalchemy import text
    with engine.connect() as conn:
        pass
        conn.commit()
    Base.metadata.create_all(bind=engine)
    log.info("Schema verified.")


def _group_by_student(dataset_path: str) -> dict[str, list[str]]:
    """
    Scan dataset_path; return {student_name: [filename, ...]} for
    files matching the {name}{number}.ext pattern.
    """
    groups: dict[str, list[str]] = {}
    for fn in sorted(os.listdir(dataset_path)):
        m = STUDENT_PHOTO_RE.match(fn)
        if not m:
            log.info("Skipping (non-student file): %s", fn)
            continue
        name = m.group(1).lower()
        groups.setdefault(name, []).append(fn)
    return groups


def seed() -> None:
    log.info("Dataset path : %s", DATASET_PATH)

    if not os.path.isdir(DATASET_PATH):
        log.error("Dataset directory not found: %s", DATASET_PATH)
        sys.exit(1)

    _ensure_schema()

    # Warm-up InsightFace (downloads model on first run)
    log.info("Loading InsightFace model (this may take a minute on first run)…")
    get_face_app()

    student_groups = _group_by_student(DATASET_PATH)
    log.info("Found %d student(s): %s", len(student_groups), list(student_groups))

    db = SessionLocal()
    try:
        # Ensure default classroom CS-A exists
        classroom = db.query(Classroom).filter(Classroom.name == "CS-A").first()
        if classroom is None:
            classroom = Classroom(name="CS-A", password_hash=hash_password("cs123"))
            db.add(classroom)
            db.commit()
            db.refresh(classroom)
            log.info("Created default classroom 'CS-A' (id=%d)", classroom.id)

        for student_name, filenames in student_groups.items():
            # ── Get or create student ────────────────────────────────────────
            student = (
                db.query(Student)
                .filter(Student.name == student_name)
                .first()
            )
            if student is None:
                student = Student(name=student_name, classroom_id=classroom.id)
                db.add(student)
                db.commit()
                db.refresh(student)
                log.info("Created student: %s (id=%d)", student_name, student.id)
            else:
                log.info("Student already exists: %s (id=%d)", student_name, student.id)

            # Ensure classroom association exists
            link = (
                db.query(ClassroomStudent)
                .filter(
                    ClassroomStudent.classroom_id == classroom.id,
                    ClassroomStudent.student_id == student.id,
                )
                .first()
            )
            if not link:
                db.add(ClassroomStudent(classroom_id=classroom.id, student_id=student.id))
                db.commit()

            existing_files = {e.reference_photo_filename for e in student.embeddings}

            for filename in filenames:
                if filename in existing_files:
                    log.info("  [skip] already seeded: %s", filename)
                    continue

                filepath = os.path.join(DATASET_PATH, filename)
                log.info("  Processing: %s", filename)

                try:
                    faces = extract_embeddings_from_path(filepath)
                except Exception as exc:
                    log.warning("  Error reading %s: %s", filename, exc)
                    continue

                if not faces:
                    log.warning("  No face detected in %s — skipping", filename)
                    continue

                # Take the most prominent face (highest det_score, already sorted)
                best = faces[0]
                area = (
                    (best["bbox"][2] - best["bbox"][0])
                    * (best["bbox"][3] - best["bbox"][1])
                )
                if len(faces) > 1:
                    log.info(
                        "  %d faces detected in %s — using largest (area=%d)",
                        len(faces), filename, area,
                    )

                db.add(
                    StudentEmbedding(
                        student_id=student.id,
                        embedding=best["embedding"],
                        reference_photo_filename=filename,
                    )
                )
                db.commit()

                # Also save to student_photos directory if not already saved
                photos_dir = Path(__file__).resolve().parent / "student_photos"
                photos_dir.mkdir(exist_ok=True)
                ext = Path(filename).suffix.lower() or ".jpg"
                dest_photo = photos_dir / f"{student.id}{ext}"
                if not dest_photo.exists():
                    try:
                        import shutil
                        shutil.copy2(filepath, dest_photo)
                    except Exception as e:
                        log.warning("  Could not copy photo to student_photos: %s", e)

                log.info("  ✔ Embedding stored for %s", filename)

    finally:
        db.close()

    log.info("\n✅  Seeding complete!")


if __name__ == "__main__":
    seed()
