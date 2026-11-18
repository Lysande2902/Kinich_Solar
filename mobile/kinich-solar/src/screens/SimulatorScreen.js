import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOW } from '../constants/theme';
import { leerPlaca } from '../api/client';

const APPLIANCES = [
  { key: 'minisplit_inv', label: 'Mini-split inverter', icon: 'snowflake', iconLib: 'mci' },
  { key: 'minisplit_std', label: 'A/C tradicional', icon: 'air-conditioner', iconLib: 'mci' },
  { key: 'refrigerador', label: 'Refrigerador', icon: 'fridge-outline', iconLib: 'mci' },
  { key: 'lavadora', label: 'Lavadora', icon: 'washing-machine', iconLib: 'mci' },
  { key: 'calentador', label: 'Calentador agua', icon: 'water-boiler', iconLib: 'mci' },
  { key: 'ev', label: 'Auto eléctrico', icon: 'car-electric-outline', iconLib: 'mci' },
  { key: 'pump', label: 'Bomba de agua', icon: 'water-pump', iconLib: 'mci' },
  { key: 'custom', label: 'Otro equipo', icon: 'plus-circle-outline', iconLib: 'mci' },
];

const CAPACITIES = ['1.0 ton', '1.5 ton', '2.0 ton'];

// kWh por hora de uso (minisplit) o kWh promedio/hora equivalente para los demás
const KWH_TABLE = {
  minisplit_inv: { '1.0 ton': 0.9, '1.5 ton': 1.1, '2.0 ton': 1.4 },
  minisplit_std: { '1.0 ton': 1.4, '1.5 ton': 1.8, '2.0 ton': 2.4 },
  refrigerador:  { '1.0 ton': 0.10, '1.5 ton': 0.15, '2.0 ton': 0.20 },
  lavadora:      { '1.0 ton': 0.40, '1.5 ton': 0.50, '2.0 ton': 0.60 },
  calentador:    { '1.0 ton': 1.2,  '1.5 ton': 1.5,  '2.0 ton': 2.0  },
  ev:            { '1.0 ton': 7.0,  '1.5 ton': 9.0,  '2.0 ton': 12.0 },
  pump:          { '1.0 ton': 1.0,  '1.5 ton': 1.5,  '2.0 ton': 2.0  },
  custom:        { '1.0 ton': 1.0,  '1.5 ton': 1.0,  '2.0 ton': 1.0  },
};

const PANELS_PER_KW = 2.0;

export default function SimulatorScreen({ navigation, route }) {
  const { cotizacion = {}, deviceId, tarifa } = route.params || {};
  const [appliance, setAppliance] = useState('minisplit_inv');
  const [capacity, setCapacity] = useState('1.5 ton');
  const [hours, setHours] = useState(8);
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedKw, setScannedKw] = useState(null);
  const [customWatts, setCustomWatts] = useState('');

  const baseKwh = cotizacion.kwh_mes || 0;
  const baseKwp = cotizacion.recomendado?.kwp || 0;
  const basePaneles = cotizacion.recomendado?.paneles || 0;
  const baseAhorro = cotizacion.recomendado?.ahorro_mensual || 0;

  const kwhPerHr = appliance === 'custom' && customWatts && !isNaN(parseFloat(customWatts))
    ? parseFloat(customWatts) / 1000
    : scannedKw
      ? scannedKw
      : (KWH_TABLE[appliance]?.[capacity] || 1.1);

  const addedKwhMonth = Math.round(kwhPerHr * hours * 30);
  const addedPanels = Math.max(1, Math.ceil((addedKwhMonth / 30 / 4.5) * PANELS_PER_KW));
  const newKwp = +(baseKwp + addedPanels * 0.55).toFixed(2);
  const newPaneles = basePaneles + addedPanels;
  const newCostMin = Math.round(newKwp * 20250);
  const newCostMax = Math.round(newKwp * 24750);
  const newAhorro = Math.round(baseAhorro + (addedKwhMonth * 1.85));

  const handleActualizar = () => {
    // Clonamos y ajustamos la cotización con el nuevo consumo y paneles
    const cotizacionAjustada = {
      ...cotizacion,
      kwh_mes: baseKwh + addedKwhMonth,
      recomendado: {
        ...(cotizacion.recomendado || {}),
        paneles: newPaneles,
        kwp: newKwp,
        costo_min: newCostMin,
        costo_max: newCostMax,
        ahorro_mensual: newAhorro,
        retorno_anios: cotizacion.recomendado?.retorno_anios || 8.5,
      },
      opciones: (cotizacion.opciones || []).map((op, idx) => {
        const extraP = idx === 0 ? Math.max(1, addedPanels - 1) : idx === 2 ? addedPanels + 1 : addedPanels;
        const totKwp = +(op.kwp + (extraP * 0.55)).toFixed(2);
        return {
          ...op,
          paneles: op.paneles + extraP,
          kwp: totKwp,
          costo_min: Math.round(totKwp * 20250),
          costo_max: Math.round(totKwp * 24750),
          ahorro_mensual: Math.round(op.ahorro_mensual + (addedKwhMonth * 1.85)),
          retorno_anios: op.retorno_anios || 8.5,
        };
      }),
    };

    navigation.navigate('Proposal', {
      cotizacionAjustada,
      deviceId,
      tarifa,
    });
  };

  const scanPlate = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled) {
      setScanLoading(true);
      try {
        const res = await leerPlaca(result.assets[0].uri);
        const kw = res.data?.potencia_w ? res.data.potencia_w / 1000 : null;
        if (kw) {
          setScannedKw(kw);
          Alert.alert('Placa leída', `Potencia detectada: ${res.data.potencia_w} W`);
        } else {
          Alert.alert('Sin potencia detectada', 'No se pudo extraer la potencia de la placa. Ingresa manualmente.');
        }
      } catch {
        Alert.alert('Aviso del servicio', 'No fue posible procesar la placa en este momento. Por favor verifica tu conexión o intenta nuevamente.');
      } finally {
        setScanLoading(false);
      }
    }
  };

  const HoursSlider = () => (
    <View style={styles.sliderRow}>
      {[2, 4, 6, 8, 10, 12].map((h) => (
        <TouchableOpacity
          key={h}
          style={[styles.hourBtn, hours === h && styles.hourBtnActive]}
          onPress={() => setHours(h)}
        >
          <Text style={[styles.hourText, hours === h && styles.hourTextActive]}>{h}h</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.headerRow}>
          <Text style={styles.h1}>Simulador de consumo</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Propuesta actual */}
        <View style={styles.currentBar}>
          <Text style={styles.currentLabel}>PROPUESTA ACTUAL</Text>
          <Text style={styles.currentVal}>{baseKwh} kWh/mes</Text>
          <Text style={styles.separator}>·</Text>
          <Text style={styles.currentVal}>{baseKwp} kWp</Text>
        </View>

        {/* Tipo de equipo */}
        <Text style={styles.sectionLabel}>Tipo de equipo</Text>
        <View style={styles.applianceGrid}>
          {APPLIANCES.map((a) => (
            <TouchableOpacity
              key={a.key}
              style={[styles.appBtn, appliance === a.key && styles.appBtnActive]}
              onPress={() => { setAppliance(a.key); setScannedKw(null); setCustomWatts(''); }}
              activeOpacity={0.8}
            >
              <View style={styles.appIcon}>
                {a.iconLib === 'mci'
                  ? <MaterialCommunityIcons name={a.icon} size={24} color={appliance === a.key ? COLORS.white : COLORS.navy} />
                  : <Feather name={a.icon} size={22} color={appliance === a.key ? COLORS.white : COLORS.navy} />
                }
              </View>
              <Text style={[styles.appLabel, appliance === a.key && styles.appLabelActive]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Capacidad (solo minisplit) */}
        {appliance.startsWith('minisplit') && (
          <>
            <Text style={styles.sectionLabel}>Capacidad</Text>
            <View style={styles.capacityRow}>
              {CAPACITIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.capBtn, capacity === c && styles.capBtnActive]}
                  onPress={() => setCapacity(c)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.capText, capacity === c && styles.capTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Tecnología</Text>
            <View style={styles.techRow}>
              <TouchableOpacity
                style={[styles.techBtn, appliance === 'minisplit_inv' && styles.techBtnActive]}
                onPress={() => setAppliance('minisplit_inv')}
              >
                <Text style={[styles.techText, appliance === 'minisplit_inv' && styles.techTextActive]}>Inverter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.techBtn, appliance === 'minisplit_std' && styles.techBtnActive]}
                onPress={() => setAppliance('minisplit_std')}
              >
                <Text style={[styles.techText, appliance === 'minisplit_std' && styles.techTextActive]}>Estándar</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Campo de wattaje para "Otro equipo" */}
        {appliance === 'custom' && (
          <View style={styles.customBlock}>
            <Text style={styles.sectionLabel}>Wattaje del equipo (W)</Text>
            <TextInput
              style={styles.customInput}
              value={customWatts}
              onChangeText={setCustomWatts}
              keyboardType="numeric"
              placeholder="Ej. 800"
              placeholderTextColor="#94A3B8"
              selectTextOnFocus
            />
            <Text style={styles.customHint}>
              Escribe el consumo en Watts del equipo. Lo encontrarás en su placa técnica o etiqueta energética.
            </Text>
          </View>
        )}

        {/* Horas */}
        <View style={styles.hoursHeader}>
          <Text style={styles.sectionLabel}>Horas de uso al día</Text>
          <Text style={styles.hoursVal}>{hours} h</Text>
        </View>
        <HoursSlider />

        {/* Escanear placa */}
        <TouchableOpacity style={styles.scanBtn} onPress={scanPlate} activeOpacity={0.8}>
          <MaterialCommunityIcons name="camera" size={24} color={COLORS.amber} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.scanTitle}>Escanear placa técnica</Text>
            <Text style={styles.scanSub}>
              {scannedKw
                ? `Potencia detectada: ${(scannedKw * 1000).toFixed(0)} W`
                : 'Fotografía la placa y la IA extrae wattaje y amperaje.'}
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Resultado */}
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultDelta}>+{addedKwhMonth} kWh</Text>
            <View style={styles.panelsBadge}>
              <Text style={styles.panelsBadgeText}>+{addedPanels} paneles</Text>
            </View>
          </View>
          <Text style={styles.resultSub}>
            Este equipo sumará ~{addedKwhMonth} kWh/mes a tu consumo actual.
          </Text>
          <View style={styles.resultDivider} />
          <View style={styles.resultRow}>
            <View>
              <Text style={styles.resultLabel}>NUEVA POTENCIA</Text>
              <Text style={styles.resultVal}>{newKwp} kWp</Text>
            </View>
            <View>
              <Text style={styles.resultLabel}>INVERSIÓN AJUSTADA</Text>
              <Text style={styles.resultVal}>
                ${newCostMin.toLocaleString('es-MX')} – ${newCostMax.toLocaleString('es-MX')}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.updateBtn} onPress={handleActualizar} activeOpacity={0.85}>
          <Text style={styles.updateText}>Actualizar propuesta  ↺</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  scroll: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h1: { ...FONTS.h2, color: COLORS.textPrimary },
  close: { fontSize: 20, color: COLORS.textMuted },
  currentBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgSoft,
    borderRadius: 10, padding: 10, marginBottom: 20, gap: 8,
  },
  currentLabel: { ...FONTS.label, color: COLORS.textMuted, fontSize: 10 },
  currentVal: { ...FONTS.bodySmall, color: COLORS.textPrimary, fontWeight: '600' },
  separator: { color: COLORS.textMuted },
  sectionLabel: { ...FONTS.h3, color: COLORS.textPrimary, marginBottom: 10, marginTop: 8 },
  applianceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  appBtn: {
    flex: 1, minWidth: '45%', padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center',
  },
  appBtnActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  appIcon: { fontSize: 24, marginBottom: 4 },
  appLabel: { ...FONTS.bodySmall, color: COLORS.textSecondary, textAlign: 'center' },
  appLabelActive: { color: COLORS.white, fontWeight: '600' },
  capacityRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  capBtn: {
    flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5,
    borderColor: COLORS.border, alignItems: 'center',
  },
  capBtnActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  capText: { ...FONTS.body, color: COLORS.textSecondary },
  capTextActive: { color: COLORS.white, fontWeight: '600' },
  techRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  techBtn: {
    flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5,
    borderColor: COLORS.border, alignItems: 'center',
  },
  techBtnActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  techText: { ...FONTS.body, color: COLORS.textSecondary },
  techTextActive: { color: COLORS.white, fontWeight: '600' },
  hoursHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hoursVal: { ...FONTS.h3, color: COLORS.amber },
  sliderRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  hourBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    backgroundColor: COLORS.bgSoft, alignItems: 'center',
  },
  hourBtnActive: { backgroundColor: COLORS.navy },
  hourText: { ...FONTS.bodySmall, color: COLORS.textSecondary },
  hourTextActive: { color: COLORS.white, fontWeight: '600' },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgSoft, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.amber,
    padding: 14, marginBottom: 16,
  },
  scanIcon: { fontSize: 24, marginRight: 12 },
  scanTitle: { ...FONTS.h3, color: COLORS.textPrimary },
  scanSub: { ...FONTS.bodySmall, color: COLORS.textSecondary, marginTop: 2 },
  arrow: { fontSize: 24, color: COLORS.textMuted },
  resultCard: {
    backgroundColor: COLORS.amberWarnLight, borderRadius: 14,
    padding: 18, marginBottom: 16, borderWidth: 1.5, borderColor: COLORS.amberLight,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  resultDelta: { ...FONTS.h2, color: COLORS.textPrimary, marginRight: 10 },
  panelsBadge: { backgroundColor: COLORS.navy, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  panelsBadgeText: { ...FONTS.bodySmall, color: COLORS.white, fontWeight: '700' },
  resultSub: { ...FONTS.bodySmall, color: COLORS.textSecondary, marginBottom: 10 },
  resultDivider: { height: 1, backgroundColor: '#FDE68A', marginBottom: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resultLabel: { ...FONTS.label, color: COLORS.textMuted, fontSize: 10, marginBottom: 4 },
  resultVal: { ...FONTS.h3, color: COLORS.textPrimary },
  updateBtn: {
    backgroundColor: COLORS.navy, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginBottom: 10, ...SHADOW,
  },
  updateText: { ...FONTS.h3, color: COLORS.white },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { ...FONTS.body, color: COLORS.textMuted },
  customBlock: { backgroundColor: COLORS.bgSoft, borderRadius: 12, padding: 14, marginBottom: 8 },
  customInput: {
    ...FONTS.h2, color: COLORS.textPrimary,
    borderWidth: 1.5, borderColor: COLORS.amber,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 6,
  },
  customHint: { ...FONTS.bodySmall, color: COLORS.textMuted, lineHeight: 16 },
});
