import os
import glob
from fastapi.testclient import TestClient
from app.main import app

def test_imagen_no_queda_en_ningun_lado(monkeypatch):
    class LectorFalso:
        nombre = "gemini-test-mock"
        def leer(self, *_):
            return {
                "kwh_periodo": 500.0,
                "tarifa": "1F",
                "periodo_inicio": "2026-01-01",
                "periodo_fin": "2026-03-01",
                "total_pagar": 900.0,
                "legible": True
            }

    monkeypatch.setattr("app.main.lector", LectorFalso())
    client = TestClient(app)
    
    with open("tests/recibo_ejemplo.jpg", "rb") as f:
        img_bytes = f.read()

    db_file = os.environ.get("DB_PATH", "kinich.db")

    for i in range(30):
        archivos_local_antes = set(glob.glob("*.jpg") + glob.glob("*.png"))

        resp = client.post(
            "/api/v1/leer-recibo",
            files={"archivo": ("recibo.jpg", img_bytes, "image/jpeg")}
        )
        assert resp.status_code == 200
        assert resp.json()["legible"] is True

        archivos_local_despues = set(glob.glob("*.jpg") + glob.glob("*.png")) - archivos_local_antes
        assert not archivos_local_despues, f"Se crearon imágenes en el directorio local: {archivos_local_despues}"

        # Verificar que el contenido binario de la imagen nunca se escribió en la base de datos
        if os.path.exists(db_file):
            with open(db_file, "rb") as db_f:
                contenido_db = db_f.read()
                assert b"\xff\xd8\xff" not in contenido_db, "¡Se detectó firma binaria JPEG dentro de la base de datos!"
