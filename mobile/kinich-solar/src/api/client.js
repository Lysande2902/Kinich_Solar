import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.3.2.136:8000';
export let BASE_API_URL = DEFAULT_URL;

const client = axios.create({
  baseURL: BASE_API_URL,
  timeout: 30000,
});

// Inicializar la URL guardada en el almacenamiento local del teléfono
(async () => {
  try {
    const saved = await AsyncStorage.getItem('KINICH_API_URL');
    if (saved) {
      BASE_API_URL = saved;
      client.defaults.baseURL = saved;
    }
  } catch (_) {}
})();

export const setServerUrl = async (newUrl) => {
  let cleaned = newUrl.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'http://' + cleaned;
  }
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  BASE_API_URL = cleaned;
  client.defaults.baseURL = cleaned;
  await AsyncStorage.setItem('KINICH_API_URL', cleaned);
  return cleaned;
};

export const getServerUrl = async () => {
  try {
    const saved = await AsyncStorage.getItem('KINICH_API_URL');
    return saved || BASE_API_URL;
  } catch (_) {
    return BASE_API_URL;
  }
};

export const registrarConsentimiento = (telegramId) =>
  client.post('/api/v1/consentimiento', {
    telegram_id: telegramId,
    consentimiento: true,
    version_aviso: 'v1.0',
  });

export const leerRecibo = async (fileUri, mimeType, fileName) => {
  const form = new FormData();
  form.append('archivo', { uri: fileUri, type: mimeType, name: fileName });
  return client.post('/api/v1/leer-recibo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
};

export const leerPlaca = async (fileUri) => {
  const form = new FormData();
  form.append('archivo', { uri: fileUri, type: 'image/jpeg', name: 'placa.jpg' });
  return client.post('/api/v1/leer-placa', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
};

export const cotizar = (payload) =>
  client.post('/api/v1/cotizar', payload, { timeout: 30000 });

export const solicitarAsesor = (payload) =>
  client.post('/api/v1/contacto-asesor', payload, { timeout: 30000 });

export const obtenerHistorial = (telegramId) =>
  client.get(`/api/v1/historial/${telegramId}`, { timeout: 15000 });

export const borrarDatos = (telegramId) =>
  client.delete(`/api/v1/borrar-datos/${telegramId}`, { timeout: 15000 });

export const generarPdf = (cotizacion, telegramId) =>
  client.post(
    '/api/v1/generar-pdf',
    { cotizacion, telegram_id: telegramId },
    { responseType: 'blob', timeout: 30000 }
  );

export default client;
