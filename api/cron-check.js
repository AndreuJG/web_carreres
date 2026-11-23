import {runTelegramCron} from '../lib/telegram-cron.js';

export default function handler(req, res) {
  return runTelegramCron(req, res, 'telegram.yml');
}
