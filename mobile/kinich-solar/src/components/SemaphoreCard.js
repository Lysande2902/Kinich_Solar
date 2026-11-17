import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

export default function SemaphoreCard({ semaphore }) {
  const color =
    semaphore?.color === 'VERDE'
      ? COLORS.green
      : semaphore?.color === 'AMARILLO'
      ? COLORS.amberWarn
      : COLORS.red;

  const bgColor =
    semaphore?.color === 'VERDE'
      ? COLORS.greenLight
      : semaphore?.color === 'AMARILLO'
      ? COLORS.amberWarnLight
      : COLORS.redLight;

  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor: color }]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.nivel, { color }]}>
          {semaphore?.nivel?.toUpperCase() || 'SIN DATOS'}
        </Text>
      </View>
      <Text style={styles.titulo}>{semaphore?.titulo}</Text>
      <Text style={styles.mensaje}>{semaphore?.mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  nivel: { ...FONTS.label, fontSize: 12 },
  titulo: { ...FONTS.h3, color: COLORS.textPrimary, marginBottom: 4 },
  mensaje: { ...FONTS.body, color: COLORS.textSecondary },
});
