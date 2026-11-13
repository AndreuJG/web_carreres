import {execFileSync} from 'node:child_process';
import {madridToday} from '../../lib/races.js';
import {deliverDigest, digestMessages, raceNews, sendMessage} from './digest.mjs';

const mode = process.argv[2] || 'preview';
const branch = 'refs/heads/telegram-state';
const {GITHUB_TOKEN, TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: channel} = process.env;
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== 'AndreuJG/web_carreres'
    || process.env.GITHUB_REF !== 'refs/heads/main' || !GITHUB_TOKEN) {
  throw Error('Executa este script des de GitHub Actions en la branca main.');
}
if (!['preview', 'test', 'send', 'confirm-delivery', 'retry-delivery'].includes(mode)) throw Error('Mode de Telegram desconegut.');
if (mode !== 'preview' && !channel && !token) {
  if (mode === 'test') throw Error('Canal de Telegram pendent de configuració.');
  console.log('Canal de Telegram pendent de configuració.');
  process.exit(0);
}
if (mode !== 'preview' && (!/^@[a-zA-Z0-9_]{5,32}$/.test(channel || '') || !/^\d+:[\w-]+$/.test(token || ''))) {
  throw Error('Comprova TELEGRAM_CHAT_ID i TELEGRAM_BOT_TOKEN en GitHub.');
}

if (mode === 'test') {
  const message = '<b>Missatge de prova · Córrer a prop</b>\nEl canal ja pot rebre els avisos de l’agenda. Quan hi haja novetats, publicarem el resum a partir de les 10.00, hora de València.\n\n<a href="https://webcarreres.vercel.app/">Consulta l’agenda</a>';
  const result = await sendMessage({token, channel, message});
  if (result.status === 'rejected') throw Error(`Telegram ha rebutjat la prova (HTTP ${result.code}).`);
  if (result.status === 'uncertain') throw Error('Lliurament incert. Comprova el canal abans de repetir la prova.');
  console.log(`Missatge de prova publicat en https://t.me/${channel.slice(1)}/${result.messageId}`);
  process.exit(0);
}

const auth = {
  ...process.env,
  GIT_CONFIG_COUNT: '1',
  GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
  GIT_CONFIG_VALUE_0: 'AUTHORIZATION: basic ' + Buffer.from(`x-access-token:${GITHUB_TOKEN}`).toString('base64')
};
const git = (args, options = {}) => execFileSync('git', args, {
  encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options
}).trim();
function remote(args) {
  try {
    return git(args, {env: auth});
  } catch {
    throw Error(`Git ${args[0]} ha fallat en sincronitzar l’estat de Telegram amb GitHub.`);
  }
}
const readJson = (commit, path) => JSON.parse(git(['show', `${commit}:${path}`]));
const latest = git(['rev-parse', 'HEAD']);
const today = madridToday();
let stateCommit = remote(['ls-remote', 'origin', branch]).split(/\s/)[0];
if (stateCommit) remote(['fetch', '--no-tags', 'origin', branch]);
const state = stateCommit ? readJson(stateCommit, 'state.json') : {catalog: latest};

function save(value) {
  const blob = git(['hash-object', '-w', '--stdin'], {input: JSON.stringify(value, null, 2) + '\n'});
  const tree = git(['mktree'], {input: `100644 blob ${blob}\tstate.json\n`});
  const parents = stateCommit ? ['-p', stateCommit] : [];
  const commit = git(['-c', 'user.name=github-actions[bot]', '-c',
    'user.email=41898282+github-actions[bot]@users.noreply.github.com',
    'commit-tree', tree, ...parents, '-m', 'Update Telegram delivery state']);
  remote(['push', 'origin', `${commit}:${branch}`]);
  stateCommit = commit;
}

function prepareMessages() {
  const reports = git(['log', '--first-parent', '--format=%H', `${state.catalog}..${latest}`, '--', 'data/sync-status.json']);
  const cancelledIds = new Set();
  for (const commit of reports.split('\n').filter(Boolean)) {
    const report = readJson(commit, 'data/sync-status.json');
    for (const change of report.changes) {
      if (change.kind === 'cancelled') cancelledIds.add(change.id);
    }
  }
  const before = readJson(state.catalog, 'data/races.json');
  const after = readJson(latest, 'data/races.json');
  return digestMessages(raceNews(before, after, cancelledIds, today), today);
}

if (mode === 'preview') {
  const messages = state.pending?.parts.map(part => part.text) ?? prepareMessages();
  console.log(messages.length ? messages.join('\n\n') : 'Sense novetats per publicar.');
} else if (mode === 'confirm-delivery' || mode === 'retry-delivery') {
  const part = state.pending?.parts.find(item => item.inFlight);
  if (!part) throw Error('No hi ha cap fragment amb lliurament incert.');
  delete part.inFlight;
  if (mode === 'confirm-delivery') part.messageId = null;
  save(state);
  console.log('Estat actualitzat. Executa el mode send per reprendre el resum.');
} else if (!stateCommit) {
  save(state);
  console.log('Catàleg de partida guardat. Els canvis posteriors es publicaran al canal.');
} else if (state.pending?.parts.some(part => part.inFlight)) {
  throw Error('Lliurament incert. Revisa el canal i executa confirm-delivery o retry-delivery.');
} else if (state.lastSentDay === today && !state.pending) {
  console.log('El resum de hui ja està publicat.');
} else {
  if (!state.pending) {
    const messages = prepareMessages();
    if (messages.length) {
      state.pending = {catalog: latest, parts: messages.map(text => ({text}))};
      save(state);
    } else if (state.catalog !== latest) {
      state.catalog = latest;
      save(state);
    }
  }
  if (state.pending) await deliverDigest(state, today, save, message => sendMessage({token, channel, message}));
  else console.log('Sense novetats per publicar.');
}
