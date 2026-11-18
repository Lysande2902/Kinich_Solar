import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Modal, Alert
} from 'react-native';

import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOW } from '../constants/theme';
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

        {/* Cabecera con botón de Ajustes de Conexión */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="solar-panel" size={26} color={COLORS.amber} />
            </View>
            <View>
              <Text style={styles.brand}>Kinich Solar</Text>
              <Text style={styles.brandSub}>ENERGÍA SOLAR · YUCATÁN</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('History', { deviceId: DEVICE_ID })}
              activeOpacity={0.7}
            >
              <Feather name="folder" size={18} color={COLORS.navy} />
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

        {/* Tagline */}
        <Text style={styles.tag}>DIMENSIONAMIENTO TÉCNICO PRELIMINAR</Text>
        <Text style={styles.h1}>
          Envía tu recibo de luz.{'\n'}Recibe tu{'\n'}proyecto solar.
        </Text>
        <Text style={styles.desc}>
          Dimensionamos tu sistema con el consumo real de tu recibo CFE y las tarifas vigentes de la
          península. Sin promesas de costo cero, con números verificables.
        </Text>

        {/* Indicador de IP de servidor */}
        <TouchableOpacity
          style={styles.serverPill}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.serverDot} />
          <Text style={styles.serverText} numberOfLines={1}>
            API: {currentUrl}
          </Text>
          <Text style={styles.serverEdit}>Cambiar</Text>
        </TouchableOpacity>

        {/* Tarjeta de privacidad */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyHeader}>
            <Feather name="lock" size={16} color={COLORS.navy} style={{ marginRight: 8 }} />
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
              <Feather name="check" size={13} color={COLORS.amber} style={{ marginRight: 6 }} />
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

      {/* Modal de Configuración de Servidor */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ajustes de Conexión</Text>
            <Text style={styles.modalDesc}>
              Indica la dirección IP de tu computadora o túnel donde corre el backend FastAPI:
            </Text>
            <TextInput
              style={styles.modalInput}
              value={inputUrl}
              onChangeText={setInputUrl}
              placeholder="http://192.168.1.XX:8000"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSave}
                onPress={handleSaveUrl}
              >
                <Text style={styles.modalBtnSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  logoBox: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: COLORS.amberLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  logoIcon: { fontSize: 22 },
  brand: { ...FONTS.h3, color: COLORS.white },
  brandSub: { ...FONTS.label, color: COLORS.textMuted, fontSize: 10 },
  settingsBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  settingsIcon: { fontSize: 18 },
  tag: { ...FONTS.label, color: COLORS.amber, fontSize: 11, marginBottom: 10 },
  h1: { ...FONTS.h1, color: COLORS.white, marginBottom: 14 },
  desc: { ...FONTS.body, color: '#94A3B8', marginBottom: 20, lineHeight: 22 },
  serverPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  serverDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green, marginRight: 8 },
  serverText: { ...FONTS.bodySmall, color: '#CBD5E1', flex: 1 },
  serverEdit: { ...FONTS.label, color: COLORS.amberLight, fontSize: 10, marginLeft: 8 },
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
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', backgroundColor: COLORS.navy, borderRadius: 16,
    padding: 24, borderWidth: 1, borderColor: COLORS.borderDark, ...SHADOW,
  },
  modalTitle: { ...FONTS.h2, color: COLORS.white, marginBottom: 8 },
  modalDesc: { ...FONTS.bodySmall, color: '#94A3B8', marginBottom: 16, lineHeight: 18 },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, color: COLORS.white,
    borderWidth: 1, borderColor: '#475569', marginBottom: 20,
    fontSize: 14,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtnCancel: { paddingHorizontal: 16, paddingVertical: 10 },
  modalBtnCancelText: { ...FONTS.body, color: '#94A3B8' },
  modalBtnSave: {
    backgroundColor: COLORS.amberLight, borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  modalBtnSaveText: { ...FONTS.h3, color: COLORS.navy, fontSize: 14 },
});
