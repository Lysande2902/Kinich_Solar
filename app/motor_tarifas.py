import json
import os
from datetime import date

def cargar_tarifas(ruta="config/tarifas_cfe.json") -> dict:
    if not os.path.exists(ruta):
        raise FileNotFoundError(f"Archivo de tarifas no encontrado en {ruta}")
    with open(ruta, "r", encoding="utf-8") as f:
        return json.load(f)

def kwh_por_mes(kwh_periodo: float, inicio: str | None, fin: str | None) -> float:
    """Convierte el consumo del recibo a kWh/mes usando los días reales del periodo."""
    if not inicio or not fin:
        return round(kwh_periodo / 2, 2)  # Supuesto: bimestre estándar (2 meses)
    try:
        d_inicio = date.fromisoformat(inicio)
        d_fin = date.fromisoformat(fin)
    except (ValueError, TypeError):
        return round(kwh_periodo / 2, 2)

    dias = (d_fin - d_inicio).days
    if dias <= 0:
        raise ValueError(f"Periodo inválido: {inicio} a {fin} ({dias} días)")
    return round(kwh_periodo * 30.4 / dias, 2)

def costo_mensual(kwh_mes: float, tarifa: str, cfg: dict) -> float:
    """Costo mensual con IVA para una tarifa subsidiada o DAC."""
    if tarifa not in cfg["tarifas"]:
        raise ValueError(f"Tarifa no soportada: {tarifa}")
    
    t = cfg["tarifas"][tarifa]
    if tarifa == "DAC":
        base = t["cargo_fijo_mes"] + kwh_mes * t["precio_kwh"]
    else:
        base, restante, previo = 0.0, kwh_mes, 0.0
        for b in t["bloques"]:
            tope = b["hasta_kwh_mes"]
            tramo = restante if tope is None else min(restante, tope - previo)
            base += max(tramo, 0.0) * b["precio"]
            restante -= max(tramo, 0.0)
            if tope is None or restante <= 0:
                break
            previo = tope
        base = max(base, cfg.get("cargo_minimo_mes", 40.0))
        
    return round(base * (1 + cfg.get("iva", 0.16)), 2)

def hay_riesgo_dac(kwh_mes: float, tarifa: str, cfg: dict) -> bool:
    """Verifica si el consumo está al 90% o más del umbral DAC."""
    if tarifa == "DAC":
        return True
    lim = cfg.get("tarifas", {}).get(tarifa, {}).get("dac_limite_kwh_mes")
    return bool(lim and kwh_mes >= 0.9 * lim)
