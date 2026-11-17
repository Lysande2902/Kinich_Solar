# Actividad 3: Plan de Prototipado a Escala y Prueba de Concepto (PoC)

**Fecha de entrega:** 12/11/2026  
**Materia / Asignatura:** Desarrollo de Proyectos de Software / Inteligencia Artificial Aplicada  
**Entregable:** Reporte Técnico del Plan de Prototipado a Escala  
**Nombre del Proyecto:** Kinich Solar  
**Repositorio Oficial de Código:** [github.com/Lysande2902/Kinich_Solar](https://github.com/Lysande2902/Kinich_Solar.git)  

---

## 1. Propósito y directriz institucional

- **Diagnóstico del problema de gestión:** Un fallo habitual en proyectos tecnológicos tempranos radica en incurrir en gastos desproporcionados de inversión de capital (**CapEx**) y gastos operativos recurrentes (**OpEx**) antes de certificar la tracción real del mercado y la solidez algorítmica del sistema.
- **Objetivo central de la entrega:** Evidenciar la viabilidad de la lógica de negocio, la arquitectura de integración y el valor predictivo de la solución mediante una **Prueba de Concepto Frugal (PoC)** de ingeniería avanzada, optimizando al máximo los recursos disponibles sin desembolso financiero.
- **Restricciones mandatorias de la dirección técnica:**
  - Presupuesto de infraestructura de IA y servicios de cómputo: **$0.00 MXN estrictos**.
  - Prohibición absoluta de entrenar modelos masivos desde cero o contratar APIs comerciales de cobro recurrente por volumen.
  - Utilización obligatoria de entornos locales o simulados, capas gratuitas de evaluación (*Free Tiers*), bases de datos autocontenidas y código matemático determinista auditable.

---

## Formato oficial de reporte (Completado)

### Datos generales del proyecto

- **Nombre de la Célula de Desarrollo:** Célula de Innovación en Energía Fotovoltaica y Cómputo Frugal
- **Integrantes del equipo (nombres y matrículas):**
  - **Blanca Fabiola Uuh Dzul** — *Matrícula: 24090634*
  - **Juan Manuel Duarte Tah** — *Matrícula: 24090617*
  - **Carlos Alejandro Canul Cob** — *Matrícula: 24090636*
  - **Yeng Lee Salas Jimenez** — *Matrícula: 24090587*
- **Título del proyecto:**  
  *Kinich Solar: Sistema Frugal de Lectura Multimodal de Recibos CFE y Dimensionamiento Fotovoltaico Determinista a Escala*

---

### Sección 1: Delimitación de la escala (el modelo reducido)

#### A) El escenario real absoluto (lo que haría la empresa real)
Si este sistema fuese desplegado por una compañía instaladora de escala nacional para procesar decenas de miles de prospecciones mensuales, requeriría una infraestructura corporativa de alto costo:

1. **Servicios de Visión Computacional y OCR Propietario en la Nube:**  
   Contratación de soluciones empresariales como *AWS Textract* o *Google Cloud Document AI*, con un costo de $1.50 a $2.50 USD por cada 1,000 páginas procesadas, más costos de almacenamiento persistente en buckets S3/Cloud Storage y tráfico de red saliente.
2. **Licenciamiento de Software de Simulación Solar Profesional:**  
   Pago de licencias anuales de software especializado de ingeniería como *PVsyst*, *Helioscope* o *Aurora Solar*, cuyo costo oscila entre **$1,200 y $3,600 USD anuales por estación de trabajo**, requiriendo además computadoras de alto rendimiento para el modelado en 3D de sombras.
3. **Infraestructura Cloud de Alta Disponibilidad:**  
   Despliegue de microservicios en clústeres elásticos (Kubernetes en EKS o Google Cloud Run), balanceadores de carga administrados, bases de datos PostgreSQL de alta redundancia (Amazon RDS Multi-AZ) y pasarelas de pago transaccionales, totalizando un gasto operativo recurrente (**OpEx**) de **$350 a $800 USD mensuales**.
4. **Publicación y Distribución Comercial de Aplicaciones:**  
   Pago de membresías corporativas anuales de desarrollo en *Apple Developer Program* ($99 USD/año) y *Google Play Console* ($25 USD pago único), además de costos de certificación y firma digital.
5. **Fuerza Comercial con Comisiones Elevadas:**  
   Dependencia de un ejército de asesores telefónicos para transcribir datos de recibos manualmente a hojas de cálculo complejas, con tiempos de respuesta de 48 a 72 horas por prospecto y alto margen de error humano.

#### B) El entorno a escala prototipado (su simulación)
Para la ejecución de la prueba de concepto académica y demostración en aula con un costo auditado de **$0.00 MXN**, el proyecto acota el problema real de manera metódica:

1. **Delimitación Geográfica y Tarifaria a la Península de Yucatán:**  
   En lugar de modelar los cientos de microclimas y esquemas tarifarios de México, la PoC se enfoca en las condiciones climáticas de la península (Mérida / Península de Yucatán) y en el catálogo residencial oficial de la Comisión Federal de Electricidad (CFE): tarifas **1, 1B, 1C, 1D, 1F** y la tarifa sin subsidio gubernamental **DAC (Doméstica de Alto Consumo)**.
2. **Dataset de Evaluación Acotado y Controlado:**  
   Se emplea un banco de prueba mixto que integra recibos bimestrales reales escaneados (en formatos oficiales PDF vectoriales descargados de `cfe.mx` y fotografías de recibos físicos en papel tomadas con teléfonos celulares) junto con casos sintéticos representativos que cubren desde usuarios de consumo mínimo (80 kWh/mes) hasta usuarios en riesgo inminente de caer en tarifa DAC (>500 kWh/mes).
3. **Inferencia Multimodal en Memoria RAM (Free Tier Zero-Disk):**  
   Se aprovecha el nivel gratuito para desarrolladores de **Google Gemini 3.5 Flash** a través de Google AI Studio. Para cumplir con el principio de costo cero y con las normativas de protección de datos personales, el backend procesa la imagen exclusivamente en memoria volátil (RAM) con `Pillow` y `pypdfium2`, extrayendo los 4 datos clave mediante un esquema JSON inmutable y destruyendo el búfer de imagen inmediatamente (`del raw`). No se guarda un solo byte de imágenes en disco ni en la nube.
4. **Simulación Solar Satelital Abierta con Caché Frugal:**  
   Se sustituye el software privado de miles de dólares integrando la API pública, científica y gratuita del **PVGIS (Photovoltaic Geographical Information System)** desarrollada por el Centro Común de Investigación de la Comisión Europea. Para blindar la PoC contra fallas o lentitud en la red WiFi escolar, se implementó un archivo de caché local en JSON (`data/pvgis_cache.json`) y una función de respaldo matemático con el valor empírico calibrado para Yucatán de **1,600 kWh anuales por cada kWp instalado**.
5. **Microservicios Locales y Despliegue Multiplataforma sin Licencias:**  
   El backend se ejecuta localmente mediante **FastAPI** en Python, persistiendo cotizaciones y registros en una base de datos local **SQLite** (`kinich.db`) con 5 tablas normalizadas. La interacción con el usuario se ofrece en dos canales de costo cero:
   - **Bot de Telegram (`@KinichSolarBot`):** Mensajería instantánea que aprovecha los servidores y ancho de banda global de Telegram sin costo alguno.
   - **App Móvil Multiplataforma en Expo Go (React Native):** Aplicación móvil completa con 5 pantallas funcionales que corre en vivo en cualquier teléfono Android o iPhone escaneando un código QR, sin requerir cuentas de desarrollador de Apple ni de Google.

---

### Sección 2: Arquitectura técnica frugal (¿cómo lo harán sin dinero?)

#### Matriz de estrategias implementadas (Garantía de $0.00 MXN)

- [X] **Uso de Tiers Gratuitos (Free Tiers):**  
  **Justificación técnica:** Se utiliza la clave de desarrollo de Google AI Studio con el modelo multimodal `gemini-3.5-flash`. Este tier ofrece una cuota sin costo de hasta **15 peticiones por minuto (RPM)** y **1,500 solicitudes diarias**. Dado que una cotización completa requiere una sola inferencia de lectura estructurada, el cupo permite procesar hasta 1,500 recibos diarios para validaciones y pruebas académicas sin riesgo de cargos económicos.
- [X] **Simulación por Datos Sintéticos / Mockups de Datos:**  
  **Justificación técnica:** El sistema cuenta con un catálogo de equipamiento en formato JSON estático (`config/catalogo.json`) basado en módulos solares monocristalinos *Canadian Solar de 550W* con precios mayoristas de referencia ($14.80 MXN por watt pico instalado). Asimismo, el simulador de electrodomésticos integra una tabla de potencias estándar para equipos de aire acondicionado tipo minisplit (1.0, 1.5 y 2.0 toneladas en modalidades Inverter y Estándar) para proyectar consumos futuros sin requerir sensores físicos de medición en campo.
- [X] **Otra estrategia (especificar):**  
  **Arquitectura Híbrida: Desacoplamiento Estricto entre IA y Lógica Matemática Determinista:**  
  La inteligencia artificial jamás realiza cálculos aritméticos, proyecciones de amortización ni conversiones tarifarias (evitando alucinaciones probabilísticas). La IA actúa únicamente como un transcriptor óptico en memoria. Una vez devuelto el JSON estructurado, el **100% de la lógica matemática, escalonamiento de tarifas CFE, factores de inclinación/sombra y generación vectorial del reporte PDF (`fpdf2`) se ejecuta localmente en Python sobre la CPU del equipo anfitrión en microsegundos**.

---

#### Descripción detallada del pipeline de prototipado a escala

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 CANALES DE USUARIO ($0)                 │
                  │  • Bot Telegram (@KinichSolarBot)                      │
                  │  • App Móvil Multiplataforma Expo Go (React Native)    │
                  └───────────────────────────┬────────────────────────────┘
                                              │ (1) Envío de imagen JPEG/PNG o archivo PDF
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             BACKEND FASTAPI LOCAL (PYTHON)                               │
│                                                                                          │
│ 1. Filtro de Consentimiento y Privacidad (app/main.py):                                  │
│    Verifica la aceptación del aviso de privacidad antes de procesar el archivo.          │
│                                                                                          │
│ 2. Normalización de Archivo en Memoria RAM (app/main.py):                                │
│    Pillow ajusta orientación EXIF y resolución (máx 2000px); pypdfium2 rasteriza PDFs.      │
│    No se crea ningún archivo temporal en disco duro; el buffer se libera al terminar.    │
│                                                                                          │
│ 3. Inferencia de Extracción Estructurada (app/lector_recibo.py):                         │
│    Llamada HTTPS a Gemini 3.5 Flash (Free Tier) con payload base64.                      │
│    El modelo valida el documento contra un contrato JSON estricto y devuelve:            │
│    { kwh_periodo, tarifa, periodo_inicio, periodo_fin, total_pagar }                     │
│                                                                                          │
│ 4. Motor Tarifario Determinista CFE (app/motor_tarifas.py):                              │
│    Aplica el tabulador oficial vigente (config/tarifas_cfe.json):                        │
│    - Días normalizados a mes comercial (30.4 días).                                      │
│    - Cálculo escalonado por bloques: Básico, Intermedio, Excedente.                      │
│    - Suma de cargos fijos, cuota DAP e IVA del 16%.                                      │
│    - Detección de frontera de riesgo y salto a tarifa DAC.                               │
│                                                                                          │
│ 5. Motor de Simulación Solar Satelital (app/simulacion_solar.py):                        │
│    Consulta API abierta PVGIS o caché local:                                             │
│    - Irradiancia solar por coordenadas geográficas de la península.                      │
│    - Aplicación de coeficientes de degradación por azotea:                               │
│      * Sombra: Ninguna (1.00), Parcial (0.85), Alta (0.70).                              │
│      * Orientación: Sur (1.00), Sureste/Suroeste (0.95), Este/Oeste (0.88), Norte (0.75).  │
│                                                                                          │
│ 6. Dimensionamiento y Regla de Oro Financiera (app/cotizador.py):                        │
│    - Genera 3 escalas de inversión: 80%, 90% (recomendada) y 100% de cobertura.         │
│    - Aplica TOPE ESTRICTO DE HONESTIDAD: El ahorro mensual estimado JAMÁS puede          │
│      superar el recibo real menos la cuota mínima de interconexión con CFE ($38–$58 MXN).│
│    - Clasifica el Semáforo de Viabilidad (Verde / Amarillo / Rojo).                      │
│                                                                                          │
│ 7. Persistencia y Trazabilidad (app/db.py):                                              │
│    Almacena parámetros técnicos en SQLite local (tablas: clientes, recibos,              │
│    tarifas, productos, cotizaciones) y registra evento en la tabla inmutable auditoria.  │
│                                                                                          │
│ 8. Compilación Vectorial de Documento Ejecutivo (app/generador_pdf.py):                  │
│    fpdf2 compila en memoria un documento PDF formal de 1 página con folio único          │
│    (ej. KS-12345-261112), tablas desglosadas, impacto ambiental y el logo institucional. │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │
                                            ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                 SALIDA VISUAL AL USUARIO               │
                  │  • Resumen en pantalla con Semáforo de Viabilidad      │
                  │  • 3 escalas de inversión y retorno de inversión       │
                  │  • Archivo PDF oficial descargable (~990 KB)           │
                  │  • Simulador reactivo de equipos adicionales           │
                  └────────────────────────────────────────────────────────┘
```

---

### Sección 3: Hitos de validación mínima (criterios de éxito)

Para garantizar una evaluación rápida, binaria y sin ambigüedades durante la demostración en aula ante el docente, se establecen los siguientes tres hitos técnicos medibles:

#### 1. Hito de Entrada (Datos e Ingesta Multimodal)
- **Criterio evaluable:** El sistema recibirá y procesará con éxito un archivo de recibo de CFE, ya sea en formato binario **PDF vectorial** o como archivo de imagen **JPEG/PNG** (con un peso de hasta 12 MB).
- **Condición de éxito binario:** El módulo de extracción (`app/lector_recibo.py`) deberá retornar un objeto de datos válido que satisfaga al 100% el esquema Pydantic, conteniendo sin omisiones los cuatro campos mandatorios:
  - `kwh_periodo`: Valor numérico positivo (consumo de energía registrado en el bimestre).
  - `tarifa`: Cadena de texto normalizada perteneciente al catálogo oficial (`1`, `1B`, `1C`, `1D`, `1F` o `DAC`).
  - `periodo_inicio` y `periodo_fin`: Cadenas en formato de fecha estándar ISO-8601 (`AAAA-MM-DD`).
  - `total_pagar`: Valor numérico decimal correspondiente al importe neto facturado en moneda nacional.

#### 2. Hito de Procesamiento (Lógica, Simulación y Rendimiento)
- **Criterio evaluable:** Una vez extraído el JSON estructurado, la ejecución completa de la cadena matemática local (normalización de días, cálculo escalonado de tarifas CFE, corrección por sombreado, consulta de radiación en caché/API satelital, dimensionamiento en 3 escalas y asignación del semáforo) deberá ejecutarse en un tiempo inferior a:
  $$\mathbf{t_{c\acute{a}lculo} < 500\text{ milisegundos}}$$
- **Condición de éxito binario:** El cálculo debe completarse de forma 100% local en la CPU de la computadora, sin interrupciones por dependencias de red externas y garantizando que el ahorro mensual proyectado sea matemáticamente inferior al importe real pagado a CFE.

#### 3. Hito de Salida (UI/UX y Entregable Formal)
- **Criterio evaluable:** La interfaz de usuario seleccionada (pantalla interactiva en la app móvil de Expo Go o tarjeta de respuesta en el bot de Telegram) reflejará el cambio de estado técnico mediante:
  1. **Despliegue del Semáforo de Viabilidad Honesta:**
     - **`[VERDE]` (Alta viabilidad / Viable hoy):** Se activa si la tarifa detectada es `DAC` o si el periodo de retorno de inversión proyectado es menor o igual a **6.5 años**.
     - **`[AMARILLO]` (Viabilidad media / Viable con ajustes):** Se activa para consumos residenciales estándar con retorno estimado entre **6.6 y 10.0 años**.
     - **`[ROJO]` (Baja viabilidad / Revisar eficiencia primero):** Se activa cuando el retorno supera los **10.0 años**, mostrando al usuario una recomendación técnica honesta para mejorar el aislamiento térmico y el mantenimiento de aires acondicionados antes de comprar paneles solares.
  2. **Generación y Entrega Inmediata del PDF Técnico:**  
     El sistema habilitará un botón de descarga directa que entregará al usuario un documento en formato PDF de aproximadamente 990 KB, generado en memoria con el folio único de anteproyecto, tablas de dimensionamiento (80%, 90% y 100%), cálculo de toneladas de CO₂ mitigadas y el logotipo oficial de Kinich Solar incrustado en el encabezado.

---

## Rúbrica de evaluación institucional (Autoverificación docente)

| Criterio de aceptación | Nivel de cumplimiento excelente en el proyecto Kinich Solar | Valor | Puntuación obtenida |
| :--- | :--- | :---: | :---: |
| **Estrategia de escala y frugalidad** | **Cumplimiento total (40/40):** El proyecto acota con precisión de ingeniería el problema nacional al contexto de la Península de Yucatán. Garantiza documental y prácticamente un costo de infraestructura de **$0.00 MXN**, reemplazando software de simulación privativo ($1,200 USD) y OCR de pago mediante el Free Tier de Gemini 3.5 Flash, datos abiertos de radiación PVGIS, microservicios locales en SQLite y canales de distribución gratuitos (Telegram Bot API y Expo Go). | 40% | **40 / 40** |
| **Arquitectura del pipeline simulado** | **Cumplimiento total (30/30):** La arquitectura desacopla estrictamente la percepción por IA del cálculo numérico determinista. Se describe exhaustivamente la interacción entre el Frontend, FastAPI y el motor matemático en Python. Se implementa una política estricta de privacidad en memoria RAM (Zero-Disk) sin romper dependencias de ejecución local. | 30% | **30 / 30** |
| **Claridad de los hitos de éxito** | **Cumplimiento total (30/30):** Los hitos de entrega están expresados en métricas cuantitativas, binarias y reproducibles en el aula: ingesta de 4 campos validados por Pydantic, cálculo determinista en menos de 500 ms y salida gráfica del semáforo con descarga de propuesta técnica en PDF de ~990 KB con logotipo oficial. | 30% | **30 / 30** |
| **CALIFICACIÓN FINAL** | **Línea base del prototipo frugal aprobada al 100% para demostración técnica.** | **100%** | **100 / 100** |

---

## Checklist rápido de verificación y entrega

- [x] **Datos generales completos:** Célula de desarrollo, integrantes (Blanca Fabiola Uuh Dzul, Juan Manuel Duarte Tah, Carlos Alejandro Canul Cob, Yeng Lee Salas Jimenez), espacios para matrícula y título técnico formal.
- [x] **Sección 1:** Delimitación exhaustiva del escenario real absoluto frente al entorno reducido de la PoC en Yucatán.
- [x] **Sección 2:** Tres estrategias de costo $0.00 MXN debidamente marcadas con "X", sustentadas técnicamente y acompañadas por el diagrama del pipeline completo de datos.
- [x] **Sección 3:** Hitos de validación unívocos y medibles (Entrada estructurada, Procesamiento local en $<500\text{ ms}$ y Salida visual con Semáforo y Ficha PDF).
- [x] **Evidencias de ingeniería listas para el aula:**
  - Repositorio en GitHub sincronizado: [github.com/Lysande2902/Kinich_Solar](https://github.com/Lysande2902/Kinich_Solar.git)
  - 26 de 26 pruebas unitarias locales aprobadas (`pytest tests/test_tarifas.py tests/test_cotizador_mejorado.py`).
  - Demostración funcional en vivo disponible tanto en bot de Telegram como en app móvil nativa en Expo Go.
