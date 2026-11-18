import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator, Linking,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOW } from '../constants/theme';
import ScaleSelector from '../components/ScaleSelector';
import SemaphoreCard from '../components/SemaphoreCard';
import { getServerUrl, solicitarAsesor } from '../api/client';

export default function ProposalScreen({ navigation, route }) {
  const { cotizacion = {}, deviceId, tarifa: tarifaParam, cotizacionAjustada } = route.params || {};
  const [scale, setScale] = useState('90');
  const [downloading, setDownloading] = useState(false);

  // Si viene una cotización actualizada desde el simulador, se utiliza con prioridad
  const cot = cotizacionAjustada || cotizacion;
  const tarifa = cot.tarifa || tarifaParam || '1C';
  const opcionesList = Array.isArray(cot.opciones) ? cot.opciones : [];
  const optIndex = scale === '80' ? 0 : scale === '100' ? 2 : 1;
  const opt = opcionesList[optIndex] || cot.recomendado || opcionesList[0] || {};
  const semaforo = cot.semaforo || {};
  const co2 = opt.co2_ton_anio || Math.round((opt.produccion_anual_kwh || 0) * 0.00045 * 10) / 10 || 3.9;
  const arboles = opt.arboles_equiv || Math.round(co2 * 45) || 160;
  const retornoAnios = opt.retorno_anios ?? opt.recuperacion_anios ?? cot.recomendado?.retorno_anios ?? '—';

  // Estimación de financiamiento solar a 48 meses (Tasa preferencial ~14% anual)
  const costoMedio = (opt.costo_min && opt.costo_max) ? (opt.costo_min + opt.costo_max) / 2 : (opt.costo_min || 85000);
  const mensualidadFinanciamiento = Math.round((costoMedio * 1.25) / 48);
  const ahorroMes = opt.ahorro_mensual || 0;
  const saldoNetoMes = ahorroMes - mensualidadFinanciamiento;

  const fmt = (n) => (n ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })}` : '—');

  const handleDescargarPdf = async () => {
    try {
      setDownloading(true);
      const serverUrl = await getServerUrl();
      const folio = cot.cotizacion_id ? `KS-${String(cot.cotizacion_id).padStart(5, '0')}` : `${deviceId || 999999}`;
      const targetUri = `${FileSystem.documentDirectory}Propuesta_Kinich_Solar_${folio}.pdf`;

      const downloadRes = await FileSystem.downloadAsync(
        `${serverUrl}/api/v1/generar-pdf`,
        targetUri,
        {
          headers: { 'Content-Type': 'application/json' },
          httpMethod: 'POST',
          body: JSON.stringify({ cotizacion: cot, telegram_id: deviceId || 999999 }),
        }
      );

      if (downloadRes.status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadRes.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Tu Propuesta Solar - Kinich Solar',
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('PDF Descargado', `Archivo guardado en: ${downloadRes.uri}`);
        }
      } else {
        Alert.alert('Error', 'No fue posible generar el archivo PDF en el servidor.');
      }
    } catch (err) {
      Alert.alert('Descarga fallida', 'Ocurrió un error al descargar el PDF: ' + (err.message || 'Error de red'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.progress}>
        <Text style={styles.step}>PASO 3 DE 4</Text>
        <View style={styles.bar}><View style={[styles.barFill, { width: '75%' }]} /></View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Evaluación de ingeniería</Text>

        {/* Semáforo */}
        <SemaphoreCard semaphore={semaforo} />

        {/* Resumen del diagnóstico */}
        <View style={styles.diagRow}>
          {[
            { label: 'TARIFA', value: tarifa },
            { label: 'CONSUMO/MES', value: `${cot.kwh_mes || 0} kWh` },
            { label: 'TECHO', value: 'Losa' },
          ].map((d) => (
            <View key={d.label} style={styles.diagCell}>
              <Text style={styles.diagLabel}>{d.label}</Text>
              <Text style={styles.diagValue}>{d.value}</Text>
            </View>
          ))}
        </View>

        {/* Selector de escala */}
        <Text style={styles.sectionLabel}>ESCALA DEL SISTEMA</Text>
        <ScaleSelector selected={scale} onSelect={setScale} />

        {/* Tarjeta de métricas */}
        <View style={styles.metricsCard}>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>PANELES</Text>
              <Text style={styles.metricVal}>{opt.paneles || '—'} × 550 W</Text>
              <Text style={styles.metricSub}>Tier 1 · 25 años garantía</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>CAPACIDAD</Text>
              <Text style={styles.metricVal}>{opt.kwp || '—'} kWp</Text>
              <Text style={styles.metricSub}>~{opt.m2 || '—'} m² de azotea</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.metricLabel}>INVERSIÓN BASE EN MANO</Text>
          <Text style={styles.metricLarge}>
            {fmt(opt.costo_min)} – {fmt(opt.costo_max)} MXN
          </Text>
          <Text style={styles.metricSub}>Incluye IVA, cableado, inversor e interconexión CFE</Text>

          <View style={styles.divider} />

          <Text style={styles.metricLabel}>FINANCIAMIENTO ESTIMADO (48 MESES)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 }}>
            <Text style={[styles.metricLarge, { color: COLORS.navy }]}>{fmt(mensualidadFinanciamiento)}</Text>
            <Text style={{ ...FONTS.bodySmall, color: COLORS.textMuted, marginLeft: 6 }}>/ mes</Text>
          </View>
          <Text style={styles.metricSub}>
            {saldoNetoMes >= 0
              ? `⚡ ¡El sistema se paga solo! Tu ahorro CFE (${fmt(ahorroMes)}) cubre tu mensualidad.`
              : `Ahorras ${fmt(ahorroMes)}/mes en CFE para amortizar prácticamente toda tu cuota.`}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.metricLabel}>AHORRO MENSUAL ESTIMADO</Text>
          <Text style={[styles.metricLarge, { color: COLORS.green }]}>{fmt(opt.ahorro_mensual)} MXN</Text>
          <Text style={styles.metricSub}>
            Tope aplicado: factura histórica de {fmt(cotizacion.recibo_mes_real)} menos cuota CFE de $38
          </Text>

          <View style={styles.divider} />

          <Text style={styles.metricLabel}>RETORNO DE INVERSIÓN</Text>
          <Text style={styles.metricLarge}>{retornoAnios} años</Text>
          <Text style={styles.metricSub}>Con incremento anual supuesto de 4% en la tarifa</Text>

          <View style={[styles.divider, { marginTop: 12 }]} />

          <View style={styles.ecoRow}>
            <Text style={styles.ecoIcon}>🌱</Text>
            <Text style={styles.ecoText}>
              {co2} t de CO₂ evitadas al año — equivale a {arboles} árboles maduros plantados
            </Text>
          </View>
        </View>

        {/* Acciones */}
        <TouchableOpacity
          style={[styles.btnPrimary, downloading && { backgroundColor: '#334155' }]}
          onPress={handleDescargarPdf}
          disabled={downloading}
          activeOpacity={0.85}
        >
          {downloading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color={COLORS.white} size="small" />
              <Text style={styles.btnPrimaryText}>Generando PDF oficial...</Text>
            </View>
          ) : (
            <Text style={styles.btnPrimaryText}>Descargar propuesta (PDF)  ↓</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('Simulator', { cotizacion: cot, deviceId, tarifa })}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>Simular equipo adicional  +</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          activeOpacity={0.7}
          onPress={() => {
            const folio = cot.cotizacion_id ? `KS-${String(cot.cotizacion_id).padStart(5, '0')}` : `${deviceId || 999999}`;
            Alert.alert(
              'Solicitar Asesoría Técnica',
              'Un ingeniero certificado de Kinich Solar revisará tu anteproyecto sin ningún compromiso. ¿Deseas contactar a un asesor por WhatsApp?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Contactar por WhatsApp',
                  onPress: async () => {
                    try {
                      await solicitarAsesor({
                        telegram_id: deviceId || 999999,
                        recibo_id: cot.recibo_id || null,
                        detalles: {
                          tarifa,
                          paneles: opt.paneles,
                          kwp: opt.kwp,
                          costo_promedio: opt.costo_promedio || opt.costo_min
                        }
                      });
                    } catch (_) {}

                    const msg = encodeURIComponent(
                      `¡Hola Kinich Solar! ☀️ Acabo de cotizar en la app con el Folio ${folio}.\n` +
                      `• Tarifa: ${tarifa}\n` +
                      `• Sistema: ${opt.paneles} paneles (${opt.kwp} kWp)\n` +
                      `• Ahorro estimado: ${fmt(opt.ahorro_mensual)}/mes\n\n` +
                      `Me gustaría agendar una visita técnica sin costo.`
                    );
                    const whatsappUrl = `https://wa.me/529990000000?text=${msg}`;
                    Linking.openURL(whatsappUrl).catch(() => {
                      Alert.alert('Solicitud registrada', 'Hemos guardado tu solicitud. Un asesor se comunicará contigo.');
                    });
                  }
                }
              ]
            );
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="whatsapp" size={20} color={COLORS.amber} style={{ marginRight: 6 }} />
            <Text style={styles.linkText}>Solicitar visita técnica por WhatsApp  ›</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSoft },
  progress: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, backgroundColor: COLORS.white },
  step: { ...FONTS.label, color: COLORS.textMuted, marginBottom: 6, fontSize: 10 },
  bar: { height: 3, backgroundColor: COLORS.border, borderRadius: 2 },
  barFill: { height: 3, backgroundColor: COLORS.amber, borderRadius: 2 },
  scroll: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 20 },
  h1: { ...FONTS.h1, fontSize: 26, color: COLORS.textPrimary, marginBottom: 16 },
  sectionLabel: { ...FONTS.label, color: COLORS.textMuted, fontSize: 11, marginBottom: 10 },
  diagRow: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  diagCell: { flex: 1, alignItems: 'center' },
  diagLabel: { ...FONTS.label, color: COLORS.textMuted, fontSize: 10, marginBottom: 4 },
  diagValue: { ...FONTS.h3, color: COLORS.textPrimary },
  metricsCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  metricsRow: { flexDirection: 'row', marginBottom: 16 },
  metricBox: { flex: 1 },
  metricLabel: { ...FONTS.label, color: COLORS.textMuted, fontSize: 10, marginBottom: 4 },
  metricVal: { ...FONTS.h3, color: COLORS.textPrimary },
  metricSub: { ...FONTS.bodySmall, color: COLORS.textMuted, marginTop: 2 },
  metricLarge: { ...FONTS.h2, color: COLORS.textPrimary, marginBottom: 4 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },
  ecoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  ecoIcon: { fontSize: 16, marginRight: 8 },
  ecoText: { ...FONTS.bodySmall, color: COLORS.textSecondary, flex: 1, lineHeight: 18 },
  btnPrimary: {
    backgroundColor: COLORS.navy, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginBottom: 12, ...SHADOW,
  },
  btnPrimaryText: { ...FONTS.h3, color: COLORS.white },
  btnSecondary: {
    backgroundColor: COLORS.white, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
    borderWidth: 1.5, borderColor: COLORS.navy,
  },
  btnSecondaryText: { ...FONTS.h3, color: COLORS.navy },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkText: { ...FONTS.body, color: COLORS.textSecondary },
});
