from fpdf import FPDF
from datetime import date
import io
import os

LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "logo.jpg")

class ReporteSolarPDF(FPDF):
    def header(self):
        # Inclusión del logo oficial si existe
        if os.path.exists(LOGO_PATH):
            self.image(LOGO_PATH, x=10, y=8, w=15, h=15)
            text_x = 28
        else:
            text_x = 10
            
        self.set_xy(text_x, 8)
        self.set_font("helvetica", "B", 15)
        self.set_text_color(24, 43, 73)  # Azul marino institucional
        self.cell(0, 7, "KINICH SOLAR", new_x="LMARGIN", new_y="NEXT", align="L")
        
        self.set_xy(text_x, 15)
        self.set_font("helvetica", "", 9)
        self.set_text_color(100, 116, 139)
        self.cell(0, 5, "Estudio de Dimensionamiento Fotovoltaico y Viabilidad Financiera", new_x="LMARGIN", new_y="NEXT", align="L")
        
        self.set_draw_color(226, 232, 240)
        self.line(10, 26, 200, 26)
        self.set_y(28)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, "Kinich Solar | Propuesta preliminar de ingenieria sin compromiso comercial | www.kinichsolar.mx", align="C")

def generar_ficha_tecnica_pdf(cot: dict, telegram_id: int = 0) -> bytes:
    pdf = ReporteSolarPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    fecha_hoy = date.today().strftime("%d/%m/%Y")
    folio = f"KS-{abs(telegram_id) % 100000:05d}-{date.today().strftime('%y%m%d')}"

    # Encabezado secundario con Folio y Fecha
    pdf.set_font("helvetica", "", 8)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(100, 5, f"Folio de anteproyecto: {folio}", align="L")
    pdf.cell(90, 5, f"Fecha de emision: {fecha_hoy}", new_x="LMARGIN", new_y="NEXT", align="R")
    pdf.ln(3)

    # 1. Resumen del Servicio CFE
    pdf.set_fill_color(248, 250, 252)
    pdf.rect(10, pdf.get_y(), 190, 24, style="F")
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 6, "  1. Diagnostico del Servicio Electrico Actual (CFE)", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "", 9)
    pdf.set_text_color(51, 65, 85)
    col_w = 47.5
    y_pos = pdf.get_y()
    
    pdf.set_xy(12, y_pos)
    pdf.cell(col_w, 5, f"Consumo mensual: {cot.get('kwh_mes', 0)} kWh")
    pdf.cell(col_w, 5, f"Tarifa de suministro: {cot.get('tarifa', 'Residencial')}")
    pdf.cell(col_w, 5, f"Gasto mensual: ${cot.get('recibo_mes_real', 0):,.2f} MXN")
    pdf.cell(col_w, 5, f"Costo/kWh: ${cot.get('tarifa_efectiva_kwh', 0):.2f} MXN", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_xy(12, y_pos + 6)
    dias = cot.get('dias_periodo', 60)
    pdf.cell(col_w * 2, 5, f"Periodo analizado: {dias} dias facturados")
    pdf.cell(col_w * 2, 5, f"Fuente de radiacion: {cot.get('fuente_irradiacion', 'PVGIS')}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(7)

    # 2. Diagnostico del Semáforo
    sem = cot.get("semaforo", {})
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 6, "2. Dictamen de Viabilidad Financiera", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "B", 9)
    # Color según indicador
    if sem.get("color") == "VERDE":
        pdf.set_text_color(22, 101, 52)  # Verde
    elif sem.get("color") == "AMARILLO":
        pdf.set_text_color(161, 98, 7)   # Ámbar
    else:
        pdf.set_text_color(153, 27, 27)  # Rojo

    pdf.cell(0, 5, f"Clasificacion: {sem.get('indicador', '')} - {sem.get('titulo', '')}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 8.5)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(190, 4.5, sem.get("mensaje", ""))
    pdf.ln(4)

    # 3. Tabla Comparativa de 3 Opciones
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 6, "3. Dimensionamiento Tecnico en Tres Escalas de Inversion", new_x="LMARGIN", new_y="NEXT")
    
    # Encabezados de tabla
    pdf.set_fill_color(30, 41, 59)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("helvetica", "B", 8)
    
    headers = [("Escala", 38), ("Modulos", 20), ("Potencia", 20), ("Gen. Anual", 26), ("Inversion Llave en Mano", 38), ("Ahorro/Mes", 25), ("Retorno", 23)]
    for tit, w in headers:
        pdf.cell(w, 7, tit, border=0, align="C", fill=True)
    pdf.ln()

    # Filas de tabla
    pdf.set_font("helvetica", "", 8)
    opciones = cot.get("opciones", [])
    fill = False
    for op in opciones:
        pdf.set_fill_color(241, 245, 249) if fill else pdf.set_fill_color(255, 255, 255)
        pdf.set_text_color(30, 41, 59)
        
        es_rec = op.get("objetivo_cobertura") == 0.90
        etiqueta = ("* " if es_rec else "") + op.get("etiqueta", "")
        
        pdf.cell(38, 7, etiqueta, border="B", align="L", fill=True)
        pdf.cell(20, 7, f"{op.get('paneles')} mod.", border="B", align="C", fill=True)
        pdf.cell(20, 7, f"{op.get('kwp')} kWp", border="B", align="C", fill=True)
        pdf.cell(26, 7, f"{op.get('produccion_anual_kwh'):,} kWh", border="B", align="C", fill=True)
        pdf.cell(38, 7, f"${op.get('costo_min'):,} - ${op.get('costo_max'):,}", border="B", align="C", fill=True)
        pdf.cell(25, 7, f"${op.get('ahorro_mensual'):,.0f} MXN", border="B", align="C", fill=True)
        ret = f"{op.get('retorno_anios')} anos" if op.get('retorno_anios') else "N/D"
        pdf.cell(23, 7, ret, border="B", align="C", fill=True)
        pdf.ln()
        fill = not fill

    pdf.set_font("helvetica", "I", 7.5)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 5, "* Opcion recomendada por equilibrio entre inversion y optimizacion de excedentes con CFE.", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # 4. Impacto Ambiental
    rec = cot.get("recomendado", {})
    gen_anual = rec.get("produccion_anual_kwh", 0)
    co2_ton = round(gen_anual * 0.435 / 1000.0, 1)  # Factor de emision promedio CFE/CRE
    arboles = int(co2_ton * 45)

    pdf.set_fill_color(240, 253, 244)  # Verde suave
    pdf.rect(10, pdf.get_y(), 190, 15, style="F")
    pdf.set_font("helvetica", "B", 9)
    pdf.set_text_color(22, 101, 52)
    pdf.cell(0, 5, "  4. Beneficio e Impacto Ambiental Estimado", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 8.5)
    pdf.cell(0, 6, f"  Tu generacion limpia evitara ~{co2_ton} toneladas de CO2 al ano, equivalente a plantar {arboles} arboles adultos.", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # 5. Notas de Transparencia y Garantias
    pdf.set_font("helvetica", "B", 8.5)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 5, "5. Criterios Tecnicos y Transparencia Financiera", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 7.5)
    pdf.set_text_color(100, 116, 139)
    
    lineas_notas = [
        "- El ahorro mensual proyectado esta topado al importe real de tu recibo y conserva el cargo minimo de interconexion de CFE.",
        "- Los calculos de generacion integran factores de perdida por sombreado, orientacion y temperatura de la peninsula de Yucatan.",
        "- Modulos considerados: tecnologia Monocristalina PERC / N-Type de 550W con 25 anos de garantia de potencia lineal.",
        "- La presente estimacion no constituye contrato ni compromiso comercial; los costos finales se validan en visita tecnica."
    ]
    for l in lineas_notas:
        pdf.cell(0, 4, l, new_x="LMARGIN", new_y="NEXT")

    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()
