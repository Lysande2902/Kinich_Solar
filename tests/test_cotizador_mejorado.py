import pytest
from app.cotizador import cotizar, evaluar_semaforo
from app.main import preparar_imagen
from app.simulacion_solar import FACTOR_SOMBRA, FACTOR_ORIENTACION

@pytest.fixture
def producto_base():
    return {
        "nombre": "Canadian Solar 550W",
        "potencia_w": 550,
        "precio_wp_mxn": 22.50
    }

def test_tope_ahorro_inquebrantable(producto_base):
    """Verifica que el ahorro mensual NUNCA sea mayor a lo que se paga en el recibo en 20 consumos distintos."""
    consumos = [150, 250, 400, 600, 800, 1000, 1354, 1500, 2000, 2500]
    tarifas = ["1", "1C", "1D", "1F"]
    
    for c in consumos:
        for t in tarifas:
            pago = c * 2.10
            res = cotizar(
                kwh_periodo=c,
                tarifa=t,
                inicio="2026-08-01",
                fin="2026-09-30",
                total_pagar=pago,
                producto=producto_base
            )
            for op in res["opciones"]:
                assert op["ahorro_mensual"] <= res["recibo_mes_real"], (
                    f"Fallo en {c} kWh, {t}: ahorro {op['ahorro_mensual']} > recibo {res['recibo_mes_real']}"
                )

def test_tres_opciones_generadas(producto_base):
    res = cotizar(
        kwh_periodo=1354,
        tarifa="1D",
        inicio="2026-08-03",
        fin="2026-09-30",
        total_pagar=2550.38,
        producto=producto_base
    )
    assert len(res["opciones"]) == 3
    op80, op90, op100 = res["opciones"]
    assert op80["objetivo_cobertura"] == 0.80
    assert op90["objetivo_cobertura"] == 0.90
    assert op100["objetivo_cobertura"] == 1.00
    assert op80["paneles"] <= op90["paneles"] <= op100["paneles"]

def test_semaforo_dac():
    sem = evaluar_semaforo(4.0, "DAC")
    assert sem["color"] == "VERDE"
    assert "DAC" in sem["titulo"]

def test_semaforo_rangos():
    assert evaluar_semaforo(5.5, "1C")["color"] == "VERDE"
    assert evaluar_semaforo(8.5, "1D")["color"] == "AMARILLO"
    assert evaluar_semaforo(11.2, "1F")["color"] == "ROJO"

def test_perdida_sombras_y_orientacion(producto_base):
    res_limpio = cotizar(1000, "1C", "2026-01-01", "2026-03-01", 2000, producto_base, sombra="ninguna", orientacion="sur")
    res_sombra = cotizar(1000, "1C", "2026-01-01", "2026-03-01", 2000, producto_base, sombra="moderada", orientacion="este")
    
    assert res_sombra["perdida_estimada_pct"] > res_limpio["perdida_estimada_pct"]
    assert res_sombra["opciones"][1]["paneles"] >= res_limpio["opciones"][1]["paneles"]
