import csv
import sys
import time
import os
from app.lector_recibo import obtener_lector
from app.main import preparar_imagen

def main(csv_path="data/etiquetas.csv", carpeta="data/recibos_prueba"):
    if not os.path.exists(csv_path):
        print(f"Error: no existe el archivo de etiquetas en {csv_path}")
        sys.exit(1)

    lector = obtener_lector()
    ok_kwh, ok_tar, n, errores = 0, 0, 0, []

    with open(csv_path, mode="r", encoding="utf-8") as f:
        lector_csv = list(csv.DictReader(f))

    if not lector_csv:
        print("El archivo de etiquetas está vacío.")
        sys.exit(0)

    print(f"Evaluando {len(lector_csv)} recibos de prueba con {lector.nombre}...")

    for fila in lector_csv:
        n += 1
        ruta_archivo = os.path.join(carpeta, fila["archivo"])
        if not os.path.exists(ruta_archivo):
            errores.append((fila["archivo"], "Archivo de imagen no encontrado"))
            continue

        time.sleep(7)  # Respetar límite de tasa por minuto de Gemini gratuito

        try:
            with open(ruta_archivo, "rb") as img_f:
                raw_bytes = img_f.read()
            img_bytes, media_type = preparar_imagen(raw_bytes)
            res = lector.leer(img_bytes, media_type)
        except Exception as e:
            errores.append((fila["archivo"], f"Excepción al leer: {str(e)}"))
            continue

        # Validar kWh con tolerancia ±1
        kwh_leido = res.get("kwh_periodo")
        kwh_esperado = float(fila["kwh"])
        if kwh_leido is not None and abs(kwh_leido - kwh_esperado) <= 1:
            ok_kwh += 1
        else:
            errores.append((fila["archivo"], f"kWh leído={kwh_leido} esperado={kwh_esperado}"))

        # Validar tarifa exacta
        tarifa_leida = (res.get("tarifa") or "").strip().upper()
        tarifa_esperada = (fila.get("tarifa") or "").strip().upper()
        if tarifa_leida == tarifa_esperada:
            ok_tar += 1
        else:
            errores.append((fila["archivo"], f"Tarifa leída='{tarifa_leida}' esperada='{tarifa_esperada}'"))

    pct_kwh = (ok_kwh / n) * 100 if n > 0 else 0
    pct_tar = (ok_tar / n) * 100 if n > 0 else 0

    print("\n" + "=" * 50)
    print(f"RESULTADOS DE EVALUACIÓN:")
    print(f"• Total recibos evaluados: {n}")
    print(f"• Precisión kWh (±1 kWh): {ok_kwh}/{n} ({pct_kwh:.1f}%)")
    print(f"• Precisión Tarifa: {ok_tar}/{n} ({pct_tar:.1f}%)")
    print("=" * 50)

    if errores:
        print("\nDetalle de discrepancias / errores:")
        for archivo, error in errores:
            print(f"  ✗ [{archivo}]: {error}")

    cumple = (ok_kwh / n >= 0.95) and (ok_tar / n >= 0.95) if n > 0 else False
    if cumple:
        print("\n✅ Criterio de aceptación EDT 1.2.1 CUMPLIDO (≥ 95% precisión).")
        sys.exit(0)
    else:
        print("\n⚠️ Criterio de aceptación EDT 1.2.1 NO alcanzado (< 95%). Revisar prompt o calidad de fotos.")
        sys.exit(1)

if __name__ == "__main__":
    main()
