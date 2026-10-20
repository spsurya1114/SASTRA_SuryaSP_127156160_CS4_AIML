"""
main.py — FastAPI application entry point for AttendAI.
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import engine
import models                           # noqa: F401 — triggers ORM registration
from routers import attendance, auth, students, admin

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AttendAI",
    description=(
        "Classroom Photo Attendance Management System — "
        "InsightFace + PostgreSQL pgvector"
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Startup & DB Migration ───────────────────────────────────────────────────
@app.on_event("startup")
def on_startup() -> None:
    """Create extension, run schema migrations, and create ORM tables."""
    with engine.connect() as conn:
        # Create extension if supported
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
            
            # Register pgvector with the underlying DBAPI connection
            from pgvector.psycopg2 import register_vector
            register_vector(conn.connection)
        except Exception as e:
            conn.rollback()
            logger.warning("Vector extension check or registration failed: %s", e)

    models.Base.metadata.create_all(bind=engine)

    try:
        from migrate_db import migrate
        migrate()
    except Exception as e:
        logger.warning("Automatic DB migration notice: %s", e)

    with engine.connect() as conn:
        try:
            res = conn.execute(text("SELECT COUNT(*) FROM classrooms;")).scalar()
            default_class_id = None
            if res == 0:
                from auth_utils import hash_password
                stmt = text(
                    "INSERT INTO classrooms (name, password_hash) "
                    "VALUES (:name, :pw) RETURNING id;"
                )
                default_class_id = conn.execute(
                    stmt, {"name": "CS-A", "pw": hash_password("cs123")}
                ).scalar()
                conn.commit()
                logger.info("Created default classroom 'CS-A' with password 'cs123' (id=%s)", default_class_id)
            else:
                default_class_id = conn.execute(text("SELECT id FROM classrooms ORDER BY id LIMIT 1;")).scalar()

            if default_class_id:
                try:
                    conn.execute(
                        text("UPDATE students SET classroom_id = :cid WHERE classroom_id IS NULL;"),
                        {"cid": default_class_id},
                    )
                    conn.execute(
                        text("UPDATE attendance_sessions SET classroom_id = :cid WHERE classroom_id IS NULL;"),
                        {"cid": default_class_id},
                    )
                    conn.commit()
                except Exception as ex:
                    conn.rollback()
        except Exception as err:
            conn.rollback()
            logger.warning("Startup data verification warning: %s", err)

    logger.info("Database schema verified and startup migration completed.")

    # Warm up face recognition model on startup so HTTP requests don't time out
    try:
        from face_utils import get_face_app
        get_face_app()
    except Exception as err:
        logger.warning("InsightFace model startup warm-up warning: %s", err)



# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(admin.router)


# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/health", tags=["Meta"])
def health() -> dict:
    return {"status": "ok", "service": "AttendAI Classroom Attendance"}

