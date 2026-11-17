import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, Alert, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, FONTS, SHADOW } from '../constants/theme';
import { leerRecibo } from '../api/client';

export default function CaptureScreen({ navigation, route }) {
  const { deviceId } = route.params || {};
  const [loading, setLoading] = useState(false);

  const processFile = async (uri, mimeType, name) => {
    setLoading(true);
    navigation.navigate('Analyzing');
    try {
      const res = await leerRecibo(uri, mimeType, name);
      navigation.navigate('Verification', { datos: res.data, deviceId });
    } catch (err) {
      navigation.goBack();
      const msg =
        err?.response?.data?.detail ||
        'No pudimos leer el recibo. Asegúrate de que la imagen esté bien iluminada y sea legible.';
      Alert.alert('Error de lectura', msg);
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para fotografiar tu recibo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      processFile(asset.uri, 'image/jpeg', 'recibo.jpg');
    }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      processFile(asset.uri, 'image/jpeg', 'recibo.jpg');
    }
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      processFile(asset.uri, 'application/pdf', asset.name || 'recibo.pdf');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Progress bar */}
      <View style={styles.progress}>
        <Text style={styles.step}>PASO 1 DE 4</Text>
        <View style={styles.bar}><View style={[styles.barFill, { width: '25%' }]} /></View>
      </View>

      <View style={styles.content}>
        <Text style={styles.h1}>Captura tu recibo CFE</Text>
        <Text style={styles.sub}>
          Del recibo extraemos consumo, tarifa, periodo e importe. Nada más se conserva.
        </Text>

        <TouchableOpacity style={styles.option} onPress={takePhoto} activeOpacity={0.8}>
          <View style={[styles.icon, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.iconText}>📷</Text>
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Tomar foto del recibo</Text>
            <Text style={styles.optionDesc}>Usa la cámara para capturar el recibo físico.</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={pickImage} activeOpacity={0.8}>
          <View style={[styles.icon, { backgroundColor: '#EDE9FE' }]}>
            <Text style={styles.iconText}>🖼️</Text>
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Elegir de la galería</Text>
            <Text style={styles.optionDesc}>Imagen JPEG o PNG de hasta 10 MB.</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={pickPdf} activeOpacity={0.8}>
          <View style={[styles.icon, { backgroundColor: '#DCFCE7' }]}>
            <Text style={styles.iconText}>📄</Text>
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Subir el PDF de CFE</Text>
            <Text style={styles.optionDesc}>Documento oficial descargado de cfe.mx.</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.note}>
          <Text style={styles.noteIcon}>🔒</Text>
          <Text style={styles.noteText}>
            El archivo se procesa en memoria y se descarta al terminar el análisis. No se guarda en
            el dispositivo.
          </Text>
        </View>

        <TouchableOpacity onPress={() => Linking.openURL('https://app.cfe.mx/')}>
          <Text style={styles.link}>¿Dónde descargo mi recibo en cfe.mx? ↗</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  progress: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  step: { ...FONTS.label, color: COLORS.textMuted, marginBottom: 6, fontSize: 10 },
  bar: { height: 3, backgroundColor: COLORS.border, borderRadius: 2 },
  barFill: { height: 3, backgroundColor: COLORS.amber, borderRadius: 2 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  h1: { ...FONTS.h1, color: COLORS.textPrimary, marginBottom: 8 },
  sub: { ...FONTS.body, color: COLORS.textSecondary, marginBottom: 28, lineHeight: 22 },
  option: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: 16, marginBottom: 12, ...SHADOW,
  },
  icon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  iconText: { fontSize: 22 },
  optionText: { flex: 1 },
  optionTitle: { ...FONTS.h3, color: COLORS.textPrimary },
  optionDesc: { ...FONTS.bodySmall, color: COLORS.textSecondary, marginTop: 2 },
  arrow: { fontSize: 24, color: COLORS.textMuted, fontWeight: '300' },
  note: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.bgSoft, borderRadius: 10,
    padding: 14, marginTop: 8, marginBottom: 20,
  },
  noteIcon: { fontSize: 14, marginRight: 8, marginTop: 1 },
  noteText: { ...FONTS.bodySmall, color: COLORS.textSecondary, flex: 1, lineHeight: 18 },
  link: { ...FONTS.bodySmall, color: COLORS.amber, textDecorationLine: 'underline', textAlign: 'center' },
});
