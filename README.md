<p align="center">
  <img src="assets/logo.jpg" alt="Kinich Solar Logo" width="160" />
</p>

# Kinich Solar

> Prototipo funcional en 4 semanas (versión costo $0)  
> **"Manda tu recibo. Recibe tu proyecto solar."**  
> Manual completo del sistema: [`KINICH_SOLAR_BOT.md`](KINICH_SOLAR_BOT.md)

Sistema automatizado de cotización y dimensionamiento de sistemas fotovoltaicos residenciales en México (con enfoque inicial en tarifas de la península de Yucatán), integrando lectura multimodal de recibos de CFE mediante IA, cálculo solar determinista, simulación técnica de electrodomésticos y un bot interactivo de Telegram.

---

## 🏗️ Arquitectura y Componentes

- **Canal de Usuario:** Bot de Telegram (`python-telegram-bot` v20+ en modo *polling*).
- **Backend / API:** FastAPI con validación Pydantic y endpoints de lectura, cotización y consentimiento.
- **Base de Datos:** SQLite (`kinich.db`) con 5 tablas normalizadas (`clientes`, `recibos`, `tarifas`, `productos`, `cotizaciones`) y bitácora de `auditoria`.
- **Lector de Recibos:** Extracción estructurada mediante Gemini Flash (Google AI Studio) bajo contrato JSON estricto (`jsonschema`).
- **Motor de Tarifas y Simulación:**
  - Cálculo determinista de tarifas de CFE (1, 1B, 1C, 1D, 1F y DAC).
  - Dimensionamiento fotovoltaico con datos satelitales de radiación PVGIS (y respaldo offline de 1600 kWh/kWp/año).
- **Panel Administrativo:** Interfaz web ligera en `/panel` protegida con HTTP Basic Auth para consulta de asesores técnicos.

---

## 🚀 Instalación y Puesta en Marcha

### 1. Requisitos previos
- Python 3.11 o superior.
- Clave de API gratuita de Google AI Studio (`GEMINI_API_KEY`).
- Token de Bot de Telegram (`TELEGRAM_TOKEN`).

### 2. Configurar entorno y dependencias
```bash
python -m venv .venv
# En Windows PowerShell:
.venv\Scripts\Activate.ps1
# En Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Variables de Entorno (`.env`)
Copia `.env.example` a `.env` y configura tus credenciales:
```ini
GEMINI_API_KEY=tu_clave_de_ai_studio
GEMINI_MODEL=gemini-2.5-flash
TELEGRAM_TOKEN=tu_token_de_telegram
API_URL=http://localhost:8000
PANEL_USER=asesor
PANEL_PASS=kinich2026
DB_PATH=kinich.db
```

### 4. Inicializar Base de Datos y Probar
```bash
python -c "from app.db import init_db; init_db()"
pytest tests/test_tarifas.py
pytest tests/test_borrado.py
```

### 5. Ejecutar la Aplicación

**Terminal 1 (Backend FastAPI):**
```bash
uvicorn app.main:app --reload --port 8000
```
- Documentación interactiva Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)
- Panel de asesores: [http://localhost:8000/panel](http://localhost:8000/panel)

**Terminal 2 (Bot de Telegram):**
```bash
python -m bot.telegram_bot
```

---

## 🔒 Privacidad y Seguridad (EDT 1.4.2 y 1.4.3)
- La foto del recibo **nunca toca el disco ni se almacena en base de datos**; se procesa en memoria volátil y se descarta inmediatamente tras la extracción de los 4 datos numéricos.
- Cero claves en el código fuente.
- Panel protegido con credenciales de asesor.
