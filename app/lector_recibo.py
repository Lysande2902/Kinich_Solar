import json
import base64
import requests
from abc import ABC, abstractmethod
from jsonschema import validate
from .config import settings
from .schemas import ESQUEMA_RECIBO

PROMPT_SISTEMA = """Eres un extractor de datos de recibos de luz de CFE (México).
Recibirás la foto de UN recibo. Devuelve ÚNICAMENTE un objeto JSON con estas claves:
- kwh_periodo: consumo total en kWh del periodo facturado (número)
- tarifa: tarifa de suministro impresa en el recibo (por ejemplo "1", "1C", "1D", "1F" o "DAC")
- periodo_inicio y periodo_fin: fechas del periodo facturado, formato YYYY-MM-DD
- total_pagar: total a pagar en pesos (número, sin símbolo ni comas)
- legible: true si pudiste leer los 4 campos con seguridad; false si no

Reglas:
- Si un campo no se ve con claridad, pon null en ese campo y legible=false. NUNCA adivines ni inventes cifras.
- No confundas el consumo del periodo con lecturas acumuladas del medidor ni con el historial de consumos anteriores.
- Si la imagen no es un recibo de CFE, devuelve todos los campos en null y legible=false."""

PROMPT_PLACA = """Eres un ingeniero electrico experto en lectura de placas tecnicas de electrodomesticos y aires acondicionados en Mexico.
Analiza la foto de la placa o etiqueta de especificaciones tecnicas y devuelve UNICAMENTE un objeto JSON con estas claves:
- tipo_equipo: texto descriptivo (ej: "Minisplit Aire Acondicionado", "Refrigerador", "Bomba de agua", "Otro")
- marca: marca visible (ej: "Mirage", "Midea", "LG", "Carrier", "Whirlpool", "York", "Samsung") o null
- modelo: modelo visible o null
- tecnologia: "inverter" si indica tecnologia Inverter, o "estandar" si es tradicional On-Off
- potencia_watts: consumo de potencia electrica en Watts (numero). Si la placa indica Amperes (A) y Voltaje (V), calcula Watts = V * A (ej: 220V * 4.2A = 924W). Si no viene especificado calcula una estimacion tipica para ese equipo.
- capacidad_toneladas: si es aire acondicionado, capacidad en toneladas (ej: 1.0 para 12000 BTU, 1.5 para 18000 BTU, 2.0 para 24000 BTU) o null
- legible: true si pudiste identificar el equipo y su consumo aproximado; false si no"""

class LectorRecibo(ABC):
    nombre: str
    @abstractmethod
    def leer(self, imagen: bytes, media_type: str) -> dict: ...
    @abstractmethod
    def leer_placa(self, imagen: bytes, media_type: str) -> dict: ...

class LectorGemini(LectorRecibo):
    def __init__(self):
        self.nombre = settings.GEMINI_MODEL
        self.api_key = settings.GEMINI_API_KEY
        self.modelos_candidatos = [
            settings.GEMINI_MODEL,
            "gemini-3.5-flash",
            "gemini-3.1-flash-lite",
            "gemini-flash-latest",
            "gemini-3.8-flash"
        ]

    def _consultar_gemini(self, prompt: str, imagen: bytes, media_type: str) -> dict:
        b64_img = base64.b64encode(imagen).decode("utf-8")
        ultimo_error = None

        modelos = list(dict.fromkeys(self.modelos_candidatos))
        for m in modelos:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={self.api_key}"
            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": media_type, "data": b64_img}}
                    ]
                }],
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "temperature": 0.0,
                    "max_output_tokens": 500
                }
            }
            try:
                resp = requests.post(url, json=payload, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    texto = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    if texto.startswith("```json"):
                        texto = texto[7:]
                    if texto.startswith("```"):
                        texto = texto[3:]
                    if texto.endswith("```"):
                        texto = texto[:-3]
                    
                    self.nombre = m
                    return json.loads(texto.strip())
                elif resp.status_code in [404, 503, 429]:
                    ultimo_error = f"Modelo {m} respondio {resp.status_code}: {resp.text[:150]}"
                    continue
                else:
                    ultimo_error = f"Error {resp.status_code}: {resp.text[:200]}"
            except Exception as e:
                ultimo_error = str(e)
                continue

        raise RuntimeError(f"No fue posible consultar la API de Gemini: {ultimo_error}")

    def leer(self, imagen: bytes, media_type: str) -> dict:
        datos = self._consultar_gemini(PROMPT_SISTEMA, imagen, media_type)
        validate(instance=datos, schema=ESQUEMA_RECIBO)
        return datos

    def leer_placa(self, imagen: bytes, media_type: str) -> dict:
        return self._consultar_gemini(PROMPT_PLACA, imagen, media_type)

def obtener_lector() -> LectorRecibo:
    return LectorGemini()
