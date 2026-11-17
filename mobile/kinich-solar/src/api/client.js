import axios from 'axios';

// Configurado para conectar desde dispositivo físico en la red local actual
const BASE_URL = 'http://10.3.2.136:8000';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

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

export const generarPdf = (cotizacion, telegramId) =>
  client.post(
    '/api/v1/generar-pdf',
    { cotizacion, telegram_id: telegramId },
    { responseType: 'blob', timeout: 30000 }
  );

export const BASE_API_URL = BASE_URL;

export default client;
