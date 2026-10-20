-- ============================================================
-- AttendAI — PostgreSQL Database Initialization
-- ============================================================

SELECT 'CREATE DATABASE attendai'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'attendai')\gexec

\connect attendai

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Classrooms ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classrooms (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_name ON classrooms(name);

-- ─── Students ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    id           SERIAL PRIMARY KEY,
    classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    roll_number  VARCHAR(50),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_classroom_id ON students(classroom_id);

-- ─── Student Embeddings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_embeddings (
    id                       SERIAL PRIMARY KEY,
    student_id               INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    embedding                vector(512) NOT NULL,
    reference_photo_filename VARCHAR(255),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_student_id ON student_embeddings(student_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw ON student_embeddings USING hnsw (embedding vector_cosine_ops);

-- ─── Attendance Sessions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id           SERIAL PRIMARY KEY,
    classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    date         DATE NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_classroom_id ON attendance_sessions(classroom_id);

-- ─── Attendance Records ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
    id               SERIAL PRIMARY KEY,
    session_id       INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id       INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status           VARCHAR(20) NOT NULL DEFAULT 'present',   -- 'present' | 'absent'
    confidence_score FLOAT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_records_session_id ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_student_id ON attendance_records(student_id);

\echo '✅  AttendAI schema initialized successfully.'
