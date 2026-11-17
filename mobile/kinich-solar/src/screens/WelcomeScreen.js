import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { COLORS, FONTS, SHADOW } from '../constants/theme';
import { registrarConsentimiento } from '../api/client';

const DEVICE_ID = Math.floor(Math.random() * 999999);

export default function WelcomeScreen({ navigation }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!accepted) return;
    setLoading(true);
    try {
      await registrarConsentimiento(DEVICE_ID);
    } catch (_) {
      // Si no hay conexión al servidor seguimos; el consentimiento se reintentará al cotizar
    }
    navigation.navigate('Capture', { deviceId: DEVICE_ID });
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Cabecera */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>☀️</Text>
          </View>
          <View>
            <Text style={styles.brand}>Kinich Solar</Text>
            <Text style={styles.brandSub}>ENERGÍA SOLAR · YUCATÁN</Text>
          </View>
        </View>

        {/* Tagline */}
        <Text style={styles.tag}>DIMENSIONAMIENTO TÉCNICO PRELIMINAR</Text>
        <Text style={styles.h1}>
          Envía tu recibo de luz.{'\n'}Recibe tu{'\n'}proyecto solar.
        </Text>
        <Text style={styles.desc}>
          Dimensionamos tu sistema con el consumo real de tu recibo CFE y las tarifas vigentes de la
          península. Sin promesas de costo cero, con números verificables.
        </Text>

        {/* Tarjeta de privacidad */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyHeader}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <Text style={styles.privacyTitle}>Compromiso de privacidad</Text>
          </View>
          <Text style={styles.privacyBody}>
            No almacenamos tu nombre, domicilio, número de servicio CFE ni las imágenes de tu
            recibo. Tu recibo se analiza en memoria únicamente para extraer las cifras de consumo
            energético.
          </Text>
          {[
            'Sin copias en disco ni en caché local',
            'No se comparte con proveedores externos',
            'La sesión se descarta al cerrar la app',
          ].map((item) => (
            <View key={item} style={styles.checkRow}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
          <Text style={styles.privacyVersion}>v1.0 · AVISO DE PRIVACIDAD INTEGRAL</Text>
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAccepted(!accepted)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
            {accepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            Acepto los términos del análisis técnico preliminar y el tratamiento de datos descrito.
          </Text>
        </TouchableOpacity>

        {/* Botón principal */}
        <TouchableOpacity
          style={[styles.btn, !accepted && styles.btnDisabled]}
          onPress={handleStart}
          disabled={!accepted || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {loading ? 'Iniciando...' : 'Iniciar evaluación solar  →'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Estimación preliminar de ingeniería. No sustituye una visita técnica ni constituye una
          cotización vinculante.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: COLORS.amberLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  logoIcon: { fontSize: 22 },
  brand: { ...FONTS.h3, color: COLORS.white },
  brandSub: { ...FONTS.label, color: COLORS.textMuted, fontSize: 10 },
  tag: { ...FONTS.label, color: COLORS.amber, fontSize: 11, marginBottom: 10 },
  h1: { ...FONTS.h1, color: COLORS.white, marginBottom: 14 },
  desc: { ...FONTS.body, color: '#94A3B8', marginBottom: 28, lineHeight: 22 },
  privacyCard: {
    backgroundColor: COLORS.cardNavy, borderRadius: 14,
    padding: 18, marginBottom: 24, borderWidth: 1, borderColor: COLORS.borderDark,
    ...SHADOW,
  },
  privacyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  privacyIcon: { fontSize: 18, marginRight: 8 },
  privacyTitle: { ...FONTS.h3, color: COLORS.white },
  privacyBody: { ...FONTS.body, color: '#94A3B8', marginBottom: 14, lineHeight: 20 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  checkIcon: { color: COLORS.amberLight, fontSize: 14, marginRight: 8, fontWeight: '700' },
  checkText: { ...FONTS.bodySmall, color: '#CBD5E1' },
  privacyVersion: { ...FONTS.label, color: '#475569', marginTop: 14, fontSize: 10 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2,
    borderColor: '#475569', marginRight: 12, alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: COLORS.amberLight, borderColor: COLORS.amberLight },
  checkmark: { color: COLORS.navy, fontSize: 13, fontWeight: '700' },
  checkboxLabel: { ...FONTS.body, color: '#CBD5E1', flex: 1, lineHeight: 20 },
  btn: {
    backgroundColor: COLORS.amberLight, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginBottom: 16, ...SHADOW,
  },
  btnDisabled: { backgroundColor: '#334155' },
  btnText: { ...FONTS.h3, color: COLORS.navy },
  disclaimer: { ...FONTS.bodySmall, color: '#475569', textAlign: 'center', lineHeight: 17 },
});
