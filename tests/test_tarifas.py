import pytest
from app.motor_tarifas import cargar_tarifas, kwh_por_mes, costo_mensual, hay_riesgo_dac

@pytest.fixture
def cfg():
    return cargar_tarifas("config/tarifas_cfe.json")

def test_01_kwh_por_mes_bimestre_normal():
    # 60.8 días aprox 2 meses -> 608 kWh son ~304 kWh/mes
    res = kwh_por_mes(608, "2026-01-01", "2026-03-03")
    assert 295 <= res <= 315

def test_02_kwh_por_mes_un_mes():
    # 30.4 días -> debe dar exactamente los mismos kWh
    res = kwh_por_mes(300, "2026-04-01", "2026-05-01")
    assert 290 <= res <= 310

def test_03_kwh_por_mes_sin_fechas():
    # Sin fechas asume bimestre (divide entre 2)
    res = kwh_por_mes(500, None, None)
    assert res == 250.0

def test_04_kwh_por_mes_periodo_invalido():
    with pytest.raises(ValueError):
        kwh_por_mes(500, "2026-05-01", "2026-04-01")

def test_05_tarifa_1_basico(cfg):
    # Consumo 50 kWh: 50 * 1.05 = 52.50 + 16% IVA = 60.90
    costo = costo_mensual(50, "1", cfg)
    assert costo == round(52.50 * 1.16, 2)

def test_06_tarifa_1_intermedio(cfg):
    # 100 kWh: 75 * 1.05 + 25 * 1.28 = 78.75 + 32.0 = 110.75 + IVA
    costo = costo_mensual(100, "1", cfg)
    assert costo == round(110.75 * 1.16, 2)

def test_07_tarifa_1_excedente(cfg):
    # 200 kWh: 75*1.05 + 65*1.28 + 60*3.75 = 78.75 + 83.20 + 225.0 = 386.95 + IVA
    costo = costo_mensual(200, "1", cfg)
    assert costo == round(386.95 * 1.16, 2)

def test_08_tarifa_cargo_minimo(cfg):
    # 0 kWh debe cobrar al menos el cargo mínimo
    costo = costo_mensual(0, "1", cfg)
    assert costo >= round(cfg["cargo_minimo_mes"] * (1 + cfg["iva"]), 2)

def test_09_tarifa_1b_basico(cfg):
    costo = costo_mensual(100, "1B", cfg)
    assert costo == round(100 * 0.98 * 1.16, 2)

def test_10_tarifa_1b_excedente(cfg):
    costo = costo_mensual(250, "1B", cfg)
    # 125 * 0.98 + 100 * 1.20 + 25 * 3.65 = 122.5 + 120.0 + 91.25 = 333.75 * 1.16
    assert costo == round(333.75 * 1.16, 2)

def test_11_tarifa_1c_basico(cfg):
    costo = costo_mensual(120, "1C", cfg)
    assert costo == round(120 * 0.92 * 1.16, 2)

def test_12_tarifa_1c_intermedio(cfg):
    costo = costo_mensual(200, "1C", cfg)
    # 150*0.92 + 50*1.15 = 138.0 + 57.5 = 195.5 * 1.16
    assert costo == round(195.5 * 1.16, 2)

def test_13_tarifa_1c_excedente(cfg):
    costo = costo_mensual(400, "1C", cfg)
    # 150*0.92 + 150*1.15 + 100*3.60 = 138 + 172.5 + 360 = 670.5 * 1.16
    assert costo == round(670.5 * 1.16, 2)

def test_14_tarifa_1f_basico(cfg):
    costo = costo_mensual(200, "1F", cfg)
    assert costo == round(200 * 0.80 * 1.16, 2)

def test_15_tarifa_1f_intermedio(cfg):
    costo = costo_mensual(500, "1F", cfg)
    # 300*0.80 + 200*0.95 = 240 + 190 = 430 * 1.16
    assert costo == round(430.0 * 1.16, 2)

def test_16_tarifa_1f_excedente(cfg):
    costo = costo_mensual(1500, "1F", cfg)
    # 300*0.80 + 900*0.95 + 300*3.50 = 240 + 855 + 1050 = 2145 * 1.16
    assert costo == round(2145.0 * 1.16, 2)

def test_17_tarifa_dac(cfg):
    # DAC: cargo fijo 140 + 600 * 5.85 = 140 + 3510 = 3650 * 1.16 = 4234.0
    costo = costo_mensual(600, "DAC", cfg)
    assert costo == round(3650.0 * 1.16, 2)

def test_18_riesgo_dac_bajo(cfg):
    # Tarifa 1C límite es 850, 90% es 765. 500 kWh no tiene riesgo
    assert hay_riesgo_dac(500, "1C", cfg) is False

def test_19_riesgo_dac_alto(cfg):
    # 800 kWh en 1C supera el 90% (765)
    assert hay_riesgo_dac(800, "1C", cfg) is True

def test_20_riesgo_dac_siempre_en_dac(cfg):
    assert hay_riesgo_dac(100, "DAC", cfg) is True

def test_21_tarifa_desconocida_error(cfg):
    with pytest.raises(ValueError):
        costo_mensual(200, "TARIFA_INVENTADA", cfg)
