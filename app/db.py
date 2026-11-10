import sqlite3
import json
import os
from contextlib import contextmanager
from .config import settings

def get_connection(db_path: str = None) -> sqlite3.Connection:
    path = db_path or settings.DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

@contextmanager
def get_db(db_path: str = None):
    conn = get_connection(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db(db_path: str = None, schema_path: str = "schema.sql"):
    path = db_path or settings.DB_PATH
    with get_db(path) as db:
        if os.path.exists(schema_path):
            with open(schema_path, "r", encoding="utf-8") as f:
                db.executescript(f.read())
        
        # Cargar productos del catálogo si la tabla está vacía
        filas = db.execute("SELECT COUNT(*) as c FROM productos").fetchone()
        if filas["c"] == 0 and os.path.exists("config/catalogo.json"):
            with open("config/catalogo.json", "r", encoding="utf-8") as f:
                productos = json.load(f)
                for p in productos:
                    db.execute(
                        "INSERT INTO productos (id, nombre, potencia_w, precio_wp_mxn) VALUES (?, ?, ?, ?)",
                        (p.get("id"), p["nombre"], p["potencia_w"], p["precio_wp_mxn"])
                    )

        # Cargar tarifas vigentes si la tabla está vacía
        filas_tar = db.execute("SELECT COUNT(*) as c FROM tarifas").fetchone()
        if filas_tar["c"] == 0 and os.path.exists("config/tarifas_cfe.json"):
            with open("config/tarifas_cfe.json", "r", encoding="utf-8") as f:
                tarifas = json.load(f)
                db.execute(
                    "INSERT INTO tarifas (version, contenido_json, vigente_desde) VALUES (?, ?, ?)",
                    (tarifas.get("version", "2026-11-01"), json.dumps(tarifas), tarifas.get("version", "2026-11-01"))
                )

        # Registrar auditoría de inicialización
        db.execute(
            "INSERT INTO auditoria (evento, detalles) VALUES (?, ?)",
            ("INIT_DB", f"Base de datos inicializada en {path}")
        )
