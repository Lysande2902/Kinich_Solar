import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ScrollView,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOW } from '../constants/theme';

const TARIFA_PRESETS = [
  { ciudad: 'Mérida / Cancún / Costa', tarifa: '1C', desc: 'Clima muy cálido' },
  { ciudad: 'Centro de México / CDMX', tarifa: '1', desc: 'Clima templado' },
  { ciudad: 'Norte / Hermosillo / Mty', tarifa: '1F', desc: 'Verano extremo' },
];

export default function QuickEstimateScreen({ navigation, route }) {
  const { deviceId } = route.params || {};
  const [pagoBimestral, setPagoBimestral] = useState('');
  const [tarifaIndex, setTarifaIndex] = useState(0);

  const handleEstimar = () => {
    const pago = parseFloat(pagoBimestral);
    if (!pago || isNaN(pago) || pago < 200) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto estimado de tu recibo (mínimo $200 MXN).');
      return;
    }

    const sel = TARIFA_PRESETS[tarifaIndex];
    // Estimación inversa: aproximadamente $2.10 MXN por kWh en tarifa intermedia/residencial
    const kwhAprox = Math.round(pago / 2.10);

    // Navegamos directamente a VerificationScreen con los datos pre-calculados
    navigation.navigate('Verification', {
      datos: {
        kwh_periodo: kwhAprox,
        tarifa: sel.tarifa,
        total_pagar: pago,
        periodo_inicio: '',
        periodo_fin: '',
      },
      deviceId,
      esManual: true,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={COLORS.navy} />
          </TouchableOpacity>
          <Text style={styles.h1}>Cotización rápida</Text>
        </View>

        <Text style={styles.sub}>
          ¿No tienes tu recibo a la mano? No te preocupes. Con lo que pagas aproximadamente al bimestre calculamos tu proyecto solar.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>¿CUÁNTO PAGAS AL BIMESTRE APROXIMADAMENTE?</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 2,500"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={pagoBimestral}
              onChangeText={setPagoBimestral}
              autoFocus
            />
            <Text style={styles.currencySuffix}>MXN</Text>
          </View>
          <Text style={styles.hint}>
            Suma o promedio de lo que sueles pagar cada 2 meses a CFE.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>UBICACIÓN / ZONA TÉRMICA</Text>
          {TARIFA_PRESETS.map((p, idx) => (
            <TouchableOpacity
              key={p.tarifa}
              style={[styles.presetBtn, tarifaIndex === idx && styles.presetBtnActive]}
              onPress={() => setTarifaIndex(idx)}
              activeOpacity={0.8}
            >
              <View style={styles.radio}>
                {tarifaIndex === idx && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.presetTitle, tarifaIndex === idx && styles.presetTitleActive]}>
                  {p.ciudad}
                </Text>
                <Text style={styles.presetDesc}>{p.desc} · Tarifa CFE {p.tarifa}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.calcBtn} onPress={handleEstimar} activeOpacity={0.85}>
          <MaterialCommunityIcons name="calculator-variant-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
          <Text style={styles.calcBtnText}>Calcular propuesta ahora</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Podrás afinar o cambiar los números en cualquier momento antes de guardar tu propuesta.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSoft },
  scroll: { paddingHorizontal: 24, paddingVertical: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { marginRight: 12, padding: 4 },
  h1: { ...FONTS.h1, fontSize: 24, color: COLORS.textPrimary },
  sub: { ...FONTS.body, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 22 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 16,
    padding: 20, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  label: { ...FONTS.label, color: COLORS.textMuted, fontSize: 10, marginBottom: 10 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.amber, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 8,
  },
  currencyPrefix: { ...FONTS.h2, color: COLORS.amber, marginRight: 6 },
  input: { flex: 1, ...FONTS.h2, color: COLORS.textPrimary },
  currencySuffix: { ...FONTS.bodySmall, color: COLORS.textMuted, fontWeight: '700' },
  hint: { ...FONTS.bodySmall, color: COLORS.textMuted, marginBottom: 8 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  presetBtn: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, borderWidth: 1.5,
    borderColor: COLORS.border, marginBottom: 8,
  },
  presetBtnActive: { borderColor: COLORS.navy, backgroundColor: '#F1F5F9' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.navy,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.amber },
  presetTitle: { ...FONTS.h3, color: COLORS.textPrimary, fontSize: 14 },
  presetTitleActive: { color: COLORS.navy, fontWeight: '700' },
  presetDesc: { ...FONTS.bodySmall, color: COLORS.textMuted, marginTop: 2 },
  calcBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.navy, borderRadius: 14,
    paddingVertical: 18, marginBottom: 12, ...SHADOW,
  },
  calcBtnText: { ...FONTS.h3, color: COLORS.white },
  note: { ...FONTS.bodySmall, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
});
