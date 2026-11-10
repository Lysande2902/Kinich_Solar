# Kinich Solar — Prototipo funcional en 4 semanas (versión costo $0)

> **"Manda tu recibo. Recibe tu proyecto solar."**
> Plan de construcción basado en la Actividad 7 (SolarCopiloto) y la Actividad 8 (Kinich Solar: EDT, exclusiones y criterios de aceptación).

---

## 0. Qué vas a tener al final (definición de "funcional completo")

Un usuario abre un bot de Telegram, acepta el aviso de privacidad, manda la foto de su recibo de CFE y en **menos de 30 segundos** recibe:

- Los datos leídos (kWh, tarifa, periodo, total) para que los **confirme**.
- Número de paneles, kWp, producción anual estimada.
- **Rango** de costo (±10 %), ahorro mensual y años de recuperación.
- Opción de pedir contacto con un asesor humano.

Del lado de la empresa: un **panel de solo lectura** con las cotizaciones de los últimos 30 días, una **bitácora de auditoría** de cada cotización, y **borrado de la imagen** original apenas se extrae el dato.

Esto cubre los 15 paquetes de la EDT de la Actividad 8 y sus 3 criterios de aceptación formales (1.2.1, 1.2.4, 1.4.3).

### Decisiones que tomé por ti (cámbialas si no te cuadran)

| Tema | Decisión | Por qué |
|---|---|---|
| Canal | **Telegram** (no WhatsApp) | La Actividad 8 (Exclusión 2) lo fija así en Fase 1. La Actividad 7 habla de WhatsApp: queda como Fase 2 posterior. |
| Lector de recibos | **Gemini Flash, nivel gratuito de la API** (clave de Google AI Studio, sin tarjeta). Plan B: **PaddleOCR + reglas** en tu computadora | Para que el costo sea $0 se sustituye la API de Claude (de pago) de la Actividad 8. Va detrás de la capa de abstracción, así que cambiar a Claude o Qwen después es una clase nueva, no una reescritura. |
| Servidor | **Tu propia computadora** durante el desarrollo y la demo | El bot funciona en modo *polling*: no necesita IP pública ni dominio. |
| Backend | **Python 3.11 + FastAPI** | pvlib, jsonschema, PyTest y Locust ya son Python. Un solo lenguaje. |
| Base de datos | **SQLite** en el prototipo, esquema compatible con PostgreSQL | Cero administración. Migrar luego es cambiar la cadena de conexión. |
| Bot | **python-telegram-bot v20+** en modo *polling* | Sin dominio ni certificados. Se pasa a webhook después. |
| Dinero | **Motor determinista**, la IA nunca calcula cifras | Es la regla de la Sección III de la Actividad 7. |
| Geometría de techo | **Fuera**: solo consumo del recibo | Evita el riesgo de la patente US9171108B2 (diseño por vivienda, sin parcelas ni regiones). |

### Lo que se recorta frente a tus documentos (sé honesto en la demo)

| Documento | Meta original | En el prototipo de 4 semanas |
|---|---|---|
| Act. 7, Compuerta 1 | ≥ 300 recibos etiquetados | **≥ 40 recibos** (20 para prueba + 20 para ajustar prompt). Los 300 siguen siendo la meta del piloto, no del prototipo. |
| Act. 7 | WhatsApp, LTV:CAC, Premium, microtransacciones | **Fuera.** El prototipo valida la parte técnica; el modelo de negocio se valida en el piloto. |
| Act. 8, 1.1.3 | 5 tablas SQL | Se mantienen las 5. |
| Act. 8, Sección 3 | "10 cotizaciones reales de instaladores" para validar ±10 % | Se intenta con **5–10**; si no las consigues, se documenta como pendiente. |
| Interconexión CFE, ERP, cobro | Fuera (Exclusión 2 y 5) | Fuera. |

---

## 1. Requisitos previos (haz esto en los primeros 2 días)

Son los únicos puntos que pueden retrasarte, porque dependen de terceros:

| # | Qué | Cómo | Dueño |
|---|---|---|---|
| 1 | **Recibos reales de CFE** (mínimo 40; ideal variedad de tarifas, meses y fotos torcidas/con sombra) | Pídelos a la empresa, a familiares, a clientes. Quita nombre y dirección si quieres (el modelo solo necesita las 4 cifras). | Tú |
| 2 | **Clave API gratuita de Gemini** | Google AI Studio → *Get API key*. No pongas facturación: sin tarjeta no se te puede cobrar. | Tú |
| 3 | **Token del bot** | Telegram → @BotFather → `/newbot`. | Tú |
| 4 | **Tarifas CFE vigentes** (subsidiada y DAC para Yucatán) | Sitio de CFE / CNE. Es el Pendiente #2 del Anexo A. **No uses cifras de memoria.** | Tú |
| 5 | **Precio por Wp y 3 modelos de panel** | Pide 3 cotizaciones o el catálogo de la empresa (Pendiente #5). | Empresa |
| 6 | **Dónde correrlo** | Tu computadora (gratis). Opcional: un hosting con nivel gratuito, cuyas condiciones debes verificar porque cambian. | Tú |

> ⚠️ **Dato clave del dominio:** los recibos residenciales de CFE suelen ser **bimestrales** en muchas zonas. El sistema debe convertir siempre a kWh/mes usando las fechas del periodo, no asumir "un mes".

---

## 2. Arquitectura

```
Telegram ──► bot (python-telegram-bot)
                │  imagen en memoria (nunca en disco)
                ▼
          FastAPI  ──► POST /api/v1/leer-recibo ──► lector_recibo.py ──► Gemini Flash (nivel gratuito)
                │                                      (capa abstracta; luego Claude/Qwen)
                ├──► POST /api/v1/cotizar ──► motor_tarifas.py + simulacion_solar.py
                │                              (SIN llamadas a la IA, p95 ≤ 500 ms)
                ├──► GET  /panel  (asesores, solo lectura, Basic Auth)
                └──► SQLite: clientes · recibos · tarifas · cotizaciones · productos
                              + bitácora de auditoría
```

### Estructura del repositorio

```
kinich-solar/
├── app/
│   ├── main.py                 # FastAPI: endpoints + panel
│   ├── config.py               # variables de entorno
│   ├── db.py                   # conexión + creación de esquema
│   ├── lector_recibo.py        # abstracción del lector (Claude / Qwen)
│   ├── motor_tarifas.py        # cálculo de recibo subsidiado y DAC
│   ├── simulacion_solar.py     # dimensionamiento + PVGIS + respaldo
│   ├── cotizador.py            # orquesta motor + simulación → cotización
│   ├── privacidad.py           # consentimiento, auditoría
│   └── schemas.py              # esquemas JSON / Pydantic
├── bot/
│   └── telegram_bot.py
├── config/
│   ├── tarifas_cfe.json        # versionado, con fecha de vigencia
│   └── catalogo.json           # paneles y precio por Wp
├── data/
│   ├── recibos_prueba/         # imágenes (NO se suben al repo)
│   └── etiquetas.csv           # verdad de terreno
├── tests/
│   ├── test_tarifas.py         # 20 casos
│   ├── test_lector.py          # evaluar_lector.py
│   ├── test_cotizar.py
│   ├── test_borrado.py         # 30 ejecuciones
│   └── locustfile.py
├── schema.sql
├── evaluar_lector.py
├── requirements.txt
├── .env.example
└── README.md
```

---

## 3. Cronograma (28 días, con 3 días de colchón)

**Regla del plan:** cada semana termina con algo que se puede *demostrar*, no con "avance".

### Semana 1 — Cimientos y lector de recibos *(EDT 1.1.x + 1.2.1)*

| Día | Trabajo | Entregable verificable |
|---|---|---|
| 1 | Repo, entorno, `requirements.txt`, `.env`. Llaves de API y bot funcionando con un "hola". | Bot responde "hola" |
| 2 | Reunir y etiquetar recibos → `etiquetas.csv` (archivo, kwh, tarifa, periodo_inicio, periodo_fin, total). | ≥ 40 recibos etiquetados |
| 3 | `schema.sql` (5 tablas) + `db.py`. | Script crea la BD sin errores |
| 4 | `lector_recibo.py` (versión 1 del prompt) + esquema JSON. | Lee 1 recibo y devuelve JSON válido |
| 5 | `evaluar_lector.py`: corre 20 recibos y calcula exactitud. | Primer número de exactitud (anótalo, aunque sea malo) |
| 6–7 | **Iterar el prompt** con los 20 recibos de *ajuste* (no los de prueba). Preprocesamiento: rotación, límite 10 MB, solo JPEG/PNG. | **Exactitud ≥ 95 % en kWh y tarifa en los 20 de prueba** |

**Compuerta de semana 1:** si la exactitud está por debajo de 90 % al día 7, no sigas con interfaz: revisa calidad de fotos, prompt y casos de falla. Si sigue mal, activa el plan B (sección 9).

### Semana 2 — Motor de cálculo y API *(EDT 1.1.4 + 1.2.2 + 1.2.3 + 1.2.4)*

| Día | Trabajo | Entregable |
|---|---|---|
| 8 | `tarifas_cfe.json` con valores **vigentes y con fecha** + `catalogo.json`. | Archivo versionado, ≥ 3 paneles |
| 9–10 | `motor_tarifas.py` + `test_tarifas.py` (20 casos, subsidiada y DAC). | 20/20 pruebas en verde |
| 11–12 | `simulacion_solar.py`: PVGIS con caché + respaldo local. | Producción anual coherente para Mérida |
| 13 | `cotizador.py` + `POST /api/v1/cotizar` y `POST /api/v1/leer-recibo`. | Ambos endpoints responden con Swagger (`/docs`) |
| 14 | Prueba de carga con Locust. | **p95 ≤ 500 ms, 0 % de 5xx, 50 usuarios, 60 s** |

### Semana 3 — Bot, privacidad y panel *(EDT 1.3.x + 1.4.x)*

| Día | Trabajo | Entregable |
|---|---|---|
| 15 | Aviso de privacidad + registro de consentimiento (`privacidad.py`). | No se procesa ninguna foto sin aceptación registrada |
| 16–17 | `telegram_bot.py`: flujo foto → confirmación → resultado. | Flujo completo en ≤ 6 mensajes |
| 18 | Plantillas de respuesta (resultado, error de lectura, aviso de estimación). | 3 plantillas |
| 19 | Borrado de imagen + `test_borrado.py`. | **30/30 ejecuciones sin rastro de la imagen a los 60 s** |
| 20 | Bitácora de auditoría (fecha, versión de tarifas, resultado). | Cada cotización deja registro |
| 21 | Panel `/panel` para asesores (últimos 30 días, solo lectura, con clave). | Vista funcionando |

### Semana 4 — Integración, pruebas reales y entrega

| Día | Trabajo | Entregable |
|---|---|---|
| 22 | Despliegue en el servidor, variables de entorno, reinicio automático (systemd o el panel del proveedor). | Bot responde 24/7 |
| 23–24 | **Prueba con 5–10 personas reales** mandando su propio recibo. Registra fallas. | Lista de fallas priorizada |
| 25 | Corregir solo lo que bloquee el flujo principal. Validar dimensionamiento contra cotizaciones reales (si las tienes). | Informe de exactitud |
| 26 | README, guía de operación, evidencia de pruebas (capturas de PyTest y Locust). | Documentación |
| 27 | Ensayo de demo. | Guion de demo |
| 28 | **Entrega / demo.** | Prototipo funcional |

Los días 25–28 son tu colchón: si algo se atrasó, aquí se absorbe.

---

## 4. Base de datos (EDT 1.1.3)

```sql
-- schema.sql  (compatible con SQLite y PostgreSQL con cambios mínimos)

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
    -- OJO: nunca se guarda la imagen
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
```

---

## 5. Lector de recibos (EDT 1.2.1)

### Contrato JSON (los 4 campos)

```python
# app/schemas.py
ESQUEMA_RECIBO = {
    "type": "object",
    "required": ["kwh_periodo", "tarifa", "periodo_inicio", "periodo_fin", "total_pagar", "legible"],
    "properties": {
        "kwh_periodo":    {"type": ["number", "null"], "minimum": 0},
        "tarifa":         {"type": ["string", "null"]},     # '1', '1A'...'1F', 'DAC', etc.
        "periodo_inicio": {"type": ["string", "null"]},     # YYYY-MM-DD
        "periodo_fin":    {"type": ["string", "null"]},     # YYYY-MM-DD
        "total_pagar":    {"type": ["number", "null"], "minimum": 0},
        "legible":        {"type": "boolean"},
    },
    "additionalProperties": False,
}
```

### Abstracción + implementación con Gemini (nivel gratuito)

```python
# app/lector_recibo.py
import json
from abc import ABC, abstractmethod
from google import genai
from google.genai import types
from jsonschema import validate
from .config import settings
from .schemas import ESQUEMA_RECIBO

PROMPT_SISTEMA = """Eres un extractor de datos de recibos de luz de CFE (México).
Recibirás la foto de UN recibo. Devuelve ÚNICAMENTE un objeto JSON con estas claves:
- kwh_periodo: consumo total en kWh del periodo facturado (número)
- tarifa: tarifa de suministro impresa en el recibo (por ejemplo "1F" o "DAC")
- periodo_inicio y periodo_fin: fechas del periodo facturado, formato YYYY-MM-DD
- total_pagar: total a pagar en pesos (número, sin símbolo ni comas)
- legible: true si pudiste leer los 4 campos con seguridad; false si no

Reglas:
- Si un campo no se ve con claridad, pon null en ese campo y legible=false. NUNCA adivines ni inventes cifras.
- No confundas el consumo del periodo con lecturas acumuladas del medidor ni con el historial de consumos.
- Si la imagen no es un recibo de CFE, devuelve todos los campos en null y legible=false."""

class LectorRecibo(ABC):
    nombre: str
    @abstractmethod
    def leer(self, imagen: bytes, media_type: str) -> dict: ...

class LectorGemini(LectorRecibo):
    def __init__(self):
        self.nombre = settings.GEMINI_MODEL
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def leer(self, imagen: bytes, media_type: str) -> dict:
        resp = self.client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[types.Part.from_bytes(data=imagen, mime_type=media_type),
                      "Extrae los datos de este recibo."],
            config=types.GenerateContentConfig(
                system_instruction=PROMPT_SISTEMA,
                response_mime_type="application/json",   # fuerza salida JSON
                temperature=0,
                max_output_tokens=400),
        )
        datos = json.loads(resp.text)
        validate(datos, ESQUEMA_RECIBO)     # 100 % de respuestas deben cumplir el esquema
        return datos

# Plan B 100 % local y privado: class LectorPaddle(LectorRecibo)  → PaddleOCR + expresiones regulares
# Migración futura de pago:      class LectorClaude(LectorRecibo)  → misma interfaz, mismo esquema
def obtener_lector() -> LectorRecibo:
    return LectorGemini()
```

> **El nivel gratuito tiene límites de peticiones por minuto y por día, y Google los ha recortado antes** (hubo ajustes en diciembre de 2025, y las fuentes que revisé no coinciden en las cifras exactas, con rangos de ~10–15 por minuto y ~250–1,500 por día para los modelos Flash). Mira tus límites reales en Google AI Studio y deja el nombre del modelo en `.env`: Google retira modelos con el tiempo (por ejemplo, Gemini 2.0 Flash se dio de baja en junio de 2026).
>
> **Privacidad:** en los niveles gratuitos de este tipo de APIs lo habitual es que el proveedor pueda usar lo que envías para mejorar sus productos. Verifícalo en los términos de Google. Consecuencia práctica: durante el prototipo usa **recibos de prueba, sin nombre ni dirección**, y ajusta el aviso de privacidad del bot para que diga la verdad. Para usuarios reales, esa es la razón para pasar a un nivel de pago o al Plan B local.

### Plan B local, $0 y sin enviar nada a terceros: PaddleOCR + reglas

Si la exactitud de Gemini no llega a 95 % o prefieres que la imagen nunca salga de tu computadora: PaddleOCR (Apache 2.0, corre en CPU) devuelve el texto del recibo y unas expresiones regulares extraen los 4 campos. Es más trabajo de ajuste, porque solo devuelve texto y los recibos de CFE varían de formato, pero es gratis y privado. Implementa `LectorPaddle` con la misma interfaz y el mismo esquema JSON; nada más del sistema cambia.

### Preprocesamiento (EDT 1.1.2)

```python
# app/main.py (fragmento)
from PIL import Image, ImageOps
import io

MAX_BYTES = 10 * 1024 * 1024
FORMATOS = {"JPEG": "image/jpeg", "PNG": "image/png"}

def preparar_imagen(raw: bytes) -> tuple[bytes, str]:
    if len(raw) > MAX_BYTES:
        raise ValueError("La imagen pesa más de 10 MB.")
    img = Image.open(io.BytesIO(raw))
    if img.format not in FORMATOS:
        raise ValueError("Formato no soportado. Envía JPEG o PNG.")
    img = ImageOps.exif_transpose(img)           # corrige rotación
    img.thumbnail((2000, 2000))                  # reduce costo de tokens
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=90)
    return buf.getvalue(), "image/jpeg"
```

### Script de evaluación (criterio 1.2.1)

```python
# evaluar_lector.py
import csv, sys, time
from app.lector_recibo import obtener_lector
from app.main import preparar_imagen

def main(csv_path="data/etiquetas.csv", carpeta="data/recibos_prueba"):
    lector, ok_kwh, ok_tar, n, errores = obtener_lector(), 0, 0, 0, []
    for fila in csv.DictReader(open(csv_path, encoding="utf-8")):
        n += 1
        time.sleep(7)          # respeta el límite por minuto del nivel gratuito
        img, mt = preparar_imagen(open(f"{carpeta}/{fila['archivo']}", "rb").read())
        try:
            r = lector.leer(img, mt)
        except Exception as e:
            errores.append((fila["archivo"], str(e))); continue
        if r["kwh_periodo"] is not None and abs(r["kwh_periodo"] - float(fila["kwh"])) <= 1:
            ok_kwh += 1
        else:
            errores.append((fila["archivo"], f"kWh leído={r['kwh_periodo']} real={fila['kwh']}"))
        if r["tarifa"] and r["tarifa"].upper() == fila["tarifa"].upper():
            ok_tar += 1
    print(f"kWh ±1: {ok_kwh}/{n} | Tarifa: {ok_tar}/{n}")
    for e in errores: print("  ✗", e)
    # Criterio de aceptación: ≥ 95 % en ambos
    sys.exit(0 if ok_kwh / n >= .95 and ok_tar / n >= .95 else 1)

if __name__ == "__main__":
    main()
```

> **Importante:** separa los recibos en **ajuste** (para iterar el prompt) y **prueba** (solo para medir). Si ajustas el prompt viendo los de prueba, tu 95 % deja de ser una medición honesta.

---

## 6. Motor de tarifas y simulación solar (EDT 1.2.2 y 1.2.3)

### `config/tarifas_cfe.json`

> ⚠️ **Los números de abajo son ILUSTRATIVOS** para que el código corra. Reemplázalos con las tarifas vigentes de CFE para tu región y tu tarifa (Pendiente #2 del Anexo A) antes de enseñar cualquier resultado. Guarda la fecha de vigencia: es lo que se escribe en la bitácora.

```json
{
  "version": "AAAA-MM-DD  <-- pon la fecha de vigencia real",
  "iva": 0.16,
  "tarifas": {
    "1F": {
      "bloques": [
        {"hasta_kwh_mes": 150, "precio": 0.80},
        {"hasta_kwh_mes": 300, "precio": 0.95},
        {"hasta_kwh_mes": null, "precio": 2.80}
      ],
      "dac_limite_kwh_mes": 300
    },
    "DAC": {
      "cargo_fijo_mes": 100.0,
      "precio_kwh": 4.50
    }
  },
  "cargo_minimo_mes": 40.0
}
```

> Verifica en CFE los **límites DAC por tarifa y región** y la regla de **promedio de 12 meses**: un usuario cerca del límite es un caso que debe generar una alerta. Cambia las tarifas del JSON, no el código.

### `app/motor_tarifas.py`

```python
import json
from datetime import date

def cargar_tarifas(ruta="config/tarifas_cfe.json") -> dict:
    return json.load(open(ruta, encoding="utf-8"))

def kwh_por_mes(kwh_periodo: float, inicio: str | None, fin: str | None) -> float:
    """Convierte el consumo del recibo a kWh/mes usando los días reales del periodo."""
    if not inicio or not fin:
        return kwh_periodo / 2          # supuesto: bimestral. Se marca como alerta.
    dias = (date.fromisoformat(fin) - date.fromisoformat(inicio)).days
    if dias <= 0:
        raise ValueError("Periodo inválido")
    return kwh_periodo * 30.4 / dias

def costo_mensual(kwh_mes: float, tarifa: str, cfg: dict) -> float:
    """Costo mensual con IVA para una tarifa subsidiada o DAC."""
    t = cfg["tarifas"][tarifa]
    if tarifa == "DAC":
        base = t["cargo_fijo_mes"] + kwh_mes * t["precio_kwh"]
    else:
        base, restante, previo = 0.0, kwh_mes, 0.0
        for b in t["bloques"]:
            tope = b["hasta_kwh_mes"]
            tramo = restante if tope is None else min(restante, tope - previo)
            base += max(tramo, 0) * b["precio"]
            restante -= max(tramo, 0)
            if tope is None or restante <= 0:
                break
            previo = tope
        base = max(base, cfg["cargo_minimo_mes"])
    return round(base * (1 + cfg["iva"]), 2)

def hay_riesgo_dac(kwh_mes: float, tarifa: str, cfg: dict) -> bool:
    lim = cfg["tarifas"].get(tarifa, {}).get("dac_limite_kwh_mes")
    return bool(lim and kwh_mes >= 0.9 * lim)
```

### `app/simulacion_solar.py`

```python
import math, json, os
import pvlib

LAT, LON = 20.97, -89.62          # Mérida, Yucatán (ajusta si amplías cobertura)
RESPALDO_KWH_KWP_ANIO = 1600      # ⚠️ placeholder conservador: validar contra PVGIS y con sistemas reales de la empresa
CACHE = "data/pvgis_cache.json"

def rendimiento_kwh_kwp_anio() -> tuple[float, str]:
    """kWh que produce 1 kWp al año. Intenta PVGIS; si falla, usa el respaldo."""
    if os.path.exists(CACHE):
        return json.load(open(CACHE))["kwh_kwp"], "PVGIS (caché)"
    try:
        data, *_ = pvlib.iotools.get_pvgis_hourly(
            LAT, LON, start=2020, end=2020,
            surface_tilt=20, surface_azimuth=180,   # azimut 180 = sur en PVGIS (pvlib)
            pvcalculation=True, peakpower=1, loss=14,
        )
        kwh = float(data["P"].sum()) / 1000.0        # W horarios → kWh
        json.dump({"kwh_kwp": kwh}, open(CACHE, "w"))
        return kwh, "PVGIS"
    except Exception:
        return RESPALDO_KWH_KWP_ANIO, "RESPALDO"

def dimensionar(kwh_mes: float, panel_w: int, precio_wp: float,
                cobertura: float = 1.0, incertidumbre: float = 0.10) -> dict:
    rend, fuente = rendimiento_kwh_kwp_anio()
    consumo_anual = kwh_mes * 12
    kwp_necesario = (consumo_anual * cobertura) / rend
    paneles = max(1, math.ceil(kwp_necesario * 1000 / panel_w))
    kwp = paneles * panel_w / 1000
    costo = kwp * 1000 * precio_wp
    return {
        "paneles": paneles,
        "kwp": round(kwp, 2),
        "produccion_anual_kwh": round(kwp * rend),
        "produccion_mensual_kwh": round(kwp * rend / 12),
        "costo_min": round(costo * (1 - incertidumbre)),
        "costo_max": round(costo * (1 + incertidumbre)),
        "fuente_irradiacion": fuente,
    }
```

> `get_pvgis_hourly` cambió su firma entre versiones de pvlib: fija la versión en `requirements.txt` y revisa que `data["P"]` exista. Si PVGIS no responde, el sistema usa el respaldo y **lo avisa** en el campo `fuente_irradiacion`; no falla.

### `app/cotizador.py`

```python
from .motor_tarifas import cargar_tarifas, kwh_por_mes, costo_mensual, hay_riesgo_dac
from .simulacion_solar import dimensionar

def cotizar(kwh_periodo, tarifa, inicio, fin, total_pagar, producto: dict) -> dict:
    cfg = cargar_tarifas()
    alertas = []
    kwh_mes = kwh_por_mes(kwh_periodo, inicio, fin)
    if not inicio or not fin:
        alertas.append("Periodo no legible: se asumió bimestre.")
    if tarifa not in cfg["tarifas"]:
        raise ValueError(f"Tarifa no soportada: {tarifa}")
    if hay_riesgo_dac(kwh_mes, tarifa, cfg):
        alertas.append("Tu consumo está cerca del límite DAC.")

    # Control de calidad: ¿mi motor reproduce lo que cobró CFE?
    costo_actual = costo_mensual(kwh_mes, tarifa, cfg)
    if total_pagar:
        pago_mes = total_pagar * 30.4 / max(1, (__import__("datetime").date.fromisoformat(fin)
                                                  - __import__("datetime").date.fromisoformat(inicio)).days) if inicio and fin else total_pagar / 2
        if abs(costo_actual - pago_mes) / pago_mes > 0.15:
            alertas.append("Mi cálculo difiere >15 % de tu recibo; el ahorro es aproximado.")

    sol = dimensionar(kwh_mes, producto["potencia_w"], producto["precio_wp_mxn"])
    neto = max(0.0, kwh_mes - sol["produccion_mensual_kwh"])
    ahorro = round(costo_actual - costo_mensual(neto, tarifa, cfg), 2)
    recup = round(((sol["costo_min"] + sol["costo_max"]) / 2) / (ahorro * 12), 1) if ahorro > 0 else None

    return {**sol, "ahorro_mensual": ahorro, "recuperacion_anios": recup,
            "version_tarifas": cfg["version"], "alertas": alertas,
            "kwh_mes": round(kwh_mes, 1)}
```

> Simplificación declarada: el ahorro supone **compensación mensual** del consumo contra la producción y no modela excedentes ni reglas de generación distribuida. Eso va en el aviso de "estimación preliminar" (EDT 1.3.2) y se revisa en el Pendiente #2.

---

## 7. API (EDT 1.2.1, 1.2.4, 1.4.x)

```python
# app/main.py (núcleo)
import secrets, json
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from .config import settings
from .db import get_db, init_db
from .lector_recibo import obtener_lector
from .cotizador import cotizar

app = FastAPI(title="Kinich Solar API")
seguridad = HTTPBasic()
lector = obtener_lector()

@app.on_event("startup")
def _inicio(): init_db()

@app.post("/api/v1/leer-recibo")
async def leer_recibo(archivo: UploadFile = File(...)):
    raw = await archivo.read()
    try:
        img, mt = preparar_imagen(raw)
        datos = lector.leer(img, mt)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception:
        raise HTTPException(422, "No pude leer el recibo. Intenta con otra foto.")
    finally:
        del raw                      # la imagen vive solo en memoria y se descarta aquí
    return datos

class SolicitudCotizar(BaseModel):
    kwh_periodo: float
    tarifa: str
    periodo_inicio: str | None = None
    periodo_fin: str | None = None
    total_pagar: float | None = None
    telegram_id: int

@app.post("/api/v1/cotizar")
def endpoint_cotizar(s: SolicitudCotizar):
    with get_db() as db:
        producto = dict(db.execute("SELECT * FROM productos ORDER BY id LIMIT 1").fetchone())
        try:
            c = cotizar(s.kwh_periodo, s.tarifa, s.periodo_inicio, s.periodo_fin, s.total_pagar, producto)
        except ValueError as e:
            raise HTTPException(422, str(e))
        # aquí: insertar recibo + cotización + línea de auditoría
        return c

def _admin(c: HTTPBasicCredentials = Depends(seguridad)):
    ok = secrets.compare_digest(c.username, settings.PANEL_USER) and \
         secrets.compare_digest(c.password, settings.PANEL_PASS)
    if not ok:
        raise HTTPException(401, headers={"WWW-Authenticate": "Basic"})

@app.get("/panel", response_class=HTMLResponse)
def panel(_=Depends(_admin)):
    with get_db() as db:
        filas = db.execute("""SELECT c.creado_en, r.kwh_periodo, r.tarifa, c.paneles, c.kwp,
                                     c.costo_min, c.costo_max, c.ahorro_mensual, c.contacto_asesor
                              FROM cotizaciones c JOIN recibos r ON r.id=c.recibo_id
                              WHERE c.creado_en >= datetime('now','-30 days')
                              ORDER BY c.creado_en DESC""").fetchall()
    tr = "".join(f"<tr>{''.join(f'<td>{v}</td>' for v in f)}</tr>" for f in filas)
    return f"<h2>Cotizaciones (últimos 30 días)</h2><table border=1 cellpadding=6>" \
           f"<tr><th>Fecha</th><th>kWh</th><th>Tarifa</th><th>Paneles</th><th>kWp</th>" \
           f"<th>Costo mín</th><th>Costo máx</th><th>Ahorro/mes</th><th>Asesor</th></tr>{tr}</table>"
```

> Aquí `preparar_imagen` es la función de la sección 5. Si tu `panel` queda con datos personales, protégelo con HTTPS; en el prototipo solo muestra datos de consumo, nunca nombre ni foto.

---

## 8. Bot de Telegram (EDT 1.3.1 y 1.3.2)

**Flujo en ≤ 6 mensajes del bot:**

1. Saludo + aviso de privacidad (botón **Acepto**).
2. "Mándame la foto de tu recibo."
3. "Leyendo tu recibo…" (aviso de espera; la respuesta total debe llegar en < 30 s).
4. Datos leídos + botones **✅ Correcto / ✏️ Corregir**.
5. Resultado de la cotización con rango y supuestos.
6. "¿Quieres que un asesor te contacte?" (botón).

```python
# bot/telegram_bot.py
import io, httpx
from telegram import Update, InlineKeyboardButton as B, InlineKeyboardMarkup as M
from telegram.ext import (ApplicationBuilder, CommandHandler, MessageHandler,
                          CallbackQueryHandler, ContextTypes, filters)
from app.config import settings

API = settings.API_URL
AVISO = ("Hola, soy Kinich Solar ☀️\n\nPara cotizar necesito la foto de tu recibo de CFE. "
         "La imagen se envía a un proveedor de IA para leer 4 datos (consumo, tarifa, periodo y total) "
         "y se elimina de inmediato; solo guardo esos datos.\n\n¿Aceptas?")

async def start(u: Update, c: ContextTypes.DEFAULT_TYPE):
    await u.message.reply_text(AVISO, reply_markup=M([[B("Acepto", callback_data="acepto")]]))

async def botones(u: Update, c: ContextTypes.DEFAULT_TYPE):
    q = u.callback_query; await q.answer()
    if q.data == "acepto":
        c.user_data["consent"] = True       # además: registrar en BD con fecha y versión del aviso
        await q.message.reply_text("Perfecto. Mándame la foto de tu recibo (JPEG o PNG).")
    elif q.data == "ok":
        d = c.user_data["datos"]
        async with httpx.AsyncClient(timeout=30) as h:
            r = await h.post(f"{API}/api/v1/cotizar", json={**d, "telegram_id": q.from_user.id})
        if r.status_code != 200:
            await q.message.reply_text("No pude calcular tu cotización. Un asesor te ayudará."); return
        x = r.json()
        await q.message.reply_text(
            f"☀️ *Tu proyecto solar (estimación preliminar)*\n"
            f"• Paneles: {x['paneles']}  ({x['kwp']} kWp)\n"
            f"• Producción: ~{x['produccion_anual_kwh']:,} kWh/año\n"
            f"• Costo: ${x['costo_min']:,} – ${x['costo_max']:,} MXN\n"
            f"• Ahorro: ~${x['ahorro_mensual']:,.0f} al mes\n"
            f"• Recuperación: ~{x['recuperacion_anios']} años\n\n"
            + "\n".join(f"⚠️ {a}" for a in x["alertas"]),
            parse_mode="Markdown")
        await q.message.reply_text("¿Quieres que un asesor te contacte?",
                                   reply_markup=M([[B("Sí, contáctenme", callback_data="asesor")]]))
    elif q.data == "no":
        await q.message.reply_text("Sin problema. Mándame una foto más clara o dime los kWh con /kwh 520.")
    elif q.data == "asesor":
        await q.message.reply_text("¡Listo! Un asesor te contactará pronto.")

async def foto(u: Update, c: ContextTypes.DEFAULT_TYPE):
    if not c.user_data.get("consent"):
        await u.message.reply_text("Primero necesito tu aceptación. Escribe /start."); return
    await u.message.reply_text("Leyendo tu recibo… ⏳")
    archivo = await u.message.photo[-1].get_file()
    buf = io.BytesIO(); await archivo.download_to_memory(buf)      # solo en memoria
    async with httpx.AsyncClient(timeout=60) as h:
        r = await h.post(f"{API}/api/v1/leer-recibo",
                         files={"archivo": ("recibo.jpg", buf.getvalue(), "image/jpeg")})
    buf.close()
    if r.status_code != 200 or not r.json().get("legible"):
        await u.message.reply_text("No logré leerlo bien. Prueba con más luz, sin sombras y el recibo completo."); return
    d = r.json(); c.user_data["datos"] = {k: d[k] for k in
        ("kwh_periodo", "tarifa", "periodo_inicio", "periodo_fin", "total_pagar")}
    await u.message.reply_text(
        f"Leí esto:\n• Consumo: {d['kwh_periodo']} kWh\n• Tarifa: {d['tarifa']}\n"
        f"• Periodo: {d['periodo_inicio']} a {d['periodo_fin']}\n• Total: ${d['total_pagar']}\n\n¿Es correcto?",
        reply_markup=M([[B("✅ Correcto", callback_data="ok"), B("✏️ No", callback_data="no")]]))

def main():
    app = ApplicationBuilder().token(settings.TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(botones))
    app.add_handler(MessageHandler(filters.PHOTO, foto))
    app.run_polling()

if __name__ == "__main__":
    main()
```

> Los recibos enviados como **archivo** (no como foto) llegan con otro handler (`filters.Document.IMAGE`). Agrégalo; la Exclusión 1 rechaza PDF, HEIC, WEBP y TIFF con un mensaje claro.

---

## 9. Pruebas y criterios de aceptación (Actividad 8, Sección 3)

| EDT | Criterio | Herramienta | Comando |
|---|---|---|---|
| 1.2.1 | kWh ±1 y tarifa idéntica en ≥ 19/20 recibos; 100 % de respuestas cumplen el esquema JSON | PyTest + `evaluar_lector.py` + `jsonschema` | `python evaluar_lector.py` |
| 1.2.4 | p95 ≤ 500 ms, 0 % 5xx, 50 usuarios simultáneos, 60 s (sin IA) | Locust | `locust -f tests/locustfile.py --headless -u 50 -r 50 -t 60s -H http://localhost:8000` |
| 1.4.3 | Imagen inexistente a los 60 s en 30/30 ejecuciones | PyTest de integración | `pytest tests/test_borrado.py` |
| 1.2.2 | 20 casos del motor de tarifas | PyTest | `pytest tests/test_tarifas.py` |

```python
# tests/locustfile.py
from locust import HttpUser, task, constant

class Usuario(HttpUser):
    wait_time = constant(0.5)
    @task
    def cotizar(self):
        self.client.post("/api/v1/cotizar", json={
            "kwh_periodo": 620, "tarifa": "1F",
            "periodo_inicio": "2026-09-01", "periodo_fin": "2026-10-30",
            "total_pagar": 1800, "telegram_id": 1})
```

```python
# tests/test_borrado.py  — la imagen jamás toca disco ni BD
import os, glob, time, sqlite3
from fastapi.testclient import TestClient
from app.main import app

def test_imagen_no_queda_en_ningun_lado(monkeypatch):
    class Falso:                      # evita gastar API en la prueba
        nombre = "falso"
        def leer(self, *_): return {"kwh_periodo": 500, "tarifa": "1F", "periodo_inicio": None,
                                    "periodo_fin": None, "total_pagar": 900, "legible": True}
    monkeypatch.setattr("app.main.lector", Falso())
    c = TestClient(app)
    img = open("tests/recibo_ejemplo.jpg", "rb").read()
    for _ in range(30):
        antes = set(glob.glob("/tmp/**", recursive=True))
        assert c.post("/api/v1/leer-recibo", files={"archivo": ("r.jpg", img, "image/jpeg")}).status_code == 200
        time.sleep(0.1)
        assert not [f for f in set(glob.glob("/tmp/**", recursive=True)) - antes if f.endswith((".jpg", ".png"))]
        assert b"\xff\xd8\xff" not in open(os.environ.get("DB_PATH", "kinich.db"), "rb").read()  # firma JPEG
```

### Plan B si la exactitud no llega a 95 %

En orden de costo:

1. **Mejorar fotos**: instrucciones al usuario (recibo completo, sin sombra, de frente).
2. **Ajustar el prompt** con ejemplos de los casos que fallan.
3. **Confirmación obligada**: ya existe (paso 4 del bot); un error de lectura no se vuelve cotización errónea porque el usuario lo corrige.
4. **Pedir los kWh por texto** como camino alterno (`/kwh 520`).
5. Subir a un modelo más grande o probar Qwen2.5-VL-7B (solo si hay GPU disponible).

---

## 10. Variables de entorno

```bash
# .env.example
GEMINI_API_KEY=pon-aqui-tu-clave-de-ai-studio
GEMINI_MODEL=gemini-2.5-flash   # confirma el modelo gratuito vigente en AI Studio
TELEGRAM_TOKEN=123456:ABC...
API_URL=http://localhost:8000
PANEL_USER=asesor
PANEL_PASS=cambia-esto
DB_PATH=kinich.db
```

```text
# requirements.txt  (fija versiones reales al instalar con `pip freeze`)
fastapi
uvicorn[standard]
python-telegram-bot>=20
google-genai
httpx
pydantic
pydantic-settings
jsonschema
pvlib
pillow
python-multipart
pytest
locust
```

**Arranque local:**

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # y llena tus llaves
uvicorn app.main:app --reload   # terminal 1
python -m bot.telegram_bot      # terminal 2
```

Reglas de seguridad (EDT 1.4.2): **0 claves en el código**, `.env` en `.gitignore`, `data/recibos_prueba/` en `.gitignore`, HTTPS en el servidor.

---

## 10b. Cómo mantenerlo en $0 (resumen)

| Pieza | Opción gratuita | Límite que debes aceptar |
|---|---|---|
| IA de lectura | Gemini Flash (nivel gratuito) o PaddleOCR local | Cuotas diarias y por minuto; privacidad (ver sección 5). |
| Bot | Telegram, modo *polling* | Gratis sin condiciones relevantes. |
| Backend, BD y panel | Tu computadora | Solo funciona mientras esté encendida. Para la demo es suficiente. |
| Acceso al panel desde otro dispositivo | Misma red local (`http://IP-de-tu-pc:8000/panel`) | No es público. Un túnel gratuito es opcional; verifica sus condiciones. |
| Datos solares | PVGIS + caché + respaldo local | Si PVGIS cae, se usa el respaldo (y se avisa). |
| Pruebas | PyTest, Locust | Locust no llama a la IA, no gasta cuota. |

**Lo que sacrificas por ser $0:** disponibilidad 24/7, un lector más caro pero con mejor garantía de privacidad, y escalar a usuarios reales. Eso está bien para un prototipo; para el piloto habrá que reconsiderarlo.

---

## 11. Riesgos y qué hacer

| Riesgo | Probabilidad | Impacto | Respuesta |
|---|---|---|---|
| No consigues recibos reales a tiempo | Media | **Alto** (bloquea la medición) | Empieza el día 1. Pídelos a clientes de la empresa; con 20 basta para medir. |
| Exactitud < 95 % | Media | Alto | Compuerta del día 7 y plan B de la sección 9. |
| Tarifas CFE mal capturadas | Media | **Alto** (cotización engañosa) | Verifica contra un recibo real: el motor debe reproducir el "total a pagar" (tolerancia 15 %). |
| PVGIS caído o lento | Baja | Medio | Caché + respaldo, ya implementados. |
| Se agota la cuota gratuita de Gemini | Media | Medio | Pausas de 7 s en las pruebas, reintentos con espera y un mensaje de "intenta en unos minutos". Para la demo, no corras pruebas masivas el mismo día. Plan B local con PaddleOCR. |
| Cambio del formato del recibo | Baja | Medio | Exclusión 4: se corrige el prompt a mano y con versión. |
| Privacidad (la imagen va a un tercero, y en el nivel gratuito puede usarse para mejorar el producto) | Cierta | **Alto** con usuarios reales | En el prototipo, solo recibos de prueba sin datos personales; aviso veraz; Plan B local o nivel de pago para el piloto. |
| Te falta tiempo | Media | Medio | Los días 25–28 son colchón. Lo primero que se recorta es el panel (1.3.3), no el flujo del usuario. |

**Orden de sacrificio** si el tiempo aprieta: (1) panel de asesores, (2) bitácora detallada, (3) plantillas adicionales. **Nunca se sacrifica:** lector + motor de tarifas + consentimiento + borrado de imagen.

---

## 12. Checklist de demo (día 28)

- [ ] Bot responde desde un teléfono que no es el tuyo.
- [ ] Flujo completo foto → confirmación → cotización en < 30 s.
- [ ] Un recibo mal fotografiado produce un mensaje de error útil, no un crash.
- [ ] Una tarifa DAC y una subsidiada dan resultados distintos y razonables.
- [ ] La cotización muestra **rango**, no cifra exacta, y el aviso de estimación preliminar.
- [ ] El panel `/panel` pide clave y muestra las cotizaciones.
- [ ] Evidencia: captura de `pytest` (20 casos y borrado 30/30), de Locust (p95) y de `evaluar_lector.py` (≥ 95 %).
- [ ] Tabla de "qué se recortó" lista para decir con honestidad qué falta (sección 0).

---

## 13. Pendientes que no puedo resolver por ti

Conserva estos del Anexo A de la Actividad 7; el prototipo funciona sin ellos, pero **no se debe presentar como cotización comercial** hasta cerrarlos:

1. Tarifas CFE, límites DAC y reglas de compensación de excedentes vigentes.
2. Precio por Wp real y catálogo de paneles de la empresa.
3. Validación del dimensionamiento contra cotizaciones reales de instaladores.
4. Revisión de licencias al desplegar (si migras a Qwen2.5-VL, lee el archivo LICENSE vigente).
5. Estudio de libertad de operación con un abogado de patentes **antes de salir a producción** (US9171108B2 y su continuación).
6. Para el piloto con usuarios, la revisión legal del aviso de privacidad.
