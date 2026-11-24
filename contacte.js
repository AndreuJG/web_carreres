import {t} from './lib/i18n.js';
const form = document.querySelector('#contact-form');
const status = document.querySelector('#contact-status');
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true; status.textContent = t('Enviant el missatge…');
  try {
    const response = await fetch('/api/contact', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(Object.fromEntries(new FormData(form))), signal: AbortSignal.timeout(20000)});
    if (!response.ok) throw Error();
    form.reset(); status.textContent = t('Missatge enviat. Gràcies per ajudar-nos a millorar l’agenda.');
  } catch {status.textContent = t('No hem pogut confirmar l’enviament. Conservem el text perquè ho pugues tornar a provar més tard.');}
  finally {button.disabled = false;}
});

fetch("/api/contact").then(r=>r.json()).then(data=>{if(!data.available){form.querySelector("[type=submit]").disabled=true;status.textContent=t("El formulari està pendent d’activació. Torna-ho a provar més tard.");}}).catch(()=>{});
