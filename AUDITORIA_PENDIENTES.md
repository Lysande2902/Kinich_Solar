# Reporte de Auditoría Técnica: Pendientes y Mejoras

**Proyecto:** Kinich Solar  
**Fecha:** 18/11/2026  
**Objetivo:** Matriz de priorización para llevar el prototipo funcional a una versión lista para producción/demostración final.

---

## Matriz Resumen de Prioridades

| ID | Área / Componente | Tarea Pendiente | Nivel de Prioridad | Esfuerzo Estimado |
| :--- | :--- | :--- | :---: | :---: |
| **A-01** | App Móvil (Expo) | IP del backend dinámica / Variable de entorno (`EXPO_PUBLIC_API_URL`) | **ALTO** | 30 min |
| **A-02** | Backend (API) | Persistencia y trazabilidad de solicitudes de asesoría técnica | **ALTO** | 45 min |
| **A-03** | Lector OCR (Gemini) | Manejo robusto de errores de extracción incompleta en Frontend | **ALTO** | 45 min |
| **A-04** | Servidores / Runtime | Automatización de arranque (Scripts `start_all.bat` / `.ps1`) | **ALTO** | 20 min |
| **M-01** | App Móvil (Expo) | Historial de cotizaciones del usuario en la aplicación móvil | **MEDIO** | 1.5 h |
| **M-02** | App Móvil (Expo) | Función de borrado de datos (Cumplimiento ARCO en móvil) | **MEDIO** | 45 min |
| **M-03** | Backend & Bot | Actualizador automático mensual de tarifas CFE en segundo plano | **MEDIO** | 2 h |
| **M-04** | Panel Asesores | Filtros, paginación y exportación a Excel/CSV en `/panel` | **MEDIO** | 1 h |
| **M-05** | Simulación Solar | Soporte explícito de geolocalización GPS en la app móvil | **MEDIO** | 1 h |
| **B-01** | App Móvil (UI) | Sustitución de emojis de fallback por iconos vectoriales (`@expo/vector-icons`) | **BAJO** | 45 min |
| **B-02** | Documentos (PDF) | Selector de plantillas y personalización de datos de contacto | **BAJO** | 1 h |
| **B-03** | Calidad de Código | Pruebas de integración E2E automatizadas para la API | **BAJO** | 1.5 h |
| **B-04** | Seguridad Web | Migración opcional de HTTP Basic Auth a Tokens JWT en el panel | **BAJO** | 2 h |

---

## 1. Nivel de Prioridad: ALTO (Atención Inmediata)

### A-01: Configuración dinámica de la IP del Backend en la App Móvil
- **Diagnóstico actual:** En `src/api/client.js`, la constante `BASE_URL` está fijada como string estático (ej. `http://10.3.2.136:8000`). Cada vez que la laptop o el dispositivo móvil cambian de red Wi-Fi, la IP cambia y la app deja de comunicarse con el backend.
- **Solución requerida:**
  1. Configurar soporte para `process.env.EXPO_PUBLIC_API_URL`.
  2. Implementar un fallback o modal de configuración rápida ("Ajustes de conexión") en la pantalla de bienvenida donde el usuario/evaluador pueda ingresar o cambiar la IP del servidor sin tocar código fuente.

### A-02: Endpoint y Persistencia para Solicitud de Visita Técnica
- **Diagnóstico actual:** Al tocar *"Solicitar visita técnica sin costo ›"* en la app móvil, se muestra una alerta nativa de confirmación, pero la solicitud no se guarda en la tabla `auditoria` ni actualiza el campo `contacto_asesor` en la tabla `cotizaciones` de `kinich.db`.
- **Solución requerida:**
  1. Conectar la acción al endpoint existente `POST /api/v1/contacto-asesor` pasando el `telegram_id` / `device_id` y los datos del anteproyecto.
  2. Registrar la alerta para que aparezca resaltada en el `/panel` web del asesor técnico.

### A-03: Fallback y Validación ante Lecturas Incompletas del Recibo
- **Diagnóstico actual:** Si un usuario sube una foto muy borrosa o recortada, Gemini puede no extraer el consumo o la tarifa. Si el JSON viene incompleto, el flujo puede detenerse sin una explicación amigable.
- **Solución requerida:**
  1. En `CaptureScreen.js`, validar si la respuesta contiene valores nulos o fuera de rango.
  2. Si faltan datos, redirigir a `VerificationScreen.js` con campos en blanco destacados en amarillo para que el usuario pueda capturar manualmente su consumo o tarifa sin reiniciar el proceso.

### A-04: Script Unificado de Arranque Local (`start_all.bat`)
- **Diagnóstico actual:** Para ejecutar el sistema completo se requiere abrir 2 o 3 terminales independientes manualmente (`uvicorn`, `telegram_bot`, `expo start`).
- **Solución requerida:**
  1. Crear un script `.bat` o `.ps1` que detecte la IP actual de la máquina mediante script, levante FastAPI, el bot de Telegram y el bundler de Expo en un solo clic.

---

## 2. Nivel de Prioridad: MEDIO (Funcionalidad Clave y Trazabilidad)

### M-01: Pantalla de Historial de Cotizaciones en la App Móvil
- **Diagnóstico actual:** El bot de Telegram cuenta con el comando `/historial`, y el backend tiene el endpoint `/api/v1/historial/{telegram_id}` listo, pero en la app móvil no existe una pantalla para que el usuario consulte sus anteproyectos previos.
- **Solución requerida:**
  1. Agregar un botón de historial o menú lateral en la app móvil que consulte el endpoint y liste las cotizaciones guardadas en SQLite con fecha, folio, paneles e inversión.

### M-02: Función de Borrado de Datos (ARCO) en la App Móvil
- **Diagnóstico actual:** El bot de Telegram tiene `/borrar_mis_datos`, pero en la aplicación móvil no hay un botón en los ajustes de privacidad para ejercer el derecho ARCO.
- **Solución requerida:**
  1. Agregar un botón *"Eliminar mis datos del servidor"* en el Onboarding o en la propuesta que llame a `DELETE /api/v1/borrar-datos/{device_id}`.

### M-03: Cronjob o Tarea Periódica de Actualización de Tarifas
- **Diagnóstico actual:** Existe el script `actualizar_tarifas.py`, pero debe ser corrido manualmente por el administrador.
- **Solución requerida:**
  1. Integrar una rutina mensual que verifique la antigüedad de `config/tarifas_cfe.json` y emita una advertencia si el tabulador supera los 60 días sin actualizarse.

### M-04: Mejoras al Panel Administrativo Web (`/panel`)
- **Diagnóstico actual:** El panel en `http://localhost:8000/panel` muestra la tabla con Basic Auth, pero carece de buscador de folios y botón de descarga en formato Excel o CSV para asesores.
- **Solución requerida:**
  1. Añadir barra de búsqueda rápida por folio/ID y botón de exportar reporte en CSV.

### M-05: Detección GPS Real en la App Móvil
- **Diagnóstico actual:** El backend admite latitud y longitud (`lat`, `lon`) para consultar la irradiancia exacta en PVGIS, pero actualmente la app usa las coordenadas por defecto de Mérida (`20.967`, `-89.592`).
- **Solución requerida:**
  1. Integrar `expo-location` para consultar la ubicación del usuario (con permiso previo) y pasar las coordenadas exactas al cotizador.

---

## 3. Nivel de Prioridad: BAJO (Pulido, Estética y Calidad)

### B-01: Sustitución de Emojis por Iconos Vectoriales Nativos
- **Diagnóstico actual:** En algunas tarjetas de la app móvil se usan emojis como placeholders visuales (☀️, ❄️, 🚗, 💧, 📸). En versiones antiguas de Android, los emojis pueden verse heterogéneos.
- **Solución requerida:**
  1. Sustituir los emojis por iconos limpios de `@expo/vector-icons` (MaterialCommunityIcons o Feather).

### B-02: Opciones de Compartición en el Reporte PDF
- **Diagnóstico actual:** El PDF generado tiene un formato estándar de alta calidad con el logo oficial, pero el nombre del archivo es fijo (`Kinich_Solar_Propuesta_ID.pdf`).
- **Solución requerida:**
  1. Nombrar el archivo con el folio de ingeniería formateado (ej. `Propuesta_Kinich_Solar_KS-12345.pdf`).

### B-03: Cobertura de Pruebas de Integración (API Tests)
- **Diagnóstico actual:** Tenemos 26 pruebas de unit testing sobre el motor tarifario y cotizador (`test_tarifas.py`, `test_cotizador_mejorado.py`), pero no un test runner para endpoints HTTP usando `TestClient` de FastAPI.
- **Solución requerida:**
  1. Crear `tests/test_api_endpoints.py` para probar `/api/v1/cotizar`, `/api/v1/generar-pdf` y `/api/v1/consentimiento`.

### B-04: Migración de Seguridad a Tokens JWT
- **Diagnóstico actual:** El panel web usa HTTP Basic Auth (`asesor` / `kinich2026`). Es funcional para la PoC, pero para una escala comercial se recomienda autenticación basada en tokens o sesiones.
