import {timingSafeEqual} from 'node:crypto';
import {madridToday} from './races.js';

const repository = 'AndreuJG/web_carreres';
const stateUrl = `https://raw.githubusercontent.com/${repository}/telegram-state/state.json`;

export async function deliveryStatus(fetchImpl = fetch, now = new Date()) {
  const response = await fetchImpl(stateUrl, {cache: 'no-store', signal: AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('No es pot consultar l’estat de lliurament');
  const state = await response.json();
  const today = madridToday(now);
  const delivered = state.lastSentDay === today && !state.pending;
  const uncertain = Boolean(state.pending?.parts?.some(part => part.inFlight));
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23'
  }).format(now));
  return {today, lastSentDay: state.lastSentDay || null, delivered, uncertain, overdue: !delivered && hour >= 13};
}

export async function runTelegramCron(req, res, workflow, {env = process.env, fetchImpl = fetch} = {}) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed'});
  const expected = Buffer.from('Bearer ' + (env.CRON_SECRET || ''));
  const received = Buffer.from(req.headers.authorization || '');
  if (!env.CRON_SECRET || received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return res.status(401).json({error: 'Unauthorized'});
  }
  if (!env.GITHUB_DISPATCH_TOKEN) {
    console.error('Telegram cron missing GITHUB_DISPATCH_TOKEN');
    return res.status(503).json({error: 'GITHUB_DISPATCH_TOKEN pendent de configuració'});
  }
  try {
    const status = await deliveryStatus(fetchImpl);
    if (req.query?.inspect === '1') return res.status(200).json({configured: true, ...status});
    if (status.delivered) return res.status(200).json({action: 'already-delivered', ...status});
    if (status.uncertain) {
      console.error('Telegram cron found an uncertain delivery');
      return res.status(503).json({error: 'Lliurament incert pendent de comprovació', ...status});
    }
    const response = await fetchImpl(
      `https://api.github.com/repos/${repository}/actions/workflows/${workflow}/dispatches`, {
        method: 'POST', redirect: 'error',
        headers: {
          Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
          Accept: 'application/vnd.github+json', 'Content-Type': 'application/json',
          'User-Agent': 'CorrerAProp',
        },
        body: JSON.stringify({ref: 'main', ...(workflow === 'telegram.yml' ? {inputs: {mode: 'send'}} : {})}),
        signal: AbortSignal.timeout(15000),
      });
    if (response.status !== 204) {
      console.error(`Telegram cron dispatch rejected with HTTP ${response.status}`);
      return res.status(502).json({error: 'GitHub ha rebutjat el disparador', githubStatus: response.status});
    }
    console.log(`Telegram cron dispatched ${workflow} for ${status.today}`);
    return res.status(202).json({action: 'dispatched', workflow, ...status});
  } catch {
    console.error('Telegram cron could not verify or dispatch delivery');
    return res.status(502).json({error: 'No es pot verificar o activar el lliurament'});
  }
}
