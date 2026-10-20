import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def init_db():
    try:
        conn = psycopg2.connect(user='postgres', password='sanjay2604', host='localhost', port='5432', dbname='postgres')
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname = 'attendai'")
        if not cur.fetchone():
            cur.execute('CREATE DATABASE attendai')
            print('Database attendai created.')
        else:
            print('Database attendai already exists.')
        cur.close()
        conn.close()
        
        # Now connect to attendai and create extension
        conn = psycopg2.connect(user='postgres', password='sanjay2604', host='localhost', port='5432', dbname='attendai')
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        cur.execute('CREATE EXTENSION IF NOT EXISTS vector')
        print('Vector extension created.')
        cur.close()
        conn.close()
    except Exception as e:
        print('Error:', e)

if __name__ == '__main__':
    init_db()
