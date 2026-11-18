import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Modal, Alert
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOW, SHADOW_LG } from '../constants/theme';
import { registrarConsentimiento, getServerUrl, setServerUrl } from '../api/client';

const DEVICE_ID = Math.floor(Math.random() * 999999);

export default function WelcomeScreen({ navigation }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');

  useEffect(() => {
    (async () => {
      const url = await getServerUrl();
      setCurrentUrl(url);
      setInputUrl(url);
    })();
  }, []);

  const handleSaveUrl = async () => {
    if (!inputUrl.trim()) return;
    const updated = await setServerUrl(inputUrl);
    setCurrentUrl(updated);
    setModalVisible(false);
    Alert.alert('Servidor actualizado', `Conectando ahora a: ${updated}`);
  };

  const handleStart = async () => {
    if (!accepted) return;
    setLoading(true);
    try {
      await registrarConsentimiento(DEVICE_ID);
    } catch (_) {}
    navigation.navigate('Capture', { deviceId: DEVICE_ID });
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Cabecera Premium */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="solar-power-variant" size={28} color={COLORS.amber} />
            </View>
            <View>
              <Text style={styles.brand}>Kinich Solar</Text>
              <Text style={styles.brandSub}>INGENIERÍA FOTOVOLTAICA · YUCATÁN</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Guide')}
              activeOpacity={0.7}
            >
              <Feather name="book-open" size={18} color={COLORS.navy} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('History', { deviceId: DEVICE_ID })}
              activeOpacity={0.7}
            >
              <Feather name="clock" size={18} color={COLORS.navy} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <Feather name="settings" size={18} color={COLORS.navy} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.tagBadge}>
            <MaterialCommunityIcons name="lightning-bolt" size={14} color={COLORS.amber} style={{ marginRight: 4 }} />
            <Text style={styles.tag}>DIMENSIONAMIENTO REAL CFE</Text>
          </View>
          <Text style={styles.h1}>
            Convierte tu recibo de luz en ahorro garantizado.
          </Text>
          <Text style={styles.desc}>
            Análisis instantáneo con radiación satelital PVGIS y escalones tarifarios reales de la península.
          </Text>

          {/* Quick stats banner */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Verificable</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>$0</Text>
              <Text style={styles.statLabel}>Sin costo</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>3 seg</Text>
              <Text style={styles.statLabel}>Cálculo IA</Text>
            </View>
          </View>
        </View>

        {/* Estado de conexión discreto */}
        <TouchableOpacity
          style={styles.serverPill}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.serverDot} />
          <Text style={styles.serverText} numberOfLines={1}>
            Servidor: {currentUrl}
          </Text>
          <Text style={styles.serverEdit}>Cambiar IP</Text>
        </TouchableOpacity>

        {/* Tarjeta de privacidad y protección de datos */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyHeader}>
            <View style={styles.shieldBox}>
              <Feather name="shield" size={16} color={COLORS.navy} />
            </View>
            <Text style={styles.privacyTitle}>Privacidad y Datos Protegidos</Text>
          </View>
          <Text style={styles.privacyBody}>
            Tu recibo se procesa temporalmente en memoria únicamente para extraer consumo y tarifa. No guardamos tu nombre, dirección ni fotos en servidores.
          </Text>
          <View style={styles.checkGrid}>
            {[
              'Cumplimiento de Ley de Datos Personales',
              'Sin registro de tarjetas ni cobros',
              'Eliminación de datos con un clic (ARCO)',
            ].map((item) => (
              <View key={item} style={styles.checkRow}>
                <Feather name="check-circle" size={14} color={COLORS.green} style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Checkbox de aceptación */}
        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setAccepted(!accepted)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
            {accepted && <Feather name="check" size={16} color={COLORS.white} />}
          </View>
          <Text style={styles.consentText}>
            Acepto los términos de dimensionamiento técnico y el aviso de privacidad de Kinich Solar.
          </Text>
        </TouchableOpacity>

        {/* Botón principal */}
        <TouchableOpacity
          style={[styles.btn, (!accepted || loading) && styles.btnDisabled]}
          onPress={handleStart}
          disabled={!accepted || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {loading ? 'Iniciando...' : 'Comenzar cotización  →'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          DISEÑADO PARA EXPO GO · REACT NATIVE NATIVO
        </Text>

      </ScrollView>

      {/* Modal de configuración de IP */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configurar Servidor</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              Ingresa la dirección IP de tu computadora para que la app móvil en Expo Go se comunique con el backend.
            </Text>
            <TextInput
              style={styles.ipInput}
              value={inputUrl}
              onChangeText={setInputUrl}
              placeholder="http://192.168.1.XX:8000"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleSaveUrl}
              >
                <Text style={styles.modalSaveText}>Guardar IP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSoft },
  scroll: { paddingHorizontal: 22, paddingBottom: 40, paddingTop: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  logoBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.navy, alignItems: 'center',
    justifyContent: 'center', marginRight: 12, ...SHADOW,
  },
  brand: { ...FONTS.h2, color: COLORS.navy, fontSize: 20 },
  brandSub: { ...FONTS.label, color: COLORS.amber, fontSize: 9 },
  settingsBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.white, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  heroCard: {
    backgroundColor: COLORS.navy, borderRadius: 20,
    padding: 24, marginBottom: 16, ...SHADOW_LG,
  },
  tagBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12,
  },
  tag: { ...FONTS.label, color: COLORS.amberLight, fontSize: 10 },
  h1: { ...FONTS.h1, color: COLORS.white, fontSize: 26, marginBottom: 10 },
  desc: { ...FONTS.body, color: '#94A3B8', marginBottom: 20, lineHeight: 22 },
  statsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
    justifyContent: 'space-between', alignItems: 'center',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { ...FONTS.h3, color: COLORS.amberLight, fontSize: 16 },
  statLabel: { ...FONTS.bodySmall, color: '#94A3B8', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  serverPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  serverDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green, marginRight: 8 },
  serverText: { ...FONTS.bodySmall, color: COLORS.textSecondary, flex: 1 },
  serverEdit: { ...FONTS.label, color: COLORS.navy, fontSize: 10 },
  privacyCard: {
    backgroundColor: COLORS.white, borderRadius: 16,
    padding: 18, marginBottom: 20, borderWidth: 1,
    borderColor: COLORS.border, ...SHADOW,
  },
  privacyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  shieldBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#F1F5F9', alignItems: 'center',
    justifyContent: 'center', marginRight: 10,
  },
  privacyTitle: { ...FONTS.h3, color: COLORS.navy, fontSize: 15 },
  privacyBody: { ...FONTS.bodySmall, color: COLORS.textSecondary, marginBottom: 14, lineHeight: 18 },
  checkGrid: { gap: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkText: { ...FONTS.bodySmall, color: COLORS.textSecondary, flex: 1 },
  consentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.navy,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkboxActive: { backgroundColor: COLORS.navy },
  consentText: { ...FONTS.bodySmall, color: COLORS.textSecondary, flex: 1, lineHeight: 18 },
  btn: {
    backgroundColor: COLORS.navy, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginBottom: 12, ...SHADOW,
  },
  btnDisabled: { backgroundColor: '#94A3B8' },
  btnText: { ...FONTS.h3, color: COLORS.white, fontWeight: '700' },
  footerNote: { ...FONTS.label, color: COLORS.textMuted, fontSize: 9, textAlign: 'center', marginTop: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 22, ...SHADOW_LG },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { ...FONTS.h2, color: COLORS.navy, fontSize: 18 },
  modalDesc: { ...FONTS.bodySmall, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 18 },
  ipInput: {
    ...FONTS.body, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 20, color: COLORS.navy,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#F1F5F9' },
  modalCancelText: { ...FONTS.bodySmall, color: COLORS.textSecondary, fontWeight: '600' },
  modalSave: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 10, backgroundColor: COLORS.navy },
  modalSaveText: { ...FONTS.bodySmall, color: COLORS.white, fontWeight: '700' },
});
