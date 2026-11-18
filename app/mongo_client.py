"""
Módulo de integración con MongoDB (compatible con MongoDB Compass).
Persiste clientes, recibos, cotizaciones y eventos en la base de datos local 'Kinich'.
Si MongoDB no responde o está deshabilitado, el sistema continúa funcionando sin interrumpir el servicio.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pymongo import MongoClient, DESCENDING
from .config import settings

logger = logging.getLogger(__name__)

class MongoDBClient:
    def __init__(self):
        self.uri = settings.MONGO_URI
        self.db_name = settings.MONGO_DB_NAME
        self._client: Optional[MongoClient] = None
        self._db = None

    @property
    def db(self):
        if self._db is None and self.uri:
            try:
                self._client = MongoClient(self.uri, serverSelectionTimeoutMS=2000)
                self._db = self._client[self.db_name]
            except Exception as e:
                logger.warning(f"No se pudo conectar a MongoDB: {e}")
                self._db = None
        return self._db

    def is_connected(self) -> bool:
        try:
            if self.db is not None:
                self.db.command('ping')
                return True
        except Exception:
            pass
        return False

    def registrar_cliente(self, telegram_id: int, consentimiento: int, version_aviso: str = "v1.0") -> bool:
        """Registra o actualiza un cliente y su consentimiento."""
        try:
            if self.db is not None:
                self.db.clientes.update_one(
                    {"telegram_id": telegram_id},
                    {
                        "$set": {
                            "consentimiento": consentimiento,
                            "version_aviso": version_aviso,
                            "actualizado_en": datetime.now(timezone.utc)
                        },
                        "$setOnInsert": {
                            "creado_en": datetime.now(timezone.utc)
                        }
                    },
                    upsert=True
                )
                return True
        except Exception as e:
            logger.warning(f"Error registrando cliente en MongoDB: {e}")
        return False

    def registrar_cotizacion(self, telegram_id: int, recibo_data: Dict[str, Any], cotizacion_data: Dict[str, Any]) -> Optional[str]:
        """
        Guarda la cotización completa junto con los datos del recibo para fácil consulta en Compass.
        """
        try:
            if self.db is not None:
                rec = cotizacion_data.get("recomendado", {})
                doc = {
                    "telegram_id": telegram_id,
                    "creado_en": datetime.now(timezone.utc),
                    "recibo": {
                        "kwh_periodo": recibo_data.get("kwh_periodo"),
                        "tarifa": recibo_data.get("tarifa"),
                        "total_pagar": recibo_data.get("total_pagar"),
                        "periodo_inicio": recibo_data.get("periodo_inicio"),
                        "periodo_fin": recibo_data.get("periodo_fin"),
                        "modelo_lector": recibo_data.get("modelo_lector", "gemini-flash")
                    },
                    "propuesta": {
                        "paneles": rec.get("paneles", 0),
                        "kwp": rec.get("kwp", 0.0),
                        "produccion_anual_kwh": rec.get("produccion_anual_kwh", 0.0),
                        "costo_min": rec.get("costo_min", 0.0),
                        "costo_max": rec.get("costo_max", 0.0),
                        "ahorro_mensual": rec.get("ahorro_mensual", 0.0),
                        "retorno_anios": rec.get("retorno_anios", 0.0),
                        "semaforo": cotizacion_data.get("semaforo", {}).get("color", "VERDE")
                    },
                    "opciones": cotizacion_data.get("opciones", []),
                    "alertas": cotizacion_data.get("alertas", []),
                    "contacto_asesor": False,
                    "detalles_contacto": None
                }
                res = self.db.cotizaciones.insert_one(doc)
                return str(res.inserted_id)
        except Exception as e:
            logger.warning(f"Error guardando cotización en MongoDB: {e}")
        return None

    def marcar_contacto_asesor(self, telegram_id: int, detalles: Optional[str] = None) -> bool:
        """Marca las cotizaciones del usuario con interés en asesor."""
        try:
            if self.db is not None:
                res = self.db.cotizaciones.update_many(
                    {"telegram_id": telegram_id},
                    {
                        "$set": {
                            "contacto_asesor": True,
                            "detalles_contacto": detalles,
                            "contacto_solicitado_en": datetime.now(timezone.utc)
                        }
                    }
                )
                return res.modified_count > 0
        except Exception as e:
            logger.warning(f"Error marcando contacto en MongoDB: {e}")
        return False

    def registrar_auditoria(self, evento: str, detalles: Dict[str, Any]) -> bool:
        """Guarda un evento en la colección de auditoría."""
        try:
            if self.db is not None:
                self.db.auditoria.insert_one({
                    "evento": evento,
                    "detalles": detalles,
                    "fecha": datetime.now(timezone.utc)
                })
                return True
        except Exception as e:
            logger.warning(f"Error registrando auditoría en MongoDB: {e}")
        return False

    def borrar_datos_arco(self, telegram_id: int) -> bool:
        """Elimina todos los datos de un usuario por derecho ARCO."""
        try:
            if self.db is not None:
                self.db.clientes.delete_many({"telegram_id": telegram_id})
                self.db.cotizaciones.delete_many({"telegram_id": telegram_id})
                self.registrar_auditoria("DATOS_BORRADOS_ARCO_MONGO", {"telegram_id": telegram_id})
                return True
        except Exception as e:
            logger.warning(f"Error borrando datos ARCO en MongoDB: {e}")
        return False

mongo = MongoDBClient()
