from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

ESQUEMA_RECIBO = {
    "type": "object",
    "required": ["kwh_periodo", "tarifa", "periodo_inicio", "periodo_fin", "total_pagar", "legible"],
    "properties": {
        "kwh_periodo":    {"type": ["number", "null"], "minimum": 0},
        "tarifa":         {"type": ["string", "null"]},
        "periodo_inicio": {"type": ["string", "null"]},
        "periodo_fin":    {"type": ["string", "null"]},
        "total_pagar":    {"type": ["number", "null"], "minimum": 0},
        "legible":        {"type": "boolean"},
    },
    "additionalProperties": False,
}

class DatosRecibo(BaseModel):
    kwh_periodo: Optional[float] = None
    tarifa: Optional[str] = None
    periodo_inicio: Optional[str] = None
    periodo_fin: Optional[str] = None
    total_pagar: Optional[float] = None
    legible: bool = False

class SolicitudCotizar(BaseModel):
    kwh_periodo: float = Field(..., gt=0)
    tarifa: str
    periodo_inicio: Optional[str] = None
    periodo_fin: Optional[str] = None
    total_pagar: Optional[float] = None
    telegram_id: int
    sombra: str = "ninguna"
    orientacion: str = "sur"
    tipo_techo: Optional[str] = "losa"
    lat: Optional[float] = None
    lon: Optional[float] = None

class SolicitudConsentimiento(BaseModel):
    telegram_id: int
    consentimiento: bool
    version_aviso: str = "v1.0"

class SolicitudContactoAsesor(BaseModel):
    telegram_id: int
    recibo_id: Optional[int] = None
    detalles: Optional[Dict[str, Any]] = None

class SolicitudFeedback(BaseModel):
    telegram_id: int
    recibo_id: Optional[int] = None
    calificacion: str  # "positivo" o "negativo"
    comentarios: Optional[str] = None
