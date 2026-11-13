import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, basename } from 'node:path';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const output = resolve(root, 'dist');
if (dirname(output) !== root || basename(output) !== 'dist') {
  throw new Error('El directori de publicació ha de ser dist dins del projecte.');
}
await rm(output, { recursive: true, force: true });
await mkdir(output);
const publicFiles = ['index.html', 'styles.css', 'app.js', 'assets', 'lib', 'data'];
for (const file of publicFiles) {
  await cp(resolve(root, file), resolve(output, file), { recursive: true });
}
const telegram = process.env.TELEGRAM_CHAT_ID || '';
const analyticsPath = process.env.VERCEL_ANALYTICS_SCRIPT_PATH || '/_vercel/insights/script.js';
if (telegram && !/^@[a-zA-Z0-9_]{5,32}$/.test(telegram)) throw new Error('TELEGRAM_CHAT_ID ha de ser el nom públic del canal, amb @.');
if (!/^\/(?:[\w-]+\/)+script\.js$/.test(analyticsPath)) throw new Error('Ruta de Vercel Analytics invàlida.');

const index = resolve(output, 'index.html');
let html = await readFile(index, 'utf8');
if (process.env.VERCEL_ENV === 'production') {
  html = html.replace('</head>', `  <script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>
    <script defer src="${analyticsPath}"></script>
  </head>`);
}
if (telegram) {
  html = html.replace('<!-- telegram-channel -->', `<a href="https://t.me/${telegram.slice(1)}" target="_blank" rel="noopener noreferrer">Novetats en Telegram ↗</a>`);
}
await writeFile(index, html);
console.log('Web estàtica preparada en dist/ per a Vercel.');
