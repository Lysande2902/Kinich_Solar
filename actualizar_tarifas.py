"""
actualizar_tarifas.py
======================
Script interactivo para actualizar las tarifas CFE en config/tarifas_cfe.json
cuando CFE publica nuevas tarifas (aproximadamente cada bimestre).

Fuente oficial: https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas1.aspx
También puedes verificar en un recibo real: "Precio por kWh" de cada bloque.

Uso:
    python actualizar_tarifas.py

El script crea una copia de respaldo del JSON anterior y guarda el nuevo.
"""

import json
import shutil
import os
from datetime import date

RUTA = "config/tarifas_cfe.json"
RUTA_BACKUP = "config/tarifas_cfe.backup.json"

def pedir_float(prompt, actual=None):
    """Pide un número decimal al usuario, mostrando el valor actual."""
    if actual is not None:
        prompt = f"{prompt} [actual: {actual}]: "
    else:
        prompt = f"{prompt}: "
    while True:
        try:
            val = input(prompt).strip()
            if not val and actual is not None:
                return actual
            return float(val)
        except ValueError:
            print("  ✗ Ingresa un número válido (ej: 1.25)")


def pedir_int(prompt, actual=None):
    if actual is not None:
        prompt = f"{prompt} [actual: {actual}]: "
    else:
        prompt = f"{prompt}: "
    while True:
        try:
            val = input(prompt).strip()
            if not val and actual is not None:
                return actual
            return int(val)
        except ValueError:
            print("  ✗ Ingresa un número entero.")


def main():
    print("=" * 60)
    print("  ACTUALIZADOR DE TARIFAS CFE — Kinich Solar")
    print("=" * 60)
    print()
    print("Fuente oficial de tarifas:")
    print("  https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas1.aspx")
    print()

    # Cargar tarifas actuales como referencia
    cfg_actual = {}
    if os.path.exists(RUTA):
        with open(RUTA, "r", encoding="utf-8") as f:
            cfg_actual = json.load(f)
        print(f"Tarifas actuales con fecha: {cfg_actual.get('version', 'desconocida')}")
    else:
        print("No existe archivo de tarifas previo. Se creará desde cero.")
    print()

    fecha_hoy = date.today().isoformat()
    fecha_vigencia = input(f"¿Fecha de vigencia de las nuevas tarifas? [Enter = {fecha_hoy}]: ").strip() or fecha_hoy

    print()
    print("─" * 60)
    print("CONFIGURACIÓN GENERAL")
    print("─" * 60)
    iva = pedir_float("IVA (ej: 0.16 para 16%)", cfg_actual.get("iva", 0.16))
    cargo_minimo = pedir_float("Cargo mínimo mensual (MXN, sin IVA)", cfg_actual.get("cargo_minimo_mes", 40.0))

    tarifas_nuevas = {}
    tarifas_actuales = cfg_actual.get("tarifas", {})

    NOMBRES_TARIFAS = {
        "1":  "Tarifa 1 (zona templada < 2000 m, verano ≤ 300 kWh/mes)",
        "1B": "Tarifa 1B (semitemplada)",
        "1C": "Tarifa 1C (semiárida, verano ≤ 850 kWh/mes) ← Yucatán zona",
        "1D": "Tarifa 1D (árida, verano ≤ 1000 kWh/mes) ← Yucatán verano",
        "1E": "Tarifa 1E (muy árida)",
        "1F": "Tarifa 1F (extremadamente árida, verano ≤ 2500 kWh/mes)",
        "DAC": "DAC (Alto Consumo — tarifa de castigo)",
    }

    for clave, descripcion in NOMBRES_TARIFAS.items():
        print()
        print(f"─" * 60)
        print(f"  {descripcion}")
        print(f"─" * 60)
        incluir = input(f"¿Incluir tarifa {clave}? [S/n]: ").strip().lower()
        if incluir == "n":
            continue

        t_actual = tarifas_actuales.get(clave, {})

        if clave == "DAC":
            cargo_fijo = pedir_float("  Cargo fijo mensual DAC (sin IVA)", t_actual.get("cargo_fijo_mes"))
            precio_kwh = pedir_float("  Precio por kWh DAC (sin IVA)", t_actual.get("precio_kwh"))
            tarifas_nuevas[clave] = {
                "cargo_fijo_mes": cargo_fijo,
                "precio_kwh": precio_kwh
            }
        else:
            bloques_actuales = t_actual.get("bloques", [])
            print(f"  Bloques de consumo para {clave} (bloque escalonado):")
            print(f"  Ingresa cada bloque: límite en kWh/mes y precio sin IVA.")
            print(f"  Para el bloque 'excedente' escribe 0 como límite (sin tope).")

            bloques_nuevos = []
            for i in range(5):
                b_actual = bloques_actuales[i] if i < len(bloques_actuales) else {}
                lim_actual = b_actual.get("hasta_kwh_mes")
                precio_actual = b_actual.get("precio")

                lim_str = input(f"  Bloque {i+1} — Hasta kWh/mes [actual: {lim_actual}, 0=excedente final, vacío=fin]: ").strip()
                if lim_str == "":
                    break
                lim = None if lim_str == "0" else int(lim_str)
                precio = pedir_float(f"  Bloque {i+1} — Precio por kWh (sin IVA)", precio_actual)
                bloques_nuevos.append({"hasta_kwh_mes": lim, "precio": precio})
                if lim is None:
                    break

            dac_lim = t_actual.get("dac_limite_kwh_mes")
            dac_lim_nuevo = pedir_int(f"  Límite mensual DAC para {clave} (kWh/mes promedio anual)", dac_lim)
            tarifas_nuevas[clave] = {
                "bloques": bloques_nuevos,
                "dac_limite_kwh_mes": dac_lim_nuevo
            }

    cfg_nueva = {
        "version": fecha_vigencia,
        "iva": iva,
        "cargo_minimo_mes": cargo_minimo,
        "tarifas": tarifas_nuevas,
        "_nota": "Fuente: CFE/CRE. Actualizar cuando CFE publique nuevas tarifas."
    }

    print()
    print("─" * 60)
    print("RESUMEN DE TARIFAS A GUARDAR:")
    print(json.dumps(cfg_nueva, indent=2, ensure_ascii=False))
    print("─" * 60)
    confirmar = input("\n¿Guardar estas tarifas? [S/n]: ").strip().lower()
    if confirmar == "n":
        print("Cancelado. No se guardaron cambios.")
        return

    # Respaldar el archivo anterior
    if os.path.exists(RUTA):
        shutil.copy(RUTA, RUTA_BACKUP)
        print(f"✓ Respaldo guardado en: {RUTA_BACKUP}")

    with open(RUTA, "w", encoding="utf-8") as f:
        json.dump(cfg_nueva, f, indent=2, ensure_ascii=False)

    print(f"✓ Tarifas actualizadas en: {RUTA}")
    print(f"  Versión: {fecha_vigencia}")
    print()
    print("PRÓXIMOS PASOS:")
    print("  1. Verifica ejecutando: python -m pytest tests/test_tarifas.py")
    print("  2. Revisa que el motor reproduzca el total del recibo de prueba (±15%).")
    print("  3. Vuelve a registrar la versión en la BD: uvicorn app.main:app (re-inicializa la tabla tarifas).")

if __name__ == "__main__":
    main()
