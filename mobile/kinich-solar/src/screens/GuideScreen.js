import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, TextInput,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOW } from '../constants/theme';

const SECCIONES_GUIA = [
  {
    id: 'que_es',
    categoria: 'BÁSICOS',
    titulo: '¿Qué es y cómo funciona un panel solar?',
    icono: 'solar-power-variant',
    iconoLib: 'mci',
    color: COLORS.amber,
    bgIcon: '#FEF3C7',
    resumen: 'Convierte la luz del sol en electricidad para tu hogar o negocio sin ruido ni gasolina.',
    detalles: [
      {
        sub: '1. Tu propio generador silencioso',
        txt: 'Las celdas de silicio absorben los rayos del sol y generan corriente eléctrica inmediata para alimentar tus refrigeradores, luces y aires acondicionados.'
      },
      {
        sub: '2. ¿Qué pasa de noche o cuando llueve?',
        txt: 'Tu casa nunca se queda a oscuras. Sigues conectado a la red de CFE: de día consumes tu energía solar gratuita y de noche CFE te abastece automáticamente sin que notes ningún cambio.'
      },
      {
        sub: '3. El medidor bidireccional de CFE',
        txt: 'CFE cambia tu medidor por uno nuevo inteligente que gira hacia adelante y hacia atrás. Si tus paneles producen más energía de la que usas, se inyecta a la red y CFE te la guarda como saldo a favor en tu recibo.'
      }
    ]
  },
  {
    id: 'tipos',
    categoria: 'TECNOLOGÍA',
    titulo: 'Tipos de paneles: ¿Cuáles convienen hoy?',
    icono: 'layers-outline',
    iconoLib: 'mci',
    color: '#0284C7',
    bgIcon: '#E0F2FE',
    resumen: 'Diferencia entre los paneles negros modernos y los azules de generaciones pasadas.',
    detalles: [
      {
        sub: '• Monocristalinos (Silicio Negro - Grado A)',
        txt: 'Son los que cotiza Kinich Solar (marcas Tier 1 como Canadian Solar y Jinko). Son los más eficientes del mercado: aprovechan mejor espacios pequeños de azotea y resisten las altas temperaturas de Yucatán sin perder fuerza.'
      },
      {
        sub: '• Policristalinos (Azules tradicionales)',
        txt: 'Eran muy comunes hace 10 años. Son más baratos de fabricar, pero rinden menos por metro cuadrado y pierden eficiencia con el calor extremo del verano.'
      }
    ]
  },
  {
    id: 'sombras',
    categoria: 'INGENIERÍA',
    titulo: 'El peligro de las sombras en el techo',
    icono: 'tree-outline',
    iconoLib: 'mci',
    color: '#16A34A',
    bgIcon: '#DCFCE7',
    resumen: 'Por qué la sombra de un tinaco o barda puede afectar a varios paneles a la vez.',
    detalles: [
      {
        sub: '• El efecto "manguera de agua"',
        txt: 'Los paneles solares tradicionales se conectan en serie (cadenas). Si la sombra de un tinaco, árbol o muro tapa una sola esquina de un panel, frena la energía de toda la cadena, tal como cuando pisas una manguera de jardín.'
      },
      {
        sub: '• ¿Cómo lo resolvemos en Kinich Solar?',
        txt: 'Al hacer el levantamiento físico, diseñamos la distribución lejos de obstáculos y utilizamos microinversores u optimizadores para que cada panel trabaje de forma independiente.'
      }
    ]
  },
  {
    id: 'orientacion',
    categoria: 'INSTALACIÓN',
    titulo: 'Orientación e inclinación del techo',
    icono: 'compass-outline',
    iconoLib: 'mci',
    color: '#7C3AED',
    bgIcon: '#EDE9FE',
    resumen: 'En México los paneles siempre deben mirar hacia el Sur para captar el máximo sol.',
    detalles: [
      {
        sub: '• ¿Por qué siempre hacia el Sur?',
        txt: 'Al estar México en el hemisferio norte, la trayectoria del sol a lo largo del año siempre pasa ligeramente inclinado hacia el sur. Orientarlos al sur garantiza la mayor cosecha de kWh.'
      },
      {
        sub: '• ¿Y si mi techo es plano (losa de concreto)?',
        txt: 'Excelente. Se instalan sobre estructuras de aluminio reforzado con inclinación de 10° a 15°. Esto permite que la lluvia limpie el polvo de los paneles naturalmente y aguanten vientos fuertes.'
      }
    ]
  },
  {
    id: 'glosario',
    categoria: 'DICCIONARIO',
    titulo: 'Diccionario solar en español cotidiano',
    icono: 'book-open-outline',
    iconoLib: 'mci',
    color: '#EA580C',
    bgIcon: '#FFEDD5',
    resumen: 'Los términos técnicos que siempre escuchas, explicados en palabras sencillas.',
    detalles: [
      {
        sub: '• Watt (W) vs Kilowatt-hora (kWh)',
        txt: 'El Watt (W) es la potencia del aparato (ej. un foco de 100 W). El Kilowatt-hora (kWh) es lo que CFE te factura por tenerlo encendido con el paso del tiempo.'
      },
      {
        sub: '• Inversor Solar',
        txt: 'Es el "cerebro" electrónico de la instalación. Convierte la energía directa que viene de los paneles en la corriente alterna que utilizan tus contactos y enchufes.'
      },
      {
        sub: '• Tarifa DAC (De Alto Consumo)',
        txt: 'La tarifa más cara de CFE. Se activa cuando sobrepasas el límite anual de consumo. En DAC el gobierno te retira el subsidio y cada kWh cuesta hasta el triple (~$6.50+ MXN).'
      },
      {
        sub: '• Contrato de Interconexión CFE',
        txt: 'El trámite oficial y legal con CFE donde autorizan que tu casa esté conectada a su red con paneles solares bajo el esquema de Medición Neta (Net Metering).'
      }
    ]
  }
];

export default function GuideScreen({ navigation }) {
  const [expandedId, setExpandedId] = useState('que_es');
  const [search, setSearch] = useState('');

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filtered = SECCIONES_GUIA.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.titulo.toLowerCase().includes(q) ||
      s.resumen.toLowerCase().includes(q) ||
      s.detalles.some((d) => d.sub.toLowerCase().includes(q) || d.txt.toLowerCase().includes(q))
    );
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Guía Solar</Text>
          <Text style={styles.headerSub}>TODO LO QUE DEBES SABER EN LENGUAJE CLARO</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Buscador */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar tema (ej. sombras, CFE, inversor)..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de temas interactivos */}
        {filtered.map((sec) => {
          const isOpen = expandedId === sec.id;
          return (
            <View key={sec.id} style={[styles.card, isOpen && styles.cardActive]}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => toggleExpand(sec.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: sec.bgIcon }]}>
                  <MaterialCommunityIcons name={sec.icono} size={24} color={sec.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.categoryLabel, { color: sec.color }]}>{sec.categoria}</Text>
                  <Text style={styles.cardTitle}>{sec.titulo}</Text>
                  {!isOpen && <Text style={styles.cardSummary}>{sec.resumen}</Text>}
                </View>
                <Feather
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.textMuted}
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.cardBody}>
                  <View style={styles.divider} />
                  {sec.detalles.map((d, i) => (
                    <View key={i} style={styles.detailBlock}>
                      <Text style={styles.detailSub}>{d.sub}</Text>
                      <Text style={styles.detailTxt}>{d.txt}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="help-circle" size={40} color={COLORS.textMuted} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No encontramos ese tema</Text>
            <Text style={styles.emptyDesc}>Prueba buscando con otra palabra como "paneles", "recibo" o "ahorro".</Text>
          </View>
        )}

        {/* Banner de acción al final */}
        <View style={styles.actionBanner}>
          <MaterialCommunityIcons name="calculator-variant-outline" size={28} color={COLORS.amber} style={{ marginBottom: 8 }} />
          <Text style={styles.actionTitle}>¿Listo para dimensionar tu casa?</Text>
          <Text style={styles.actionDesc}>
            Calcula cuántos paneles necesitas y cuánto dinero vas a ahorrar mes a mes con tu recibo de CFE.
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Capture')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>Cotizar mi proyecto solar  →</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSoft },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { marginRight: 14, padding: 4 },
  headerTitle: { ...FONTS.h2, fontSize: 20, color: COLORS.navy },
  headerSub: { ...FONTS.label, color: COLORS.amber, fontSize: 9 },
  scroll: { paddingHorizontal: 20, paddingVertical: 18, paddingBottom: 40 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16, ...SHADOW,
  },
  searchInput: { flex: 1, ...FONTS.body, color: COLORS.textPrimary },
  card: {
    backgroundColor: COLORS.white, borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  cardActive: { borderColor: COLORS.navyLight },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  categoryLabel: { ...FONTS.label, fontSize: 9, marginBottom: 2 },
  cardTitle: { ...FONTS.h3, color: COLORS.textPrimary, fontSize: 15, marginBottom: 4 },
  cardSummary: { ...FONTS.bodySmall, color: COLORS.textSecondary, lineHeight: 18 },
  cardBody: { marginTop: 8 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  detailBlock: { marginBottom: 12 },
  detailSub: { ...FONTS.h3, color: COLORS.navy, fontSize: 13, marginBottom: 4 },
  detailTxt: { ...FONTS.bodySmall, color: COLORS.textSecondary, lineHeight: 19 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginBottom: 4 },
  emptyDesc: { ...FONTS.bodySmall, color: COLORS.textMuted, textAlign: 'center' },
  actionBanner: {
    backgroundColor: COLORS.navy, borderRadius: 18,
    padding: 22, marginTop: 12, alignItems: 'center', ...SHADOW,
  },
  actionTitle: { ...FONTS.h2, color: COLORS.white, fontSize: 18, textAlign: 'center', marginBottom: 6 },
  actionDesc: { ...FONTS.bodySmall, color: '#94A3B8', textAlign: 'center', marginBottom: 18, lineHeight: 19 },
  actionBtn: {
    backgroundColor: COLORS.amber, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', width: '100%',
  },
  actionBtnText: { ...FONTS.h3, color: COLORS.navy, fontWeight: '700' },
});
