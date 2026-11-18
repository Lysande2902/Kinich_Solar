"""
tests/test_api_endpoints.py
Pruebas de integración para los endpoints principales de la API Kinich Solar.
Usa FastAPI TestClient (sin levantar servidor real).
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

# ---------------------------------------------------------------------------
# Cliente de prueba compartido
# ---------------------------------------------------------------------------
client = TestClient(app)

# ---------------------------------------------------------------------------
# Mock del lector de recibo (evitar llamadas reales a Gemini)
# ---------------------------------------------------------------------------
class LectorMock:
    nombre = "mock-lector"

    def leer(self, img_bytes, media_type):
        return {
            "kwh_periodo": 686.0,
            "tarifa": "1D",
            "periodo_inicio": "2026-09-01",
            "periodo_fin": "2026-11-01",
            "total_pagar": 1292.19,
            "legible": True,
        }


@pytest.fixture(autouse=True)
def mock_lector():
    """Sustituye el lector OCR real por un mock en todos los tests."""
    with patch("app.main.lector", LectorMock()):
        yield


# ---------------------------------------------------------------------------
# Helper: registrar consentimiento para un telegram_id de prueba
# ---------------------------------------------------------------------------
def registrar_consentimiento(telegram_id: int):
    return client.post("/api/v1/consentimiento", json={
        "telegram_id": telegram_id,
        "consentimiento": True,
        "version_aviso": "v1.0",
    })


# ===========================================================================
# B-03-01  POST /api/v1/consentimiento
# ===========================================================================
class TestConsentimiento:
    def test_registro_exitoso(self):
        resp = registrar_consentimiento(888001)
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_consentimiento_negado(self):
        resp = client.post("/api/v1/consentimiento", json={
            "telegram_id": 888002,
            "consentimiento": False,
            "version_aviso": "v1.0",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_payload_invalido(self):
        resp = client.post("/api/v1/consentimiento", json={"telegram_id": "no-numero"})
        assert resp.status_code == 422


# ===========================================================================
# B-03-02  POST /api/v1/leer-recibo
# ===========================================================================
class TestLeerRecibo:
    def test_imagen_valida_retorna_datos(self):
        with open("tests/recibo_ejemplo.jpg", "rb") as f:
            img_bytes = f.read()
        resp = client.post(
            "/api/v1/leer-recibo",
            files={"archivo": ("recibo.jpg", img_bytes, "image/jpeg")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "kwh_periodo" in data
        assert "tarifa" in data
        assert data["legible"] is True

    def test_sin_archivo_retorna_422(self):
        resp = client.post("/api/v1/leer-recibo")
        assert resp.status_code == 422


# ===========================================================================
# B-03-03  POST /api/v1/cotizar
# ===========================================================================
class TestCotizar:
    TELEGRAM_ID = 888003

    def setup_method(self):
        registrar_consentimiento(self.TELEGRAM_ID)

    def test_cotizacion_completa(self):
        resp = client.post("/api/v1/cotizar", json={
            "kwh_periodo": 686.0,
            "tarifa": "1D",
            "periodo_inicio": "2026-09-01",
            "periodo_fin": "2026-11-01",
            "total_pagar": 1292.19,
            "telegram_id": self.TELEGRAM_ID,
            "sombra": "ninguna",
            "orientacion": "sur",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "opciones" in data
        assert len(data["opciones"]) == 3
        assert data["opciones"][1]["paneles"] > 0
        assert "retorno_anios" in data["opciones"][1]
        assert data["opciones"][1]["ahorro_mensual"] > 0

    def test_sin_consentimiento_retorna_403(self):
        resp = client.post("/api/v1/cotizar", json={
            "kwh_periodo": 400.0,
            "tarifa": "1C",
            "telegram_id": 999_000_111,  # ID nuevo sin consentimiento
            "sombra": "ninguna",
            "orientacion": "sur",
        })
        assert resp.status_code == 403

    def test_kwh_invalido_retorna_422(self):
        resp = client.post("/api/v1/cotizar", json={
            "kwh_periodo": -100,
            "tarifa": "1C",
            "telegram_id": self.TELEGRAM_ID,
        })
        assert resp.status_code == 422

    def test_retorno_coherente(self):
        """El retorno de inversión debe estar entre 4 y 25 años para un caso típico."""
        resp = client.post("/api/v1/cotizar", json={
            "kwh_periodo": 686.0,
            "tarifa": "1D",
            "total_pagar": 1292.19,
            "telegram_id": self.TELEGRAM_ID,
            "sombra": "ninguna",
            "orientacion": "sur",
        })
        assert resp.status_code == 200
        retorno = resp.json()["recomendado"]["retorno_anios"]
        assert 4 <= retorno <= 25, f"Retorno fuera de rango esperado: {retorno}"


# ===========================================================================
# B-03-04  POST /api/v1/generar-pdf
# ===========================================================================
class TestGenerarPdf:
    COT_PAYLOAD = {
        "cotizacion": {
            "tarifa": "1D",
            "kwh_mes": 343.0,
            "recibo_mes_real": 646.1,
            "tarifa_efectiva_kwh": 1.88,
            "dias_periodo": 60,
            "semaforo": {
                "color": "AMARILLO",
                "titulo": "Inversión conveniente a mediano plazo",
                "mensaje": "Retorno estimado a 8 años."
            },
            "recomendado": {
                "paneles": 5, "kwp": 2.75,
                "costo_min": 55688, "costo_max": 68062,
                "costo_promedio": 61875,
                "ahorro_mensual": 589.0,
                "retorno_anios": 8.8,
                "produccion_anual_kwh": 4310,
            },
            "opciones": [],
            "alertas": [],
        },
        "telegram_id": 999999,
    }

    def test_genera_pdf_binario(self):
        resp = client.post("/api/v1/generar-pdf", json=self.COT_PAYLOAD)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content[:4] == b"%PDF"
        assert len(resp.content) > 1000  # Al menos 1 KB

    def test_pdf_con_cotizacion_minima(self):
        """El endpoint debe funcionar incluso con una cotización vacía."""
        resp = client.post("/api/v1/generar-pdf", json={"cotizacion": {}, "telegram_id": 1})
        assert resp.status_code == 200
        assert resp.content[:4] == b"%PDF"


# ===========================================================================
# B-03-05  DELETE /api/v1/borrar-datos
# ===========================================================================
class TestBorrarDatos:
    TELEGRAM_ID = 888004

    def setup_method(self):
        registrar_consentimiento(self.TELEGRAM_ID)

    def test_borrado_exitoso(self):
        resp = client.delete(f"/api/v1/borrar-datos/{self.TELEGRAM_ID}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_borrado_usuario_inexistente(self):
        resp = client.delete("/api/v1/borrar-datos/999888777")
        assert resp.status_code == 200  # Respuesta graceful, no 404


# ===========================================================================
# B-03-06  POST /api/v1/contacto-asesor
# ===========================================================================
class TestContactoAsesor:
    def test_solicitud_registrada(self):
        registrar_consentimiento(888005)
        resp = client.post("/api/v1/contacto-asesor", json={
            "telegram_id": 888005,
            "detalles": {"tarifa": "1D", "paneles": 5, "kwp": 2.75},
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
