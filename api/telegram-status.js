import {deliveryStatus} from '../lib/telegram-cron.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed'});
  try {
    const status = await deliveryStatus();
    return res.status(status.overdue || status.uncertain ? 503 : 200).json(status);
  } catch {
    return res.status(503).json({error: 'No es pot verificar el lliurament de Telegram'});
  }
}
