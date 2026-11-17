import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

export default function ScaleSelector({ selected, onSelect }) {
  const scales = [
    { key: '80', label: '80%', sub: 'Económica' },
    { key: '90', label: '90%', sub: 'Recomendada', recommended: true },
    { key: '100', label: '100%', sub: 'Cobertura total' },
  ];

  return (
    <View style={styles.row}>
      {scales.map((s) => (
        <TouchableOpacity
          key={s.key}
          style={[
            styles.tab,
            selected === s.key && styles.tabActive,
            s.recommended && selected !== s.key && styles.tabRecommended,
          ]}
          onPress={() => onSelect(s.key)}
          activeOpacity={0.8}
        >
          <Text style={[styles.pct, selected === s.key && styles.pctActive]}>
            {s.label}
          </Text>
          <Text style={[styles.sub, selected === s.key && styles.subActive]}>
            {s.sub}
          </Text>
          {s.recommended && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PREFERIDA</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  tabRecommended: {
    borderColor: COLORS.amber,
  },
  pct: { ...FONTS.h2, color: COLORS.textPrimary },
  pctActive: { color: COLORS.white },
  sub: { ...FONTS.bodySmall, color: COLORS.textSecondary, marginTop: 2 },
  subActive: { color: COLORS.amberLight },
  badge: {
    marginTop: 6,
    backgroundColor: COLORS.amber,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { ...FONTS.label, fontSize: 9, color: COLORS.white },
});
