from datetime import date
from .motor_tarifas import cargar_tarifas, kwh_por_mes, costo_mensual, hay_riesgo_dac
from .simulacion_solar import calcular_opciones_sistema, LAT_DEFAULT, LON_DEFAULT

DIAS_ALERTA_TARIFAS = 60

def antiguedad_tarifas_dias(cfg: dict) -> int:
    version = cfg.get("version", "")
    if not version or len(version) < 10:
        return 999
    try:
        fecha_vigencia = date.fromisoformat(version[:10])
        return (date.today() - fecha_vigencia).days
    except (ValueError, TypeError):
        return 999

def evaluar_semaforo(retorno_anios: float | None, tarifa: str) -> dict:
    if tarifa.upper() == "DAC":
        return {
            "color": "VERDE",
            "nivel": "Excelente viabilidad",
            "indicador": "[Viable hoy]",
            "titulo": "Tarifa Doméstica de Alto Consumo (DAC)",
            "mensaje": (
                "Tu servicio se encuentra en tarifa DAC, donde CFE retira todo subsidio gubernamental "
                "y el costo por cada kilowatt-hora se triplica. Instalar paneles solares es la decisión "
                "más rentable en este caso: te permite salir de DAC de inmediato y recuperar la inversión en tiempo mínimo."
            )
        }
    if retorno_anios is None:
        return {
            "color": "ROJO",
            "nivel": "No recomendado",
            "indicador": "[No rentable]",
            "titulo": "Consumo insuficiente para retorno medible",
            "mensaje": (
                "El consumo reportado es muy bajo o no genera suficiente diferencia económica mensual "
                "para amortizar un sistema interconectado."
            )
        }
    if retorno_anios <= 6.5:
        return {
            "color": "VERDE",
            "nivel": "Alta viabilidad",
            "indicador": "[Viable hoy]",
            "titulo": "Inversión altamente conveniente",
            "mensaje": (
                f"El tiempo estimado de recuperación es de {retorno_anios:.1f} años. "
                "Tu nivel de consumo actual genera un ahorro mensual contundente que amortiza la instalación con rapidez."
            )
        }
    elif retorno_anios <= 10.0:
        return {
            "color": "AMARILLO",
            "nivel": "Viabilidad media",
            "indicador": "[Viable con ajustes]",
            "titulo": "Inversión conveniente a mediano plazo",
            "mensaje": (
                f"El tiempo estimado de recuperación es de {retorno_anios:.1f} años. "
                "Este es el rango habitual en tarifas residenciales subsidiadas. El beneficio central "
                "es blindar la economía de tu hogar contra los incrementos anuales en las tarifas de CFE."
            )
        }
    else:
        return {
            "color": "ROJO",
            "nivel": "Baja viabilidad",
            "indicador": "[Revisar eficiencia primero]",
            "titulo": "Proyecto a largo plazo",
            "mensaje": (
                f"El tiempo proyectado de recuperación supera los 10 años ({retorno_anios:.1f} años). "
                "CFE actualmente subsidia la mayor parte de tu energía. Te sugerimos evaluar primero "
                "el mantenimiento o renovación de equipos de aire acondicionado y aislamiento térmico antes de instalar paneles."
            )
        }

def cotizar(
    kwh_periodo: float,
    tarifa: str,
    inicio: str | None,
    fin: str | None,
    total_pagar: float | None,
    producto: dict,
    sombra: str = "ninguna",
    orientacion: str = "sur",
    lat: float = LAT_DEFAULT,
    lon: float = LON_DEFAULT
) -> dict:
    cfg = cargar_tarifas()
    alertas = []
    
    # 1. Normalización de días y consumo mensual
    dias = 60
    if inicio and fin:
        try:
            d_inicio = date.fromisoformat(inicio)
            d_fin = date.fromisoformat(fin)
            calc_dias = (d_fin - d_inicio).days
            if calc_dias > 0:
                dias = calc_dias
        except Exception:
            alertas.append("No fue posible leer con exactitud las fechas del periodo; se calculó bajo un bimestre estándar de 60 días.")
    else:
        alertas.append("No fue posible leer con exactitud las fechas del periodo; se calculó bajo un bimestre estándar de 60 días.")

    kwh_mes = round((kwh_periodo / dias) * 30.4, 1)

    # 2. Gasto real mensual del usuario
    if total_pagar and total_pagar > 0:
        recibo_mes_real = round((total_pagar / dias) * 30.4, 2)
        tarifa_efectiva_kwh = round(total_pagar / kwh_periodo, 2)
    else:
        recibo_mes_real = costo_mensual(kwh_mes, tarifa, cfg)
        tarifa_efectiva_kwh = round(recibo_mes_real / max(1, kwh_mes), 2)

    # 3. Alertas de tarifas y DAC
    dias_ant = antiguedad_tarifas_dias(cfg)
    if dias_ant > DIAS_ALERTA_TARIFAS:
        alertas.append(
            f"El cálculo utiliza la tabla de tarifas CFE con fecha {cfg.get('version')}. "
            "Se aconseja confirmar en cfe.mx posibles ajustes menores recientes."
        )

    if hay_riesgo_dac(kwh_mes, tarifa, cfg):
        alertas.append(
            "Atención: Tu consumo promedio se encuentra cerca del umbral de Tarifa DAC. "
            "Rebasar ese límite causaría la pérdida del subsidio gubernamental y un aumento drástico en tus siguientes recibos."
        )

    # 4. Cálculo de las 3 opciones de sistema (80%, 90% y 100%)
    simulacion = calcular_opciones_sistema(
        kwh_mes=kwh_mes,
        panel_w=producto["potencia_w"],
        precio_wp=producto["precio_wp_mxn"],
        sombra=sombra,
        orientacion=orientacion,
        lat=lat,
        lon=lon
    )

    opciones_evaluadas = []
    cargo_minimo = cfg.get("cargo_minimo_mes", 40.0)

    for op in simulacion["opciones"]:
        cob_ratio = min(op["cobertura_real_pct"] / 100.0, 1.0)
        # Factor 0.90: con interconexión CFE siempre queda cargo mínimo, medidor bidireccional o DAP
        ahorro_teorico = recibo_mes_real * cob_ratio * 0.90
        # TOPE: el ahorro mensual nunca puede rebasar lo que el usuario paga mensualmente
        ahorro_mes = round(min(ahorro_teorico, max(0.0, recibo_mes_real - cargo_minimo)), 2)
        
        retorno = round(op["costo_promedio"] / (ahorro_mes * 12.0), 1) if ahorro_mes > 0 else None

        opciones_evaluadas.append({
            **op,
            "ahorro_mensual": ahorro_mes,
            "retorno_anios": retorno
        })

    # Tomar la opción intermedia (Recomendado 90%) como referencia principal
    opcion_recomendada = opciones_evaluadas[1] if len(opciones_evaluadas) > 1 else opciones_evaluadas[0]
    semaforo = evaluar_semaforo(opcion_recomendada["retorno_anios"], tarifa)

    return {
        "kwh_mes": kwh_mes,
        "recibo_mes_real": recibo_mes_real,
        "tarifa_efectiva_kwh": tarifa_efectiva_kwh,
        "dias_periodo": dias,
        "opciones": opciones_evaluadas,
        "recomendado": opcion_recomendada,
        "semaforo": semaforo,
        "fuente_irradiacion": simulacion["fuente_irradiacion"],
        "rendimiento_efectivo_kwh_kwp": simulacion["rendimiento_efectivo_kwh_kwp"],
        "perdida_estimada_pct": simulacion["perdida_estimada_pct"],
        "alertas": alertas,
        "version_tarifas": cfg.get("version", "2026-11-01")
    }
