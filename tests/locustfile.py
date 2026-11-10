from locust import HttpUser, task, constant

class UsuarioKinich(HttpUser):
    wait_time = constant(0.5)

    def on_start(self):
        # Asegurar consentimiento previo para este usuario virtual
        self.client.post("/api/v1/consentimiento", json={
            "telegram_id": 99999,
            "consentimiento": True,
            "version_aviso": "v1.0"
        })

    @task
    def cotizar(self):
        self.client.post("/api/v1/cotizar", json={
            "kwh_periodo": 620,
            "tarifa": "1F",
            "periodo_inicio": "2026-09-01",
            "periodo_fin": "2026-10-30",
            "total_pagar": 1800,
            "telegram_id": 99999
        })
