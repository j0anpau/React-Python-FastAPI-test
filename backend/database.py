import sqlite3, json, os

DB_PATH = os.path.join(os.path.dirname(__file__), "scenarios.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    
    # Crear tabla si no existe
    conn.execute("""
        CREATE TABLE IF NOT EXISTS grid_scenarios (
            year              INTEGER PRIMARY KEY,
            mix               TEXT NOT NULL,
            transmission_loss REAL DEFAULT 5.0,
            grid_ef           REAL DEFAULT 0.0,
            label             TEXT,
            saved_at          TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # Migraciones — añade columnas nuevas si no existen
    existing_columns = [
        row[1] for row in conn.execute("PRAGMA table_info(grid_scenarios)")
    ]
    
    migrations = {
        "grid_ef": "ALTER TABLE grid_scenarios ADD COLUMN grid_ef REAL DEFAULT 0.0",
    }
    
    for column, sql in migrations.items():
        if column not in existing_columns:
            print(f"[DB] Migrating: adding column '{column}'")
            conn.execute(sql)
    
    conn.commit()
    conn.close()

init_db()
