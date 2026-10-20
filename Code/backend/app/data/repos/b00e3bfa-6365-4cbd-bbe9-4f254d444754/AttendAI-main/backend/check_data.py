from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("classrooms:", conn.execute(text("SELECT * FROM classrooms")).fetchall())
    print("students:", conn.execute(text("SELECT COUNT(*) FROM students")).scalar())
    print("student_embeddings:", conn.execute(text("SELECT COUNT(*) FROM student_embeddings")).scalar())
    print("attendance_sessions:", conn.execute(text("SELECT COUNT(*) FROM attendance_sessions")).scalar())
