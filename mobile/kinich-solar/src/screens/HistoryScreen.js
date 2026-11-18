import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { COLORS, FONTS, SHADOW } from '../constants/theme';
import { obtenerHistorial, borrarDatos } from '../api/client';

export default function HistoryScreen({ navigation, route }) {
  const { deviceId = 999999 } = route.params || {};
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await obtenerHistorial(deviceId);
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (_) {
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [deviceId]);

  const handleBorrarMisDatos = () => {
    Alert.alert(
      'Eliminar mis datos (Derecho ARCO)',
      '¿Deseas eliminar permanentemente todo tu historial, recibos analizados y cotizaciones asociadas a este dispositivo del servidor?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar todo',
          style: 'destructive',
          onPress: async () => {
            try {
              await borrarDatos(deviceId);
              setHistory([]);
              Alert.alert('Datos eliminados', 'Todos tus registros fueron eliminados del servidor conforme a la política de privacidad.');
            } catch (err) {
              Alert.alert('Error', 'No fue posible completar la eliminación en el servidor.');
            }
          }
        }
      ]
    );
  };

  const fmt = (n) => (n ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })}` : '—');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mis Cotizaciones</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} />
        }
      >
        <Text style={styles.subtitle}>
          Historial técnico registrado para este dispositivo en Kinich Solar.
        </Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.navy} />
            <Text style={styles.loadingText}>Cargando cotizaciones...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>Sin cotizaciones guardadas</Text>
            <Text style={styles.emptyDesc}>
              Aún no has generado anteproyectos solares con este dispositivo o fueron eliminados.
            </Text>
          </View>
        ) : (
          history.map((item, idx) => (
            <View key={idx} style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardDate}>
                    {item.creado_en ? item.creado_en.slice(0, 16) : 'Fecha reciente'}
                  </Text>
                  <Text style={styles.cardTarifa}>
                    Tarifa {item.tarifa || 'Residencial'} · {item.kwh_periodo || '—'} kWh
                  </Text>
                </View>
                <View style={styles.kwpBadge}>
                  <Text style={styles.kwpText}>{item.kwp || '—'} kWp</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardMetrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>PANELES</Text>
                  <Text style={styles.metricVal}>{item.paneles || '—'} mod.</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>INVERSIÓN ESTIMADA</Text>
                  <Text style={styles.metricVal}>
                    {fmt(item.costo_min)} - {fmt(item.costo_max)}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>AHORRO / MES</Text>
                  <Text style={[styles.metricVal, { color: COLORS.green }]}>
                    {fmt(item.ahorro_mensual)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Sección de Privacidad ARCO */}
        <View style={styles.arcoSection}>
          <Text style={styles.arcoTitle}>Control de Privacidad (ARCO)</Text>
          <Text style={styles.arcoDesc}>
            Puedes borrar permanentemente tus recibos, folios e historial de nuestra base de datos en cualquier momento.
          </Text>
          <TouchableOpacity
            style={styles.arcoBtn}
            onPress={handleBorrarMisDatos}
            activeOpacity={0.8}
          >
            <Text style={styles.arcoBtnText}>Eliminar todos mis datos del servidor</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSoft },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: COLORS.textPrimary },
  title: { ...FONTS.h3, color: COLORS.textPrimary, fontSize: 17 },
  scroll: { padding: 20 },
  subtitle: { ...FONTS.bodySmall, color: COLORS.textSecondary, marginBottom: 16 },
  centerBox: { alignItems: 'center', paddingVertical: 50 },
  loadingText: { ...FONTS.bodySmall, color: COLORS.textMuted, marginTop: 12 },
  emptyCard: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 30,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 24, ...SHADOW,
  },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginBottom: 6 },
  emptyDesc: { ...FONTS.bodySmall, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
  historyCard: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { ...FONTS.label, color: COLORS.textMuted, fontSize: 10 },
  cardTarifa: { ...FONTS.h3, color: COLORS.textPrimary, marginTop: 2, fontSize: 15 },
  kwpBadge: {
    backgroundColor: COLORS.navy, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  kwpText: { ...FONTS.bodySmall, color: COLORS.white, fontWeight: '700' },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  cardMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
  metricItem: { flex: 1 },
  metricLabel: { ...FONTS.label, color: COLORS.textMuted, fontSize: 9, marginBottom: 2 },
  metricVal: { ...FONTS.bodySmall, color: COLORS.textPrimary, fontWeight: '600' },
  arcoSection: {
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 18,
    marginTop: 16, borderWidth: 1, borderColor: '#FEE2E2',
  },
  arcoTitle: { ...FONTS.h3, color: '#991B1B', marginBottom: 4, fontSize: 14 },
  arcoDesc: { ...FONTS.bodySmall, color: '#7F1D1D', marginBottom: 14, lineHeight: 18 },
  arcoBtn: {
    backgroundColor: '#DC2626', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center',
  },
  arcoBtnText: { ...FONTS.bodySmall, color: COLORS.white, fontWeight: '700' },
});
