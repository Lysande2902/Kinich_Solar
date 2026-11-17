import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  Animated, Easing, TouchableOpacity,
} from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

const STEPS = [
  'Recibo recibido en memoria',
  'Consumo y periodo detectados',
  'Validando tarifa CFE en tablas',
  'Verificando coherencia del importe',
  'Preparando verificación técnica',
];

export default function AnalyzingScreen({ navigation }) {
  const spin = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(10);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true,
      })
    ).start();

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 95));
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      <View style={styles.progress}>
        <Text style={styles.step}>PASO 1 DE 4</Text>
        <View style={styles.bar}><View style={[styles.barFill, { width: '25%' }]} /></View>
      </View>

      <View style={styles.center}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]}>
          <Text style={styles.spinnerIcon}>☀️</Text>
        </Animated.View>
        <Text style={styles.h2}>Analizando tu recibo</Text>
        <Text style={styles.sub}>
          Extrayendo energía con IA y validando las tablas{'\n'}oficiales de tarifas CFE...
        </Text>

        <View style={styles.stepList}>
          {STEPS.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <View key={s} style={styles.stepRow}>
                <View style={[styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                ]} />
                <Text style={[styles.stepText,
                  done && styles.stepDone,
                  active && styles.stepActiveText,
                ]}>
                  {s}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>PROCESANDO</Text>
            <Text style={styles.progressPct}>{progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.time}>TIEMPO ESTIMADO 6–10 S</Text>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Capture')}>
          <Text style={styles.cancel}>Cancelar y elegir otro archivo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  progress: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  step: { ...FONTS.label, color: COLORS.textMuted, marginBottom: 6, fontSize: 10 },
  bar: { height: 3, backgroundColor: COLORS.borderDark, borderRadius: 2 },
  barFill: { height: 3, backgroundColor: COLORS.amber, borderRadius: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  spinner: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: COLORS.amber,
    borderTopColor: 'transparent',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  spinnerIcon: { fontSize: 32 },
  h2: { ...FONTS.h2, color: COLORS.white, marginBottom: 8, textAlign: 'center' },
  sub: { ...FONTS.body, color: '#94A3B8', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  stepList: { width: '100%', marginBottom: 28 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#334155', marginRight: 12,
  },
  dotDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  dotActive: { borderColor: COLORS.amber },
  stepText: { ...FONTS.body, color: '#475569' },
  stepDone: { color: COLORS.green },
  stepActiveText: { color: COLORS.amberLight, fontWeight: '600' },
  progressSection: { width: '100%', marginBottom: 20 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { ...FONTS.label, color: '#475569', fontSize: 10 },
  progressPct: { ...FONTS.label, color: COLORS.amberLight, fontSize: 10 },
  progressBar: { height: 4, backgroundColor: '#1E3A5F', borderRadius: 2, marginBottom: 6 },
  progressFill: { height: 4, backgroundColor: COLORS.amber, borderRadius: 2 },
  time: { ...FONTS.label, color: '#334155', fontSize: 10 },
  cancel: { ...FONTS.body, color: '#475569', textDecorationLine: 'underline' },
});
