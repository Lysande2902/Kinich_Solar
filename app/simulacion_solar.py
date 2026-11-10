import math
import json
import os
import requests

LAT_DEFAULT, LON_DEFAULT = 20.97, -89.62  # Mérida, Yucatán
RESPALDO_KWH_KWP_ANIO = 1600.0            # Respaldo conservador para península de Yucatán
CACHE_FILE = "data/pvgis_cache.json"

FACTOR_SOMBRA = {
    "ninguna": 0.00,
    "poca": 0.07,
    "moderada": 0.15,
    "mucha": 0.30
}

FACTOR_ORIENTACION = {
    "sur": 0.00,
    "este": 0.08,
    "oeste": 0.08,
    "norte": 0.25,
    "no_se": 0.05
}

def rendimiento_kwh_kwp_pvgis(lat: float = LAT_DEFAULT, lon: float = LON_DEFAULT,
                              inclinacion: int = 15, azimut: int = 0) -> tuple[float, str]:
    """
    Obtiene los kWh anuales por kWp instalado usando la API oficial de PVGIS.
    azimut: 0 = Sur (convención PVGIS v5.2).
    """
    clave_cache = f"{round(lat, 2)}_{round(lon, 2)}_{inclinacion}_{azimut}"
    
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
                if clave_cache in cache:
                    return float(cache[clave_cache]), "PVGIS (caché)"
        except Exception:
            pass

    try:
        url = "https://re.jrc.ec.europa.eu/api/v5_2/PVcalc"
        params = {
            "lat": lat,
            "lon": lon,
            "peakpower": 1,
            "loss": 14,
            "angle": inclinacion,
            "aspect": azimut,
            "outputformat": "json"
        }
        resp = requests.get(url, params=params, timeout=12)
        if resp.status_code == 200:
            data = resp.json()
            kwh = float(data["outputs"]["totals"]["fixed"]["E_y"])
            
            # Guardar en caché
            cache = {}
            if os.path.exists(CACHE_FILE):
                try:
                    with open(CACHE_FILE, "r", encoding="utf-8") as f:
                        cache = json.load(f)
                except Exception:
                    pass
            cache[clave_cache] = round(kwh, 2)
            os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(cache, f)
                
            return round(kwh, 2), "PVGIS"
    except Exception:
        pass

    return RESPALDO_KWH_KWP_ANIO, "RESPALDO"

def calcular_opciones_sistema(
    kwh_mes: float,
    panel_w: int,
    precio_wp: float,
    sombra: str = "ninguna",
    orientacion: str = "sur",
    lat: float = LAT_DEFAULT,
    lon: float = LON_DEFAULT,
    coberturas: tuple = (0.80, 0.90, 1.00),
    incertidumbre: float = 0.10
) -> dict:
    """
    Genera 3 opciones de tamaño de sistema fotovoltaico (80%, 90% y 100% de cobertura).
    Aplica penalizaciones por sombras y orientación del techo.
    """
    rend_base, fuente = rendimiento_kwh_kwp_pvgis(lat=lat, lon=lon)
    
    perdida_sombra = FACTOR_SOMBRA.get(sombra.lower(), 0.0)
    perdida_orientacion = FACTOR_ORIENTACION.get(orientacion.lower(), 0.0)
    perdida_total = min(0.45, perdida_sombra + perdida_orientacion)
    
    rend_efectivo = rend_base * (1.0 - perdida_total)
    consumo_anual = kwh_mes * 12.0
    
    opciones = []
    for cob in coberturas:
        kwp_necesario = (consumo_anual * cob) / rend_efectivo
        paneles = max(1, math.ceil(kwp_necesario * 1000.0 / panel_w))
        kwp = round(paneles * panel_w / 1000.0, 2)
        prod_anual = round(kwp * rend_efectivo)
        prod_mensual = round(prod_anual / 12.0)
        cobertura_real = round((prod_anual / consumo_anual) * 100, 1) if consumo_anual > 0 else 100.0
        
        costo_centro = kwp * 1000.0 * precio_wp
        costo_min = round(costo_centro * (1.0 - incertidumbre))
        costo_max = round(costo_centro * (1.0 + incertidumbre))

        etiqueta = "Básico (80%)" if cob == 0.8 else ("Recomendado (90%)" if cob == 0.9 else "Completo (100%)")

        opciones.append({
            "objetivo_cobertura": cob,
            "etiqueta": etiqueta,
            "paneles": paneles,
            "kwp": kwp,
            "produccion_anual_kwh": prod_anual,
            "produccion_mensual_kwh": prod_mensual,
            "cobertura_real_pct": cobertura_real,
            "costo_min": costo_min,
            "costo_max": costo_max,
            "costo_promedio": round(costo_centro)
        })

    return {
        "opciones": opciones,
        "fuente_irradiacion": fuente,
        "rendimiento_base_kwh_kwp": rend_base,
        "rendimiento_efectivo_kwh_kwp": round(rend_efectivo, 1),
        "perdida_estimada_pct": round(perdida_total * 100, 1),
        "consumo_anual_kwh": round(consumo_anual)
    }
