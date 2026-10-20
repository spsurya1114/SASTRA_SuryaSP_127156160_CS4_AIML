from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    tables = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).fetchall()
    print("Tables:", [t[0] for t in tables])
    for (tbl,) in tables:
        cols = conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{tbl}'")).fetchall()
        print(f"\nTable '{tbl}' columns:")
        for c in cols:
            print("  ", c)
