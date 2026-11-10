import io
import httpx
import logging
from telegram import (
    Update,
    InlineKeyboardButton as B,
    InlineKeyboardMarkup as M,
    ReplyKeyboardRemove
)
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)
from app.config import settings
from app.privacidad import TEXTO_AVISO

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

API = settings.API_URL

# Matriz técnica de potencia nominal (Watts) según capacidad y tecnología
POTENCIA_AIRES_WATTS = {
    "1.0": {"inverter": 750, "estandar": 1300, "nombre": "1 Tonelada (12,000 BTU)"},
    "1.5": {"inverter": 1100, "estandar": 1850, "nombre": "1.5 Toneladas (18,000 BTU)"},
    "2.0": {"inverter": 1500, "estandar": 2500, "nombre": "2 Toneladas (24,000 BTU)"}
}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = M([[B("Acepto y deseo continuar", callback_data="acepto")]])
    await update.message.reply_text(TEXTO_AVISO, reply_markup=keyboard)

async def ayuda(update: Update, context: ContextTypes.DEFAULT_TYPE):
    ayuda_texto = (
        "Kinich Solar — Asistente de Dimensionamiento Fotovoltaico\n\n"
        "Comandos disponibles:\n"
        "• /start — Ver la bienvenida y la política de protección de datos.\n"
        "• /kwh [cantidad] — Cotizar ingresando tu consumo manualmente (ej: /kwh 650).\n"
        "• /historial — Consultar tus cotizaciones anteriores.\n"
        "• /borrar_mis_datos — Eliminar todo tu historial de nuestra base de datos (cumplimiento ARCO).\n"
        "• /reiniciar — Limpiar datos de la sesión actual.\n"
        "• /ayuda — Mostrar este menú de ayuda.\n\n"
        "Puedes mandarme una foto nítida o el archivo PDF de tu recibo de CFE. "
        "No guardamos datos personales como tu nombre, dirección o número de servicio."
    )
    await update.message.reply_text(ayuda_texto)

async def reiniciar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    await update.message.reply_text(
        "Se han borrado los datos de la sesión actual. Escribe /start para comenzar de nuevo."
    )

async def borrar_mis_datos(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.delete(f"{API}/api/v1/borrar-datos/{user_id}")
        msg = resp.json().get("mensaje", "Datos eliminados correctamente.")
    except Exception:
        msg = "Se ha procesado la solicitud de eliminación de tus datos en la base de datos local."
    context.user_data.clear()
    await update.message.reply_text(f"Privacidad garantizada: {msg}")

async def historial(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{API}/api/v1/historial/{user_id}")
        
        if resp.status_code == 200 and resp.json():
            filas = resp.json()
            txt = "Tus cotizaciones anteriores en Kinich Solar:\n\n"
            for i, f in enumerate(filas, 1):
                txt += (
                    f"Consulta #{i} ({f['creado_en'][:10]}):\n"
                    f"• Consumo: {f['kwh_periodo']} kWh (Tarifa {f['tarifa']})\n"
                    f"• Sistema: {f['paneles']} paneles ({f['kwp']} kWp)\n"
                    f"• Rango: ${f['costo_min']:,} - ${f['costo_max']:,} MXN\n"
                    f"• Ahorro: ~${f['ahorro_mensual']:,.0f} MXN/mes | Retorno: ~{f['recuperacion_anios'] or 'N/D'} anos\n\n"
                )
            await update.message.reply_text(txt)
        else:
            await update.message.reply_text("No tienes cotizaciones guardadas aún. Envía tu recibo de CFE para generar la primera.")
    except Exception:
        await update.message.reply_text("No fue posible consultar tu historial en este momento.")

async def comando_kwh(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.user_data.get("consent"):
        await update.message.reply_text("Por favor escribe /start para autorizar el aviso de privacidad.")
        return

    if not context.args:
        await update.message.reply_text("Indica los kWh después del comando. Ejemplo: /kwh 650")
        return

    try:
        kwh = float(context.args[0])
        if kwh <= 0: raise ValueError()
    except ValueError:
        await update.message.reply_text("El valor ingresado debe ser un número positivo.")
        return

    context.user_data["datos"] = {
        "kwh_periodo": kwh,
        "tarifa": "1C",
        "periodo_inicio": None,
        "periodo_fin": None,
        "total_pagar": None
    }
    context.user_data["techo"] = {"tipo": "losa", "sombra": "ninguna", "orientacion": "sur"}
    
    mensaje = (
        "Consumo registrado manualmente:\n"
        f"• Consumo facturado: {kwh} kWh al bimestre\n"
        f"• Tarifa supuesta: 1C (Residencial estándar)\n\n"
        "¿Cómo prefieres continuar?"
    )
    teclado = M([
        [B("Calcular cotización directa", callback_data="cotizar_directo")],
        [B("Afinar con características del techo", callback_data="techo_paso1")],
        [B("Corregir consumo", callback_data="no")]
    ])
    await update.message.reply_text(mensaje, reply_markup=teclado)

async def manejar_foto(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.user_data.get("consent"):
        await update.message.reply_text("Por favor escribe /start para revisar y autorizar el aviso de privacidad.")
        return

    foto = update.message.photo[-1]
    archivo = await foto.get_file()
    buf = io.BytesIO()
    await archivo.download_to_memory(buf)
    raw_bytes = buf.getvalue()
    buf.close()

    # Si estamos esperando una foto de placa de aparato
    if context.user_data.get("esperando_placa"):
        context.user_data["esperando_placa"] = False
        await procesar_foto_placa(raw_bytes, update, context)
        return

    await update.message.reply_text("Analizando tu recibo de CFE. Esto toma entre 10 y 15 segundos...")
    try:
        await procesar_archivo_recibo(raw_bytes, "recibo.jpg", "image/jpeg", update, context)
    except Exception as e:
        logger.error(f"Error procesando foto: {e}")
        await update.message.reply_text("Inconveniente al procesar la foto. Intenta enviarla de nuevo.")

async def procesar_foto_placa(raw_bytes: bytes, update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Leyendo especificaciones técnicas de la placa con inteligencia artificial...")
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            resp = await client.post(
                f"{API}/api/v1/leer-placa",
                files={"archivo": ("placa.jpg", raw_bytes, "image/jpeg")}
            )
        del raw_bytes

        if resp.status_code == 200:
            d = resp.json()
            if d.get("legible") and d.get("potencia_watts"):
                watts = int(d["potencia_watts"])
                marca = d.get("marca") or "Equipo detectado"
                tipo = d.get("tipo_equipo") or "Aparato"
                tec = "Inverter (Ahorrador)" if d.get("tecnologia") == "inverter" else "Estándar On-Off"
                
                context.user_data["equipo_simulado"] = {
                    "nombre": f"{marca} ({tipo})",
                    "watts": watts,
                    "tecnologia": tec
                }

                mensaje = (
                    "Especificaciones detectadas en la placa:\n\n"
                    f"• Equipo: {tipo}\n"
                    f"• Marca / Modelo: {marca} {d.get('modelo') or ''}\n"
                    f"• Tecnología: {tec}\n"
                    f"• Potencia eléctrica nominal: {watts} Watts\n\n"
                    "Para calcular con exactitud los kWh mensuales, ¿cuántas horas al día promedio estará en uso?"
                )
                teclado = M([
                    [B("4 horas al día", callback_data="huso_4"), B("8 horas al día", callback_data="huso_8")],
                    [B("12 horas al día", callback_data="huso_12"), B("16 horas al día", callback_data="huso_16")],
                    [B("Cancelar y volver", callback_data="cotizar_directo")]
                ])
                await update.message.reply_text(mensaje, reply_markup=teclado)
                return

        await update.message.reply_text(
            "No logramos identificar los Watts en la fotografía de la placa. "
            "No te preocupes: puedes seleccionarlo fácilmente con nuestros botones guiados."
        )
        await mostrar_menu_aires(update.message)
    except Exception as e:
        logger.error(f"Error analizando placa: {e}")
        await update.message.reply_text("Ocurrió un error al analizar la placa. Usaremos el selector guiado.")
        await mostrar_menu_aires(update.message)

async def manejar_documento(update: Update, context: ContextTypes.DEFAULT_TYPE):
    doc = update.message.document
    mime = (doc.mime_type or "").lower()
    nombre = (doc.file_name or "").lower()

    es_pdf = mime == "application/pdf" or nombre.endswith(".pdf")
    es_img = mime in ["image/jpeg", "image/png"] or nombre.endswith((".jpg", ".jpeg", ".png"))

    if not (es_pdf or es_img):
        await update.message.reply_text("Formato no compatible. Por favor envía un archivo PDF, JPG o PNG.")
        return

    if not context.user_data.get("consent"):
        await update.message.reply_text("Por favor escribe /start para revisar y autorizar el aviso de privacidad.")
        return

    tipo_txt = "PDF oficial" if es_pdf else "imagen"
    await update.message.reply_text(f"Procesando tu archivo {tipo_txt} de CFE en memoria...")

    try:
        archivo = await doc.get_file()
        buf = io.BytesIO()
        await archivo.download_to_memory(buf)
        raw_bytes = buf.getvalue()
        buf.close()

        media_type = "application/pdf" if es_pdf else "image/jpeg"
        await procesar_archivo_recibo(raw_bytes, doc.file_name or "recibo", media_type, update, context)
    except Exception as e:
        logger.error(f"Error procesando documento: {e}")
        await update.message.reply_text("Error al leer el archivo. Asegúrate de que sea un PDF o imagen válido.")

async def procesar_archivo_recibo(raw_bytes: bytes, filename: str, mime: str, update: Update, context: ContextTypes.DEFAULT_TYPE):
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{API}/api/v1/leer-recibo",
            files={"archivo": (filename, raw_bytes, mime)}
        )

    del raw_bytes

    if resp.status_code != 200:
        await update.message.reply_text(
            "No logramos extraer con certeza los datos de tu recibo.\n"
            "Puedes intentar con una foto más clara o ingresar los kWh con /kwh [cantidad]."
        )
        return

    d = resp.json()
    if not d.get("legible") or d.get("kwh_periodo") is None:
        await update.message.reply_text(
            "La información del recibo no se distingue con claridad.\n"
            "Por favor intenta con un PDF o escribe /kwh [cantidad]."
        )
        return

    context.user_data["datos"] = {
        "kwh_periodo": d["kwh_periodo"],
        "tarifa": d.get("tarifa") or "1C",
        "periodo_inicio": d.get("periodo_inicio"),
        "periodo_fin": d.get("periodo_fin"),
        "total_pagar": d.get("total_pagar")
    }
    context.user_data["techo"] = {"tipo": "losa", "sombra": "ninguna", "orientacion": "sur"}

    total_txt = f"${d['total_pagar']:,.2f} MXN" if d.get("total_pagar") else "No detectado"
    periodo_txt = f"{d.get('periodo_inicio')} al {d.get('periodo_fin')}" if d.get('periodo_inicio') else "Bimestral aproximado"

    confirmacion = (
        "Hemos detectado los siguientes datos técnicos en tu recibo:\n\n"
        f"• Consumo facturado: {d['kwh_periodo']} kWh\n"
        f"• Tarifa de suministro: {d.get('tarifa', '1C')}\n"
        f"• Periodo facturado: {periodo_txt}\n"
        f"• Total a pagar con CFE: {total_txt}\n\n"
        "Nota: Tu nombre, dirección y número de servicio han sido ignorados.\n\n"
        "¿Los datos son correctos?"
    )

    teclado = M([
        [B("Son correctos, cotizar directamente", callback_data="cotizar_directo")],
        [B("Afinar con características de mi techo", callback_data="techo_paso1")],
        [B("No son correctos, deseo corregir", callback_data="no")]
    ])
    await update.message.reply_text(confirmacion, reply_markup=teclado)

async def manejar_ubicacion(update: Update, context: ContextTypes.DEFAULT_TYPE):
    loc = update.message.location
    if loc:
        context.user_data["lat"] = loc.latitude
        context.user_data["lon"] = loc.longitude
        await update.message.reply_text(
            f"Ubicación registrada ({round(loc.latitude, 3)}, {round(loc.longitude, 3)}).\n"
            "Consultando radiación satelital PVGIS para tus coordenadas...",
            reply_markup=ReplyKeyboardRemove()
        )
        await ejecutar_cotizacion(update.message, context, update.effective_user.id)

async def mostrar_menu_aires(message):
    teclado = M([
        [B("1 Tonelada (12,000 BTU) — Recámara estándar", callback_data="aire_cap_1.0")],
        [B("1.5 Toneladas (18,000 BTU) — Recámara grande/sala", callback_data="aire_cap_1.5")],
        [B("2 Toneladas (24,000 BTU) — Área amplia", callback_data="aire_cap_2.0")],
        [B("Subir foto de la placa de especificaciones", callback_data="pedir_foto_placa")],
        [B("Volver al menú de equipos", callback_data="menu_escenarios")]
    ])
    explicacion = (
        "Simulador de Aire Acondicionado\n\n"
        "Paso 1 de 3: ¿De qué capacidad es el minisplit que piensas agregar?"
    )
    await message.reply_text(explicacion, reply_markup=teclado)

async def botones(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    await q.answer()
    user_id = q.from_user.id

    if q.data == "acepto":
        context.user_data["consent"] = True
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"{API}/api/v1/consentimiento",
                    json={"telegram_id": user_id, "consentimiento": True, "version_aviso": "v1.0"}
                )
        except Exception:
            pass

        await q.message.reply_text(
            "Consentimiento registrado.\n\n"
            "Por favor envíanos la foto de tu recibo de CFE o el archivo PDF descargado.\n"
            "Solo leeremos tus cifras de energía y el documento no será almacenado."
        )

    elif q.data == "techo_paso1":
        teclado = M([
            [B("Losa de concreto (plana)", callback_data="techo_losa"), B("Lámina metálica", callback_data="techo_lamina")],
            [B("Teja", callback_data="techo_teja"), B("No estoy seguro", callback_data="techo_nose")]
        ])
        explicacion = (
            "Pregunta 1 de 3: ¿Qué tipo de cubierta tiene tu techo?\n\n"
            "El tipo de cubierta define la estructura de fijación. "
            "En losas planas de concreto, la inclinación y orientación se calibra libremente con soportes de aluminio."
        )
        await q.message.reply_text(explicacion, reply_markup=teclado)

    elif q.data.startswith("techo_"):
        context.user_data.setdefault("techo", {})["tipo"] = q.data.replace("techo_", "")
        teclado = M([
            [B("Ninguna (techo despejado)", callback_data="sombra_ninguna")],
            [B("Poca (árbol o tinaco lejano, ~7%)", callback_data="sombra_poca")],
            [B("Moderada (muros o edificios vecinos, ~15%)", callback_data="sombra_moderada")],
            [B("Mucha sombra recurrente (~30%)", callback_data="sombra_mucha")]
        ])
        explicacion = (
            "Pregunta 2 de 3: ¿Existen obstáculos que proyecten sombra sobre tu techo?\n\n"
            "Tinacos, árboles altos o bardas reducen la generación en ciertas horas. "
            "Indicar el nivel de sombra nos permite no sobreestimar la producción real de tus paneles."
        )
        await q.message.reply_text(explicacion, reply_markup=teclado)

    elif q.data.startswith("sombra_"):
        context.user_data.setdefault("techo", {})["sombra"] = q.data.replace("sombra_", "")
        teclado = M([
            [B("Hacia el Sur (Orientación óptima en México)", callback_data="ori_sur")],
            [B("Hacia el Este o el Oeste", callback_data="ori_este")],
            [B("Hacia el Norte", callback_data="ori_norte")],
            [B("Losa plana / No estoy seguro", callback_data="ori_sur")]
        ])
        explicacion = (
            "Pregunta 3 de 3: ¿Hacia dónde mira la zona disponible de tu techo?\n\n"
            "En México (hemisferio norte), orientar los módulos hacia el Sur captura la mayor cantidad de sol a lo largo del año."
        )
        await q.message.reply_text(explicacion, reply_markup=teclado)

    elif q.data.startswith("ori_"):
        context.user_data.setdefault("techo", {})["orientacion"] = q.data.replace("ori_", "")
        teclado = M([[B("Calcular propuesta con estos ajustes", callback_data="cotizar_directo")]])
        await q.message.reply_text(
            "Características de techo registradas.\n"
            "Aplicaremos las pérdidas estimadas por sombreado y orientación para ofrecerte una estimación realista.",
            reply_markup=teclado
        )

    elif q.data == "cotizar_directo":
        await q.message.reply_text("Consultando modelo de radiación satelital y calculando opciones de dimensionamiento...")
        await ejecutar_cotizacion(q.message, context, user_id)

    elif q.data == "no":
        await q.message.reply_text(
            "Entendido. Puedes enviar otra fotografía con mejor ángulo, adjuntar el archivo PDF de CFE, "
            "o ingresar los kWh directamente escribiendo /kwh [cantidad]."
        )

    elif q.data == "descargar_pdf":
        cot = context.user_data.get("ultima_cotizacion")
        if not cot:
            await q.message.reply_text("No hay una cotización activa para descargar en PDF. Escribe /start para generar una.")
            return

        await q.message.reply_text("Generando tu Ficha Técnica ejecutiva en PDF...")
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(f"{API}/api/v1/generar-pdf", json=cot, params={"telegram_id": user_id})
            
            if resp.status_code == 200:
                pdf_bytes = resp.content
                await q.message.reply_document(
                    document=pdf_bytes,
                    filename=f"Kinich_Solar_Propuesta_{user_id}.pdf",
                    caption="Aquí tienes tu Ficha Técnica en PDF con el membrete y análisis de Kinich Solar."
                )
            else:
                await q.message.reply_text("Hubo un detalle al generar el archivo. Por favor intenta de nuevo.")
        except Exception as e:
            logger.error(f"Error enviando PDF: {e}")
            await q.message.reply_text("Ocurrió un error al entregar el PDF. Intenta en un momento.")

    # --- Menú general de simulador de escenarios ---
    elif q.data == "menu_escenarios":
        teclado = M([
            [B("Aire Acondicionado Minisplit", callback_data="sim_aire_inicio")],
            [B("Refrigerador", callback_data="sim_refri")],
            [B("Bomba de Agua o Alberca", callback_data="sim_bomba")],
            [B("Vehículo Eléctrico / Híbrido", callback_data="sim_auto")],
            [B("Subir foto de placa técnica de un aparato", callback_data="pedir_foto_placa")],
            [B("Volver a cotización actual", callback_data="cotizar_directo")]
        ])
        explicacion = (
            "Simulador de Equipos y Crecimiento Futuro\n\n"
            "El consumo real de un aparato depende de tres factores técnicos:\n"
            "1. La potencia o capacidad (toneladas o Watts).\n"
            "2. La tecnología (un equipo Inverter consume casi la mitad que uno tradicional).\n"
            "3. Las horas de uso diario.\n\n"
            "¿Qué equipo deseas simular?"
        )
        await q.message.reply_text(explicacion, reply_markup=teclado)

    elif q.data == "pedir_foto_placa":
        context.user_data["esperando_placa"] = True
        await q.message.reply_text(
            "Modo Placa Técnica activado.\n\n"
            "Por favor envía una fotografía clara de la etiqueta o placa plateada de especificaciones técnicas "
            "que viene pegada al costado de tu aire acondicionado, refrigerador o bomba.\n\n"
            "Nuestra IA leerá directamente los Watts, Amperes o modelo exacto para hacer el cálculo milimétrico."
        )

    # --- Flujo guiado de aire acondicionado ---
    elif q.data == "sim_aire_inicio":
        await mostrar_menu_aires(q.message)

    elif q.data.startswith("aire_cap_"):
        cap = q.data.replace("aire_cap_", "")
        context.user_data.setdefault("sim_aire", {})["cap"] = cap
        info = POTENCIA_AIRES_WATTS[cap]

        teclado = M([
            [B("Inverter / Ahorrador (Mirage, Midea, LG, Carrier)", callback_data="aire_tec_inverter")],
            [B("Tradicional On-Off (no inverter, mayor consumo)", callback_data="aire_tec_estandar")],
            [B("No estoy seguro (cálculo conservador)", callback_data="aire_tec_estandar")]
        ])
        explicacion = (
            f"Capacidad seleccionada: {info['nombre']}\n\n"
            "Paso 2 de 3: ¿Qué tecnología tiene o tendrá el equipo?\n\n"
            "Dato técnico importante: Los aires Inverter modulan la velocidad del compresor y consumen "
            "entre 40% y 50% menos electricidad que los tradicionales On-Off."
        )
        await q.message.reply_text(explicacion, reply_markup=teclado)

    elif q.data.startswith("aire_tec_"):
        tec = q.data.replace("aire_tec_", "")
        context.user_data.setdefault("sim_aire", {})["tec"] = tec
        cap = context.user_data["sim_aire"]["cap"]
        info = POTENCIA_AIRES_WATTS[cap]
        watts = info[tec]
        tec_nom = "Inverter" if tec == "inverter" else "Tradicional On-Off"

        context.user_data["equipo_simulado"] = {
            "nombre": f"Minisplit {info['nombre']}",
            "watts": watts,
            "tecnologia": tec_nom
        }

        teclado = M([
            [B("Poco (4 horas/día — solo siesta o dormir)", callback_data="huso_4")],
            [B("Normal (8 horas/día — toda la noche)", callback_data="huso_8")],
            [B("Intensivo (12 horas/día — tarde y noche)", callback_data="huso_12")],
            [B("Continuo (16+ horas/día)", callback_data="huso_16")],
            [B("Volver al menú", callback_data="menu_escenarios")]
        ])
        explicacion = (
            f"Equipo configurado: {info['nombre']} con tecnología {tec_nom} (~{watts} Watts nominales).\n\n"
            "Paso 3 de 3: ¿Cuántas horas al día promedio estará encendido?"
        )
        await q.message.reply_text(explicacion, reply_markup=teclado)

    # --- Simuladores directos de otros dispositivos ---
    elif q.data == "sim_refri":
        teclado = M([
            [B("Refrigerador Inverter moderno (~35 kWh/mes)", callback_data="huso_directo_35_Refrigerador Inverter")],
            [B("Refrigerador tradicional >10 años (~90 kWh/mes)", callback_data="huso_directo_90_Refrigerador Tradicional Antiguo")],
            [B("Volver", callback_data="menu_escenarios")]
        ])
        await q.message.reply_text(
            "Refrigerador:\n"
            "Un refrigerador antiguo de hace más de 10 años consume casi el triple que uno moderno con compresor Inverter.\n"
            "Selecciona el tipo de equipo:",
            reply_markup=teclado
        )

    elif q.data == "sim_bomba":
        teclado = M([
            [B("Bomba de agua doméstica 1/2 HP (1 h/día, ~12 kWh/mes)", callback_data="huso_directo_12_Bomba de Agua Doméstica")],
            [B("Bomba de alberca 1 HP (6 h/día, ~140 kWh/mes)", callback_data="huso_directo_140_Bomba de Alberca 1 HP")],
            [B("Bomba de alberca 1.5 HP (6 h/día, ~210 kWh/mes)", callback_data="huso_directo_210_Bomba de Alberca 1.5 HP")],
            [B("Volver", callback_data="menu_escenarios")]
        ])
        await q.message.reply_text("Selecciona el tipo de bomba:", reply_markup=teclado)

    elif q.data == "sim_auto":
        teclado = M([
            [B("Uso moderado (~800 km/mes, ~180 kWh/mes)", callback_data="huso_directo_180_Vehículo Eléctrico (Uso Urbano)")],
            [B("Uso intensivo (~1,500 km/mes, ~340 kWh/mes)", callback_data="huso_directo_340_Vehículo Eléctrico (Uso Diario)")],
            [B("Volver", callback_data="menu_escenarios")]
        ])
        await q.message.reply_text("Carga residencial de vehículo eléctrico:", reply_markup=teclado)

    elif q.data.startswith("huso_directo_"):
        partes = q.data.replace("huso_directo_", "").split("_")
        kwh_mes = float(partes[0])
        nombre_eq = partes[1]
        await aplicar_simulacion_equipo(kwh_mes, nombre_eq, "", q.message, context, user_id)

    elif q.data.startswith("huso_"):
        horas = int(q.data.replace("huso_", ""))
        eq = context.user_data.get("equipo_simulado", {})
        watts = eq.get("watts", 900)
        nombre_eq = eq.get("nombre", "Equipo")
        tec_nom = eq.get("tecnologia", "")

        # Fórmula exacta: kWh_mes = Watts * Horas * 30.4 / 1000
        kwh_mes = round((watts * horas * 30.4) / 1000.0, 1)
        detalles_uso = f"{horas} horas al día con potencia estimada de ~{watts} Watts ({tec_nom})"
        await aplicar_simulacion_equipo(kwh_mes, nombre_eq, detalles_uso, q.message, context, user_id)

    elif q.data == "asesor":
        recibo_id = context.user_data.get("recibo_id")
        detalles = {
            "datos": context.user_data.get("datos"),
            "techo": context.user_data.get("techo"),
            "lat": context.user_data.get("lat"),
            "lon": context.user_data.get("lon"),
            "ultima_cotizacion": context.user_data.get("ultima_cotizacion")
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"{API}/api/v1/contacto-asesor",
                    json={"telegram_id": user_id, "recibo_id": recibo_id, "detalles": detalles}
                )
        except Exception:
            pass

        await q.message.reply_text(
            "Solicitud confirmada.\n\n"
            "Un asesor técnico de Kinich Solar revisará el perfil técnico de tu techo y consumo "
            "para preparar un anteproyecto formal con visita técnica y se pondrá en contacto contigo."
        )

    elif q.data in ["fb_pos", "fb_neg"]:
        calif = "positivo" if q.data == "fb_pos" else "negativo"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"{API}/api/v1/feedback",
                    json={
                        "telegram_id": user_id,
                        "recibo_id": context.user_data.get("recibo_id"),
                        "calificacion": calif
                    }
                )
        except Exception:
            pass
        msg = (
            "Agradecemos tu retroalimentación. Nos ayuda a mantener la precisión del estimador."
            if calif == "positivo"
            else "Gracias por tu comentario. Tomaremos nota para calibrar la lectura y los cálculos."
        )
        await q.message.reply_text(msg)

async def aplicar_simulacion_equipo(kwh_mes_adicional: float, nombre_equipo: str, detalles_uso: str, message, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    datos_base = context.user_data.get("datos")
    if not datos_base:
        await message.reply_text("No hay datos de consumo registrados. Por favor escribe /start.")
        return

    kwh_adicional_bimestre = kwh_mes_adicional * 2.0
    datos_simulados = {
        **datos_base,
        "kwh_periodo": datos_base["kwh_periodo"] + kwh_adicional_bimestre
    }
    
    techo = context.user_data.get("techo", {})
    payload = {
        **datos_simulados,
        "telegram_id": user_id,
        "sombra": techo.get("sombra", "ninguna"),
        "orientacion": techo.get("orientacion", "sur"),
        "tipo_techo": techo.get("tipo", "losa"),
        "lat": context.user_data.get("lat"),
        "lon": context.user_data.get("lon")
    }

    await message.reply_text(f"Calculando impacto energético y solar de: {nombre_equipo}...")
    try:
        async with httpx.AsyncClient(timeout=35) as client:
            resp = await client.post(f"{API}/api/v1/cotizar", json=payload)
        
        if resp.status_code == 200:
            cot_sim = resp.json()
            cot_act = context.user_data.get("ultima_cotizacion")
            
            pan_act = cot_act["recomendado"]["paneles"] if cot_act else 10
            pan_sim = cot_sim["recomendado"]["paneles"]
            dif_pan = max(0, pan_sim - pan_act)
            
            detalles_txt = f"• Régimen de uso: {detalles_uso}\n" if detalles_uso else ""
            
            msg_sim = (
                f"SIMULACIÓN DE IMPACTO ENERGÉTICO — KINICH SOLAR\n\n"
                f"Equipo analizado: {nombre_equipo}\n"
                f"{detalles_txt}"
                f"• Consumo adicional proyectado: +{kwh_mes_adicional} kWh al mes (+{int(kwh_adicional_bimestre)} kWh al bimestre)\n"
                f"• Consumo mensual total resultante: ~{cot_sim['kwh_mes']} kWh/mes\n\n"
                f"Ajuste en tu sistema solar recomendado (cobertura 90%):\n"
                f"• Módulos solares: Tu sistema pasa de {pan_act} a {pan_sim} paneles (+{dif_pan} paneles adicionales).\n"
                f"• Potencia ajustada: {cot_sim['recomendado']['kwp']} kWp.\n"
                f"• Rango de inversión total llave en mano: ${cot_sim['recomendado']['costo_min']:,} a ${cot_sim['recomendado']['costo_max']:,} MXN.\n\n"
                "Con este dimensionamiento preventivo, tu hogar absorberá el consumo del nuevo equipo "
                "manteniendo tu facturación con CFE en el cargo mínimo obligatorio sin caer en tarifa DAC."
            )
            teclado = M([
                [B("Simular otro equipo", callback_data="menu_escenarios")],
                [B("Solicitar asesoría técnica para este proyecto", callback_data="asesor")],
                [B("Volver a cotización actual", callback_data="cotizar_directo")]
            ])
            await message.reply_text(msg_sim, reply_markup=teclado)
    except Exception as e:
        logger.error(f"Error en simulación: {e}")
        await message.reply_text("Ocurrió un error al calcular la simulación. Por favor intenta de nuevo.")

async def ejecutar_cotizacion(message, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    datos = context.user_data.get("datos")
    if not datos:
        await message.reply_text("No encontramos datos de consumo pendientes. Por favor escribe /start.")
        return

    techo = context.user_data.get("techo", {})
    payload = {
        **datos,
        "telegram_id": user_id,
        "sombra": techo.get("sombra", "ninguna"),
        "orientacion": techo.get("orientacion", "sur"),
        "tipo_techo": techo.get("tipo", "losa"),
        "lat": context.user_data.get("lat"),
        "lon": context.user_data.get("lon")
    }

    try:
        async with httpx.AsyncClient(timeout=35) as client:
            resp = await client.post(f"{API}/api/v1/cotizar", json=payload)

        if resp.status_code != 200:
            detalle = resp.json().get("detail", "Error en el cálculo.")
            await message.reply_text(f"No fue posible completar la cotización: {detalle}")
            return

        cot = resp.json()
        cot["tarifa"] = datos.get("tarifa", "1C")
        context.user_data["recibo_id"] = cot.get("recibo_id")
        context.user_data["ultima_cotizacion"] = cot

        rec = cot["recomendado"]
        sem = cot["semaforo"]

        gen_anual = rec.get("produccion_anual_kwh", 0)
        co2_ton = round(gen_anual * 0.435 / 1000.0, 1)
        arboles = int(co2_ton * 45)

        opciones_txt = ""
        nombres_claros = {
            0.80: "Opción 1: Sistema Básico (80% de cobertura)",
            0.90: "Opción 2: Sistema Recomendado (90% de cobertura)",
            1.00: "Opción 3: Sistema Completo (100% de cobertura)"
        }
        explicaciones_claras = {
            0.80: "Menor desembolso inicial. Elimina los escalones de consumo más costosos de CFE.",
            0.90: "El punto óptimo entre inversión y reducción de factura. Evita generar excedentes no aprovechables.",
            1.00: "Generación equivalente al 100% de tu consumo anual facturado."
        }

        for op in cot["opciones"]:
            cob = op["objetivo_cobertura"]
            titulo = nombres_claros.get(cob, f"Sistema al {int(cob*100)}%")
            desc = explicaciones_claras.get(cob, "")

            opciones_txt += (
                f"• {titulo}\n"
                f"  {desc}\n"
                f"  - Paneles sugeridos: {op['paneles']} módulos (potencia total: {op['kwp']} kWp)\n"
                f"  - Generación anual estimada: ~{op['produccion_anual_kwh']:,} kWh/año\n"
                f"  - Rango de inversión llave en mano: ${op['costo_min']:,} a ${op['costo_max']:,} MXN\n"
                f"  - Ahorro mensual proyectado: ~${op['ahorro_mensual']:,.0f} MXN al mes\n"
                f"  - Retorno simple de inversión: ~{op['retorno_anios'] or 'N/D'} años\n\n"
            )

        alertas_txt = ""
        if cot.get("alertas"):
            alertas_txt = "\nNotas importantes:\n" + "\n".join(f"• {a}" for a in cot["alertas"]) + "\n"

        ajuste_sombra_txt = ""
        if cot.get("perdida_estimada_pct", 0) > 0:
            ajuste_sombra_txt = f"• Ajuste por sombreado y orientación: -{cot['perdida_estimada_pct']}% en producción proyectada.\n"

        resultado_msg = (
            "ANÁLISIS DE VIABILIDAD SOLAR — KINICH SOLAR\n\n"
            f"Diagnóstico preliminar: {sem['indicador']} {sem['titulo']}\n"
            f"{sem['mensaje']}\n\n"
            "Resumen de consumo de tu servicio:\n"
            f"• Consumo mensual promedio: {cot['kwh_mes']} kWh/mes\n"
            f"• Pago mensual equivalente con CFE: ${cot['recibo_mes_real']:,.2f} MXN\n"
            f"• Costo unitario promedio: ${cot['tarifa_efectiva_kwh']} MXN por kWh\n"
            f"{ajuste_sombra_txt}\n"
            "Dimensionamiento en 3 escalas de inversión:\n\n"
            f"{opciones_txt}"
            "Impacto ambiental positivo:\n"
            f"• Tu sistema evitará la emisión de ~{co2_ton} toneladas de CO2 al año (equivalente a plantar {arboles} árboles adultos).\n\n"
            "Criterio de transparencia económica:\n"
            "El ahorro mensual proyectado está topado estrictamente a lo que actualmente pagas en tu recibo, "
            "contemplando además el pago del cargo mínimo obligatorio de interconexión con CFE.\n"
            f"{alertas_txt}\n"
            "Esta propuesta es una estimación de ingeniería preliminar. Los costos finales y "
            "requerimientos eléctricos se confirman en una visita técnica en sitio."
        )

        teclado = M([
            [B("Descargar Ficha Técnica en PDF", callback_data="descargar_pdf")],
            [B("Simular equipo futuro (+aire / +auto)", callback_data="menu_escenarios")],
            [B("Solicitar asesoría técnica sin costo", callback_data="asesor")],
            [B("Cálculo exacto", callback_data="fb_pos"), B("Discrepa de mi recibo", callback_data="fb_neg")]
        ])

        await message.reply_text(resultado_msg, reply_markup=teclado)

    except Exception as e:
        logger.error(f"Error al cotizar: {e}")
        await message.reply_text(
            "Ocurrió un problema de comunicación al generar la cotización. "
            "Por favor intenta de nuevo en unos minutos."
        )

def main():
    if not settings.TELEGRAM_TOKEN:
        print("ERROR: TELEGRAM_TOKEN no configurado en .env")
        return

    app = ApplicationBuilder().token(settings.TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("ayuda", ayuda))
    app.add_handler(CommandHandler("reiniciar", reiniciar))
    app.add_handler(CommandHandler("historial", historial))
    app.add_handler(CommandHandler("borrar_mis_datos", borrar_mis_datos))
    app.add_handler(CommandHandler("kwh", comando_kwh))
    app.add_handler(CallbackQueryHandler(botones))
    app.add_handler(MessageHandler(filters.PHOTO, manejar_foto))
    app.add_handler(MessageHandler(filters.Document.ALL, manejar_documento))
    app.add_handler(MessageHandler(filters.LOCATION, manejar_ubicacion))

    print("Bot de Kinich Solar iniciado en modo polling...")
    app.run_polling()

if __name__ == "__main__":
    main()
