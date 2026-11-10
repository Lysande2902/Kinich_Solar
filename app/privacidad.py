import json
import sqlite3
from datetime import datetime

TEXTO_AVISO = (
    "Bienvenido a Kinich Solar.\n\n"
    "Para calcular una propuesta solar realista y a la medida de tu hogar, "
    "necesitamos conocer el consumo de energía que aparece en tu recibo de CFE.\n\n"
    "Tu privacidad y seguridad son fundamentales para nosotros:\n\n"
    "• ¿Qué datos leemos?\n"
    "  Únicamente cuatro cifras: los kilowatt-hora (kWh) consumidos, la tarifa contratada, "
    "las fechas del periodo facturado y el total a pagar.\n\n"
    "• ¿Qué datos NO utilizamos ni guardamos?\n"
    "  No recopilamos tu nombre, tu dirección, tu número de servicio ni ningún dato fiscal o bancario. "
    "Si tu foto o documento incluye esos datos, nuestro sistema los ignora por completo.\n\n"
    "• ¿Qué ocurre con tu archivo o imagen?\n"
    "  Se procesa de manera temporal en memoria volátil y se elimina de inmediato una vez leídos los datos. "
    "El archivo jamás se guarda en nuestro disco ni en bases de datos.\n\n"
    "• ¿Para qué se usan estos números?\n"
    "  Para dimensionar cuántos paneles solares requiere tu vivienda, estimar el costo de instalación, "
    "calcular tu ahorro mensual y determinar en cuántos años recuperas tu inversión.\n\n"
    "Al pulsar «Acepto y deseo continuar», autorizas el análisis técnico de las cifras de tu recibo bajo estos términos."
)

def tiene_consentimiento(db: sqlite3.Connection, telegram_id: int) -> bool:
    fila = db.execute(
        "SELECT consentimiento FROM clientes WHERE telegram_id = ?",
        (telegram_id,)
    ).fetchone()
    return bool(fila and fila["consentimiento"] == 1)

def registrar_consentimiento(db: sqlite3.Connection, telegram_id: int, version_aviso: str = "v1.0"):
    ahora = datetime.utcnow().isoformat()
    db.execute("""
        INSERT INTO clientes (telegram_id, consentimiento, consentimiento_fecha, version_aviso)
        VALUES (?, 1, ?, ?)
        ON CONFLICT(telegram_id) DO UPDATE SET
            consentimiento = 1,
            consentimiento_fecha = excluded.consentimiento_fecha,
            version_aviso = excluded.version_aviso
    """, (telegram_id, ahora, version_aviso))
    
    db.execute(
        "INSERT INTO auditoria (evento, detalles) VALUES (?, ?)",
        ("CONSENTIMIENTO_OTORGADO", json.dumps({"telegram_id": telegram_id, "version": version_aviso}))
    )

def registrar_auditoria(db: sqlite3.Connection, evento: str, detalles: dict | str):
    cadena_detalles = detalles if isinstance(detalles, str) else json.dumps(detalles, ensure_ascii=False)
    db.execute(
        "INSERT INTO auditoria (evento, detalles) VALUES (?, ?)",
        (evento, cadena_detalles)
    )
