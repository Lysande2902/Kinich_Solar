-- schema.sql (compatible con SQLite)

CREATE TABLE IF NOT EXISTS clientes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id     INTEGER UNIQUE NOT NULL,
    consentimiento  INTEGER NOT NULL DEFAULT 0,        -- 0/1
    consentimiento_fecha TEXT,
    version_aviso   TEXT,
    creado_en       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recibos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id      INTEGER NOT NULL REFERENCES clientes(id),
    kwh_periodo     REAL NOT NULL,
    tarifa          TEXT NOT NULL,
    periodo_inicio  TEXT,
    periodo_fin     TEXT,
    total_pagar     REAL,
    confirmado      INTEGER NOT NULL DEFAULT 0,        -- el usuario validó los datos
    modelo_lector   TEXT NOT NULL,
    creado_en       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tarifas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    version         TEXT NOT NULL,                     -- p. ej. '2026-11-01'
    contenido_json  TEXT NOT NULL,
    vigente_desde   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS productos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre          TEXT NOT NULL,
    potencia_w      INTEGER NOT NULL,
    precio_wp_mxn   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS cotizaciones (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    recibo_id       INTEGER NOT NULL REFERENCES recibos(id),
    version_tarifas TEXT NOT NULL,
    paneles         INTEGER NOT NULL,
    kwp             REAL NOT NULL,
    produccion_anual_kwh REAL NOT NULL,
    costo_min       REAL NOT NULL,
    costo_max       REAL NOT NULL,
    ahorro_mensual  REAL NOT NULL,
    recuperacion_anios REAL,
    fuente_irradiacion TEXT NOT NULL,                  -- 'PVGIS' o 'RESPALDO'
    alertas         TEXT,                              -- JSON: DAC, desviación, etc.
    contacto_asesor INTEGER NOT NULL DEFAULT 0,
    creado_en       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auditoria (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    evento          TEXT NOT NULL,
    detalles        TEXT,
    creado_en       TEXT NOT NULL DEFAULT (datetime('now'))
);
