import io
import json
import secrets
from contextlib import asynccontextmanager
from PIL import Image, ImageOps
import pypdfium2 as pdfium
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import HTMLResponse

from .config import settings
from .db import get_db, init_db
from .schemas import (
    SolicitudCotizar,
    SolicitudConsentimiento,
    SolicitudContactoAsesor,
    SolicitudFeedback,
    DatosRecibo
)
from .privacidad import registrar_consentimiento, tiene_consentimiento, registrar_auditoria
from .lector_recibo import obtener_lector
from .cotizador import cotizar
from .generador_pdf import generar_ficha_tecnica_pdf
from .simulacion_solar import LAT_DEFAULT, LON_DEFAULT
from fastapi.responses import Response, HTMLResponse

MAX_BYTES = 12 * 1024 * 1024
FORMATOS_IMAGEN = {"JPEG": "image/jpeg", "PNG": "image/png"}

def preparar_imagen(raw: bytes) -> tuple[bytes, str]:
    if len(raw) > MAX_BYTES:
        raise ValueError("El archivo pesa más de 12 MB.")
    
    # Soporte nativo para archivos PDF
    if raw.startswith(b"%PDF"):
        try:
            doc = pdfium.PdfDocument(raw)
            if len(doc) == 0:
                raise ValueError("El archivo PDF está vacío.")
            # Renderizar la primera página del recibo a alta resolución (escala 2.0)
            img = doc.get_page(0).render(scale=2.0).to_pil()
        except Exception as e:
            raise ValueError(f"No fue posible leer el archivo PDF: {str(e)}")
    else:
        try:
            img = Image.open(io.BytesIO(raw))
            if img.format not in FORMATOS_IMAGEN:
                raise ValueError(f"Formato no soportado ({img.format}). Envía JPEG, PNG o PDF.")
        except Exception:
            raise ValueError("Archivo de imagen o PDF inválido o corrupto.")
        
    img = ImageOps.exif_transpose(img)       # Corrige orientación según EXIF
    img.thumbnail((2000, 2000))              # Escalar manteniendo proporción
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=90)
    return buf.getvalue(), "image/jpeg"

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Kinich Solar API", lifespan=lifespan)
seguridad = HTTPBasic()
lector = obtener_lector()

@app.post("/api/v1/consentimiento")
def endpoint_consentimiento(s: SolicitudConsentimiento):
    with get_db() as db:
        if s.consentimiento:
            registrar_consentimiento(db, s.telegram_id, s.version_aviso)
            return {"status": "ok", "mensaje": "Consentimiento registrado exitosamente"}
        return {"status": "ok", "mensaje": "Consentimiento no otorgado"}

@app.post("/api/v1/leer-recibo", response_model=DatosRecibo)
async def endpoint_leer_recibo(archivo: UploadFile = File(...)):
    raw = await archivo.read()
    try:
        img_bytes, media_type = preparar_imagen(raw)
        datos = lector.leer(img_bytes, media_type)
        return datos
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"No pudimos procesar el recibo: {str(e)}")
    finally:
        del raw  # Se descarta inmediatamente la imagen de memoria

@app.post("/api/v1/leer-placa")
async def endpoint_leer_placa(archivo: UploadFile = File(...)):
    raw = await archivo.read()
    try:
        img_bytes, media_type = preparar_imagen(raw)
        datos = lector.leer_placa(img_bytes, media_type)
        return datos
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"No pudimos procesar la placa técnica: {str(e)}")
    finally:
        del raw

@app.post("/api/v1/cotizar")
def endpoint_cotizar(s: SolicitudCotizar):
    with get_db() as db:
        if not tiene_consentimiento(db, s.telegram_id):
            raise HTTPException(
                status_code=403,
                detail="Se requiere haber aceptado el aviso de privacidad antes de cotizar."
            )

        producto_row = db.execute("SELECT * FROM productos ORDER BY id LIMIT 1").fetchone()
        if not producto_row:
            raise HTTPException(status_code=500, detail="Catálogo de productos no configurado.")
        producto = dict(producto_row)

        lat = s.lat or LAT_DEFAULT
        lon = s.lon or LON_DEFAULT

        try:
            resultado = cotizar(
                kwh_periodo=s.kwh_periodo,
                tarifa=s.tarifa,
                inicio=s.periodo_inicio,
                fin=s.periodo_fin,
                total_pagar=s.total_pagar,
                producto=producto,
                sombra=s.sombra,
                orientacion=s.orientacion,
                lat=lat,
                lon=lon
            )
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        cliente = db.execute(
            "SELECT id FROM clientes WHERE telegram_id = ?",
            (s.telegram_id,)
        ).fetchone()
        cliente_id = cliente["id"] if cliente else None

        cursor_recibo = db.execute("""
            INSERT INTO recibos (cliente_id, kwh_periodo, tarifa, periodo_inicio, periodo_fin, total_pagar, confirmado, modelo_lector)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        """, (
            cliente_id,
            s.kwh_periodo,
            s.tarifa,
            s.periodo_inicio,
            s.periodo_fin,
            s.total_pagar,
            lector.nombre
        ))
        recibo_id = cursor_recibo.lastrowid

        rec = resultado["recomendado"]
        cursor_cot = db.execute("""
            INSERT INTO cotizaciones (
                recibo_id, version_tarifas, paneles, kwp, produccion_anual_kwh,
                costo_min, costo_max, ahorro_mensual, recuperacion_anios,
                fuente_irradiacion, alertas
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            recibo_id,
            resultado["version_tarifas"],
            rec["paneles"],
            rec["kwp"],
            rec["produccion_anual_kwh"],
            rec["costo_min"],
            rec["costo_max"],
            rec["ahorro_mensual"],
            rec["retorno_anios"],
            resultado["fuente_irradiacion"],
            json.dumps({
                "alertas": resultado["alertas"],
                "sombra": s.sombra,
                "orientacion": s.orientacion,
                "semaforo": resultado["semaforo"]["color"]
            }, ensure_ascii=False)
        ))
        cotizacion_id = cursor_cot.lastrowid

        registrar_auditoria(db, "COTIZACION_GENERADA", {
            "cotizacion_id": cotizacion_id,
            "recibo_id": recibo_id,
            "telegram_id": s.telegram_id,
            "paneles_recomendados": rec["paneles"],
            "kwp": rec["kwp"],
            "ahorro_mensual": rec["ahorro_mensual"],
            "retorno_anios": rec["retorno_anios"],
            "semaforo": resultado["semaforo"]["color"]
        })

        resultado["cotizacion_id"] = cotizacion_id
        resultado["recibo_id"] = recibo_id
        return resultado

@app.post("/api/v1/contacto-asesor")
def endpoint_contacto_asesor(s: SolicitudContactoAsesor):
    with get_db() as db:
        if s.recibo_id:
            db.execute(
                "UPDATE cotizaciones SET contacto_asesor = 1 WHERE recibo_id = ?",
                (s.recibo_id,)
            )
        registrar_auditoria(db, "SOLICITUD_ASESOR", {
            "telegram_id": s.telegram_id,
            "recibo_id": s.recibo_id,
            "detalles": s.detalles
        })
    return {"status": "ok", "mensaje": "Contacto con asesor registrado con perfil completo."}

@app.post("/api/v1/feedback")
def endpoint_feedback(s: SolicitudFeedback):
    with get_db() as db:
        registrar_auditoria(db, "FEEDBACK_USUARIO", {
            "telegram_id": s.telegram_id,
            "recibo_id": s.recibo_id,
            "calificacion": s.calificacion,
            "comentarios": s.comentarios
        })
    return {"status": "ok", "mensaje": "Retroalimentación registrada."}

@app.post("/api/v1/generar-pdf")
def endpoint_generar_pdf(cot: dict, telegram_id: int = 0):
    try:
        pdf_bytes = generar_ficha_tecnica_pdf(cot, telegram_id=telegram_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=Kinich_Solar_Propuesta_{telegram_id}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")

@app.delete("/api/v1/borrar-datos/{telegram_id}")
def endpoint_borrar_datos(telegram_id: int):
    with get_db() as db:
        cliente = db.execute("SELECT id FROM clientes WHERE telegram_id = ?", (telegram_id,)).fetchone()
        if cliente:
            cid = cliente["id"]
            # Borrar cotizaciones asociadas a los recibos de este cliente
            db.execute("DELETE FROM cotizaciones WHERE recibo_id IN (SELECT id FROM recibos WHERE cliente_id = ?)", (cid,))
            db.execute("DELETE FROM recibos WHERE cliente_id = ?", (cid,))
            db.execute("DELETE FROM clientes WHERE id = ?", (cid,))
            registrar_auditoria(db, "DATOS_BORRADOS_ARCO", {"telegram_id": telegram_id})
            return {"status": "ok", "mensaje": "Todos tus registros han sido eliminados conforme a la política de privacidad."}
        return {"status": "ok", "mensaje": "No se encontraron registros asociados a este usuario."}

@app.get("/api/v1/historial/{telegram_id}")
def endpoint_historial(telegram_id: int):
    with get_db() as db:
        filas = db.execute("""
            SELECT c.creado_en, r.kwh_periodo, r.tarifa, c.paneles, c.kwp, c.costo_min, c.costo_max, c.ahorro_mensual, c.recuperacion_anios
            FROM cotizaciones c
            JOIN recibos r ON r.id = c.recibo_id
            JOIN clientes cl ON cl.id = r.cliente_id
            WHERE cl.telegram_id = ?
            ORDER BY c.creado_en DESC
            LIMIT 5
        """, (telegram_id,)).fetchall()
        return [dict(f) for f in filas]

def _autenticar_admin(credenciales: HTTPBasicCredentials = Depends(seguridad)):
    correcto_usuario = secrets.compare_digest(credenciales.username, settings.PANEL_USER)
    correcto_password = secrets.compare_digest(credenciales.password, settings.PANEL_PASS)
    if not (correcto_usuario and correcto_password):
        raise HTTPException(status_code=401, headers={"WWW-Authenticate": "Basic"})

@app.get("/panel", response_class=HTMLResponse)
def vista_panel(_=Depends(_autenticar_admin)):
    with get_db() as db:
        filas = db.execute("""
            SELECT c.creado_en, cl.telegram_id, r.kwh_periodo, r.tarifa, c.paneles, c.kwp,
                   c.costo_min, c.costo_max, c.ahorro_mensual, c.recuperacion_anios, c.contacto_asesor,
                   c.alertas
            FROM cotizaciones c
            JOIN recibos r ON r.id = c.recibo_id
            JOIN clientes cl ON cl.id = r.cliente_id
            WHERE c.creado_en >= datetime('now', '-30 days')
            ORDER BY c.creado_en DESC
        """).fetchall()

    filas_html = ""
    for f in filas:
        asesor_badge = "<span style='color:green;font-weight:bold'>SÍ</span>" if f["contacto_asesor"] else "No"
        filas_html += f"""
        <tr>
            <td>{f['creado_en']}</td>
            <td>{f['telegram_id']}</td>
            <td>{f['kwh_periodo']}</td>
            <td>{f['tarifa']}</td>
            <td>{f['paneles']}</td>
            <td>{f['kwp']} kWp</td>
            <td>${f['costo_min']:,.0f} - ${f['costo_max']:,.0f}</td>
            <td>${f['ahorro_mensual']:,.2f}</td>
            <td>{f['recuperacion_anios'] or 'N/A'} años</td>
            <td>{asesor_badge}</td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Panel de Cotizaciones — Kinich Solar</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 2rem; background: #f8fafc; color: #1e293b; }}
        h1 {{ color: #0f172a; display: flex; align-items: center; gap: 0.5rem; }}
        table {{ width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
        th, td {{ padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
        th {{ background-color: #f1f5f9; font-weight: 600; color: #475569; }}
        tr:hover {{ background-color: #f8fafc; }}
        .badge {{ background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 0.875rem; }}
    </style>
</head>
<body>
    <h1>☀️ Kinich Solar <span class="badge">Panel Asesores (Últimos 30 días)</span></h1>
    <table>
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Telegram ID</th>
                <th>Consumo (kWh)</th>
                <th>Tarifa</th>
                <th>Paneles</th>
                <th>Potencia</th>
                <th>Rango Inversión (MXN)</th>
                <th>Ahorro Estimado/Mes</th>
                <th>Retorno</th>
                <th>¿Pide Asesor?</th>
            </tr>
        </thead>
        <tbody>
            {filas_html or "<tr><td colspan='10' style='text-align:center;'>No hay cotizaciones registradas aún.</td></tr>"}
        </tbody>
    </table>
</body>
</html>
"""
