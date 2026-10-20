import os
from database import engine
from sqlalchemy import text
from auth_utils import hash_password

def migrate():
    with engine.connect() as conn:
        # 1. Add password_hash to classrooms if missing
        conn.execute(text("""
            ALTER TABLE classrooms 
            ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
        """))
        
        # 2. Make classroom_id in students nullable if needed
        conn.execute(text("""
            ALTER TABLE students 
            ALTER COLUMN classroom_id DROP NOT NULL;
        """))

        # 3. Add classroom_id to attendance_sessions if missing
        conn.execute(text("""
            ALTER TABLE attendance_sessions 
            ADD COLUMN IF NOT EXISTS classroom_id INTEGER REFERENCES classrooms(id) ON DELETE CASCADE;
        """))

        # 4. Add photo_data to students if missing
        conn.execute(text("""
            ALTER TABLE students 
            ADD COLUMN IF NOT EXISTS photo_data BYTEA;
        """))

        # 5. Create classroom_students junction table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS classroom_students (
                id SERIAL PRIMARY KEY,
                classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT uq_classroom_student UNIQUE (classroom_id, student_id)
            );
        """))

        # 6. Create admins table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        
        conn.commit()

        # Check if default classroom 'CS-A' exists
        res = conn.execute(text("SELECT COUNT(*) FROM classrooms;")).scalar()
        if res == 0:
            pw_hash = hash_password("cs123")
            stmt = text("INSERT INTO classrooms (name, password_hash) VALUES ('CS-A', :pw) RETURNING id;")
            cid = conn.execute(stmt, {"pw": pw_hash}).scalar()
            conn.commit()
            print(f"Created default classroom 'CS-A' with id={cid}")
        else:
            pw_hash = hash_password("cs123")
            conn.execute(text("UPDATE classrooms SET password_hash = :pw WHERE password_hash IS NULL;"), {"pw": pw_hash})
            conn.commit()
            cid = conn.execute(text("SELECT id FROM classrooms ORDER BY id LIMIT 1;")).scalar()

        # Link orphan students and sessions to default classroom
        if cid:
            conn.execute(text("UPDATE students SET classroom_id = :cid WHERE classroom_id IS NULL;"), {"cid": cid})
            conn.execute(text("UPDATE attendance_sessions SET classroom_id = :cid WHERE classroom_id IS NULL;"), {"cid": cid})
            conn.commit()

        # Populate classroom_students for existing students
        conn.execute(text("""
            INSERT INTO classroom_students (classroom_id, student_id)
            SELECT s.classroom_id, s.id
            FROM students s
            WHERE s.classroom_id IS NOT NULL
            ON CONFLICT (classroom_id, student_id) DO NOTHING;
        """))
        conn.commit()

        # Ensure default Admin account exists
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        admin_exists = conn.execute(
            text("SELECT COUNT(*) FROM admins WHERE username = :u;"),
            {"u": admin_username},
        ).scalar()
        if admin_exists == 0:
            admin_hash = hash_password(admin_password)
            conn.execute(
                text("INSERT INTO admins (username, password_hash) VALUES (:u, :p);"),
                {"u": admin_username, "p": admin_hash},
            )
            conn.commit()
            print(f"Created default admin account '{admin_username}'")

        print("Migration complete!")

if __name__ == "__main__":
    migrate()

