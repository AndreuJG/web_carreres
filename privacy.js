import {setupLanguage, localize} from './lib/i18n.js';
import {CONSENT_KEY, readConsent} from './lib/consent.js';

setupLanguage();
let storage;
try {storage = localStorage;} catch { /* Consent remains usable for this page. */ }
let consent = readConsent(storage), analyticsLoaded = false;
const path = document.querySelector('meta[name="analytics-script"]')?.content;
const panel = document.createElement('dialog');
panel.className = 'privacy-dialog'; panel.setAttribute('aria-labelledby', 'privacy-title');
panel.innerHTML = `<h2 id="privacy-title">La teua privacitat</h2><p>Guardem en este navegador el poble, el radi i les carreres que tries. L’analítica de visites és opcional: només la carreguem si l’acceptes. Pots usar tota l’agenda encara que la rebutges.</p><p><a href="./privacitat.html">Privacitat i emmagatzematge</a></p><div class="consent-actions"><button type="button" data-consent="false">Rebutjar analítica</button><button type="button" data-consent="true">Acceptar analítica</button></div><button type="button" class="privacy-close">Tancar sense canviar</button>`;
localize(panel);
document.body.append(panel);
function loadAnalytics() {
  if (analyticsLoaded || !consent?.analytics || !/^\/(?:[\w-]+\/)+script\.js$/.test(path || '')) return;
  analyticsLoaded = true;
  window.va = window.va || function () {(window.vaq = window.vaq || []).push(arguments);};
  const script = document.createElement('script'); script.defer = true; script.src = path; document.head.append(script);
}
function choose(analytics) {
  const wasLoaded = analyticsLoaded;
  consent = {version: 1, analytics, at: Date.now()};
  try {storage?.setItem(CONSENT_KEY, JSON.stringify(consent));} catch {}
  panel.close();
  if (!analytics && wasLoaded) location.reload();
  else loadAnalytics();
}
panel.querySelectorAll('[data-consent]').forEach(button => button.addEventListener('click', () => choose(button.dataset.consent === 'true')));
panel.querySelector('.privacy-close').addEventListener('click', () => panel.close());
document.querySelectorAll('[data-privacy-settings]').forEach(button => button.addEventListener('click', () => panel.showModal()));
window.addEventListener('storage', event => {if (event.key === CONSENT_KEY || event.key === null) {consent = readConsent(storage); if (!consent?.analytics && analyticsLoaded) location.reload(); else loadAnalytics();}});
if (!consent) panel.showModal();
else loadAnalytics();
