import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, TextInput, Alert,
} from 'react-native';
import { COLORS, FONTS, SHADOW } from '../constants/theme';
import { cotizar } from '../api/client';

const ROOF_OPTS = ['Losa de concreto', 'Lámina metálica', 'Teja de barro', 'No estoy seguro'];
const SHADE_OPTS = ['Sin sombra', 'Parcial', 'Alta'];
const ORI_OPTS = ['Sur', 'Sureste / Suroeste', 'Este u Oeste', 'Norte'];

const SHADE_MAP = { 'Sin sombra': 'ninguna', Parcial: 'parcial', Alta: 'alta' };
const ORI_MAP = { Sur: 'sur', 'Sureste / Suroeste': 'sureste', 'Este u Oeste': 'este', Norte: 'norte' };

export default function VerificationScreen({ navigation, route }) {
  const { datos = {}, deviceId, esManual = false } = route.params || {};

  const [kwh, setKwh] = useState(String(datos.kwh_periodo || ''));
  const [tarifa, setTarifa] = useState(datos.tarifa || '1C');
  const [total, setTotal] = useState(String(datos.total_pagar || ''));
  const [inicio, setInicio] = useState(datos.periodo_inicio || '');
  const [fin, setFin] = useState(datos.periodo_fin || '');
  const [roof, setRoof] = useState('Losa de concreto');
  const [shade, setShade] = useState('Sin sombra');
  const [ori, setOri] = useState('Sur');
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    if (!kwh || !total) {
      Alert.alert('Datos incompletos', 'Por favor confirma el consumo y el total pagado.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        kwh_periodo: parseFloat(kwh),
        tarifa,
        inicio: inicio || null,
        fin: fin || null,
        total_pagar: parseFloat(total),
        telegram_id: deviceId || 999999,
        sombra: SHADE_MAP[shade],
        orientacion: ORI_MAP[ori],
      };
      const res = await cotizar(payload);
      navigation.navigate('Proposal', { cotizacion: res.data, deviceId, tarifa });
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Error al calcular. Verifica la conexión con el servidor.';
      Alert.alert('Error de cálculo', msg);
    } finally {
      setLoading(false);
    }
  };

  const InfoRow = ({ label, value, editable, onChangeText }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {editable ? (
        <TextInput
          style={styles.infoInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          selectTextOnFocus
        />
      ) : (
        <Text style={styles.infoValue}>{value}</Text>
      )}
    </View>
  );

  const Chip = ({ label, selected, onPress }) => (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.progress}>
        <Text style={styles.step}>PASO 2 DE 4</Text>
        <View style={styles.bar}><View style={[styles.barFill, { width: '50%' }]} /></View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Verificación técnica</Text>
        <Text style={styles.sub}>Revisa los datos extraídos de tu recibo y describe el techo donde irán los paneles.</Text>

        {/* Sección A */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>A · DATOS DEL RECIBO</Text>
          <View style={[styles.confBadge, esManual && { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.confText, esManual && { color: COLORS.amberWarn }]}>
              {esManual ? '✎ CAPTURA MANUAL' : '✓ LECTURA AUTOMÁTICA'}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <View style={styles.row2}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.fieldLabel}>CONSUMO DEL PERIODO</Text>
              <InfoRow label="" value={kwh} editable onChangeText={setKwh} />
              <Text style={styles.unit}>kWh</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>TARIFA DETECTADA</Text>
              <Text style={styles.bigValue}>{tarifa}</Text>
            </View>
          </View>
          <View style={[styles.row2, { marginTop: 12 }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.fieldLabel}>PERÍODO FACTURADO</Text>
              <Text style={styles.fieldValue}>{inicio || '—'} · {fin || '—'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>TOTAL PAGADO</Text>
              <InfoRow label="" value={total} editable onChangeText={setTotal} />
              <Text style={styles.unit}>MXN</Text>
            </View>
          </View>
          <Text style={styles.editHint}>Corrige cualquier dato que no coincida con tu recibo mensual.</Text>
        </View>

        {/* Sección B */}
        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <Text style={styles.sectionLabel}>B · LEVANTAMIENTO DE TECHO</Text>
          <Text style={styles.miniNote}>2 min de tu tiempo</Text>
        </View>

        <Text style={styles.questionLabel}>Tipo de techo</Text>
        <View style={styles.chipGrid}>
          {ROOF_OPTS.map((r) => <Chip key={r} label={r} selected={roof === r} onPress={() => setRoof(r)} />)}
        </View>

        <Text style={styles.questionLabel}>Nivel de sombra</Text>
        <View style={styles.chipGrid}>
          {SHADE_OPTS.map((s) => (
            <View key={s} style={{ flex: 1, marginHorizontal: 4 }}>
              <Chip label={s} selected={shade === s} onPress={() => setShade(s)} />
              {s === 'Sin sombra' && <Text style={styles.optNote}>ÓPTIMO</Text>}
              {s === 'Alta' && <Text style={[styles.optNote, { color: COLORS.red }]}>EVITAR</Text>}
            </View>
          ))}
        </View>

        <Text style={styles.questionLabel}>Orientación principal</Text>
        <View style={styles.chipGrid}>
          {ORI_OPTS.map((o) => (
            <View key={o} style={{ flex: 1, marginHorizontal: 4 }}>
              <Chip label={o} selected={ori === o} onPress={() => setOri(o)} />
              {o === 'Sur' && <Text style={styles.optNote}>ÓPTIMO SUR</Text>}
            </View>
          ))}
        </View>

        {shade !== 'Sin sombra' && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>
              La sombra parcial reduce hasta 30% la generación; el dimensionamiento ya lo considera.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnLoading]}
          onPress={handleCalculate}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {loading ? 'Calculando...' : 'Calcular proyecto solar  ☀'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footNote}>CÁLCULO IN SITU · DETERMINISTA · 3–5 S</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  progress: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  step: { ...FONTS.label, color: COLORS.textMuted, marginBottom: 6, fontSize: 10 },
  bar: { height: 3, backgroundColor: COLORS.border, borderRadius: 2 },
  barFill: { height: 3, backgroundColor: COLORS.amber, borderRadius: 2 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 },
  h1: { ...FONTS.h1, fontSize: 26, color: COLORS.textPrimary, marginBottom: 6 },
  sub: { ...FONTS.body, color: COLORS.textSecondary, marginBottom: 20, lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between' },
  sectionLabel: { ...FONTS.label, color: COLORS.amber, fontSize: 11 },
  confBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  confText: { ...FONTS.label, color: COLORS.green, fontSize: 10 },
  miniNote: { ...FONTS.bodySmall, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.navy, borderRadius: 14, padding: 16, ...SHADOW },
  row2: { flexDirection: 'row' },
  fieldLabel: { ...FONTS.label, color: '#94A3B8', fontSize: 10, marginBottom: 4 },
  bigValue: { ...FONTS.h2, color: COLORS.amberLight },
  fieldValue: { ...FONTS.body, color: COLORS.white },
  unit: { ...FONTS.bodySmall, color: '#94A3B8', marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { ...FONTS.bodySmall, color: '#94A3B8' },
  infoInput: {
    ...FONTS.h2, color: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.amber,
    paddingVertical: 2, minWidth: 80,
  },
  infoValue: { ...FONTS.h3, color: COLORS.white },
  editHint: { ...FONTS.bodySmall, color: '#475569', marginTop: 10 },
  questionLabel: { ...FONTS.h3, color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    flex: 1, minWidth: '45%', padding: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.white, alignItems: 'center',
  },
  chipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  chipText: { ...FONTS.body, color: COLORS.textPrimary, textAlign: 'center' },
  chipTextActive: { color: COLORS.white, fontWeight: '600' },
  optNote: { ...FONTS.label, fontSize: 9, color: COLORS.amber, textAlign: 'center', marginTop: 3 },
  alertBox: {
    backgroundColor: '#FEF3C7', borderRadius: 10, borderWidth: 1,
    borderColor: '#FDE68A', padding: 12, marginTop: 12, marginBottom: 8,
  },
  alertText: { ...FONTS.bodySmall, color: '#92400E', lineHeight: 18 },
  btn: {
    backgroundColor: COLORS.navy, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginTop: 24, ...SHADOW,
  },
  btnLoading: { backgroundColor: '#475569' },
  btnText: { ...FONTS.h3, color: COLORS.white },
  footNote: { ...FONTS.label, color: COLORS.textMuted, textAlign: 'center', marginTop: 10, fontSize: 10 },
});
