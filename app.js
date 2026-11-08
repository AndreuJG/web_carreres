import { selectRaces, madridToday, oneYearAfter, matchesDistance, formatDistance, escapeHtml as h, makeCalendar, TYPE_LABELS } from './lib/races.js';

const $ = selector => document.querySelector(selector);
const form = $('#filters');
const dialog = $('#info-dialog');
let data, visible = [], savedOnly = false, toastTimer;
let saved = [];
try {
  const stored = JSON.parse(localStorage.getItem('correr-a-prop:saved') || '[]');
  if (Array.isArray(stored)) saved = stored.filter(id => typeof id === 'string');
} catch { /* The agenda also works when browser storage is unavailable. */ }
const date = day => new Date(`${day}T12:00:00Z`);
const displayDate = (day, options) => date(day).toLocaleDateString('ca-ES', { timeZone: 'Europe/Madrid', ...options });
const longDate = day => displayDate(day, { day: 'numeric', month: 'long', year: 'numeric' });

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}

function filters() {
  const values = new FormData(form);
  return { query: $('#search').value.trim(), radius: Number(values.get('radius')), month: values.get('month'), type: values.get('type'), source: values.get('source'), sort: $('#sort').value, savedOnly, savedIds: saved };
}

function syncUrl() {
  const state = filters();
  const params = new URLSearchParams();
  for (const key of ['query', 'month', 'type', 'source']) if (state[key]) params.set(key, state[key]);
  if (state.radius !== 50) params.set('radius', state.radius);
  if (state.sort !== 'date') params.set('sort', state.sort);
  if (savedOnly) params.set('saved', '1');
  for (const distance of new FormData(form).getAll('distance')) params.append('distance', distance);
  try { history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`); } catch { /* A restrictive embedded preview must not prevent filtering. */ }
}

function restoreUrl() {
  clearControls();
  const params = new URLSearchParams(location.search);
  $('#search').value = params.get('query') || '';
  for (const key of ['month', 'type', 'source', 'sort']) {
    const control = $(`#${key}`), value = params.get(key);
    if (value && [...control.options].some(option => option.value === value)) control.value = value;
  }
  const radius = params.get('radius');
  if (['10', '25', '50'].includes(radius)) form.querySelector(`input[name="radius"][value="${radius}"]`).checked = true;
  for (const input of form.querySelectorAll('[name="distance"]')) input.checked = params.getAll('distance').includes(input.value);
  savedOnly = params.get('saved') === '1';
}

function distanceLabel(race) {
  return race.distances.map(km => formatDistance(km)).join(' / ');
}

function card(race) {
  const isSaved = saved.includes(race.id);
  return `<article class="race-card" aria-labelledby="title-${h(race.id)}">
    <time class="date-tile" datetime="${race.date}" aria-label="${h(longDate(race.date))}"><span class="weekday">${h(displayDate(race.date, { weekday: 'short' }).replace('.', ''))}</span><strong>${race.date.slice(8)}</strong><span class="month">${h(displayDate(race.date, { month: 'short' }).replace('.', ''))}</span></time>
    <div><h3 style="margin:0"><button class="race-title" id="title-${h(race.id)}" data-detail="${h(race.id)}">${h(race.name)}</button></h3>
      <div class="race-info"><span>⌖ ${h(race.town)}</span><span>~${formatDistance(race.proximity)} km de casa</span></div>
      <div class="race-tags"><span class="tag tag-${race.type}">${TYPE_LABELS[race.type]}</span><span class="tag verified-tag">✓ Data publicada</span></div></div>
    <div class="race-right"><div class="race-distance">${distanceLabel(race)} <small>km</small></div><button class="detail-link" data-detail="${h(race.id)}" aria-label="Veure detalls de ${h(race.name)}">Veure carrera <span aria-hidden="true">↗</span></button></div>
    <button class="save-button" data-save="${h(race.id)}" aria-label="${isSaved ? 'Llevar de guardades' : 'Guardar'}: ${h(race.name)}" aria-pressed="${isSaved}"><span aria-hidden="true">${isSaved ? '♥' : '♡'}</span></button>
  </article>`;
}

function render({ updateUrl = true } = {}) {
  if (!data) return;
  const selectedDistances = new FormData(form).getAll('distance');
  visible = selectRaces(data.races, data.origin, filters()).filter(race => !selectedDistances.length || selectedDistances.some(distance => matchesDistance(race.distances, distance)));
  $('#saved-count').textContent = saved.length;
  $('#saved-nav').setAttribute('aria-pressed', String(savedOnly));
  $('#saved-filter').setAttribute('aria-pressed', String(savedOnly));
  $('#saved-filter').textContent = `${savedOnly ? '♥' : '♡'} Només guardades`;
  $('#agenda-title').firstChild.textContent = savedOnly ? 'Les teues carreres ' : 'Carreres a l’horitzó ';
  $('#result-count').textContent = visible.length;
  const today = madridToday();
  $('#results-description').textContent = `${visible.length} ${visible.length === 1 ? 'carrera' : 'carreres'} · fins al ${longDate(oneYearAfter(today))}`;
  $('#export').disabled = !visible.length;
  if (!visible.length) {
    $('#race-list').innerHTML = `<div class="empty-state"><div class="empty-icon" aria-hidden="true">${savedOnly ? '♡' : '⌕'}</div><h3>${savedOnly ? 'La teua pròxima meta encara no està guardada' : 'Cap carrera amb estos filtres'}</h3><p>${savedOnly ? 'Toca el cor d’una carrera per a tindre-la ací. Només es mostren les que continuen dins del període i dels filtres.' : 'Prova a ampliar el radi o a canviar la distància i el mes. Només mostrem carreres futures amb data publicada.'}</p><button class="primary-button" data-reset>Veure totes les carreres →</button></div>`;
  } else if ($('#sort').value === 'near') {
    $('#race-list').innerHTML = visible.map(card).join('');
  } else {
    let currentMonth = '';
    $('#race-list').innerHTML = visible.map(race => {
      const month = race.date.slice(0, 7);
      let heading = '';
      if (month !== currentMonth) {
        const count = visible.filter(item => item.date.startsWith(month)).length;
        heading = `<h3 class="month-heading">${h(displayDate(race.date, { month: 'long', year: 'numeric' }))}<small>${count} ${count === 1 ? 'carrera' : 'carreres'}</small></h3>`;
        currentMonth = month;
      }
      return heading + card(race);
    }).join('');
  }
  if (updateUrl) syncUrl();
}

function resetFilters() {
  clearControls();
  render();
}

function clearControls() {
  for (const control of form.querySelectorAll('input')) control.checked = control.defaultChecked;
  for (const control of form.querySelectorAll('select')) control.selectedIndex = 0;
  $('#search').value = '';
  $('#sort').value = 'date';
  savedOnly = false;
}

function toggleSave(id) {
  const remove = saved.includes(id);
  saved = remove ? saved.filter(item => item !== id) : [...saved, id];
  let persistent = true;
  try { localStorage.setItem('correr-a-prop:saved', JSON.stringify(saved)); } catch { persistent = false; }
  render();
  if (dialog.open && dialog.dataset.race === id) raceDetails(id, false);
  toast(remove ? 'Carrera llevada de les guardades' : `Carrera guardada${persistent ? ' en este navegador' : ' durant esta sessió'}`);
  const buttons = [...(dialog.open ? dialog : document).querySelectorAll('[data-save]')];
  buttons.find(button => button.dataset.save === id)?.focus({ preventScroll: true });
}

function openDialog(content, raceId = '', show = true) {
  $('#dialog-content').innerHTML = content;
  dialog.dataset.race = raceId;
  if (show && !dialog.open) dialog.showModal();
}

function raceDetails(id, show = true) {
  const race = data.races.find(item => item.id === id);
  if (!race) return;
  openDialog(`<h2 id="dialog-title">${h(race.name)}</h2><span class="tag tag-${race.type}">${TYPE_LABELS[race.type]}</span>
    <div class="dialog-detail-grid"><div><span>Data</span>${h(longDate(race.date))}</div><div><span>Distància</span>${distanceLabel(race)} km</div><div><span>Hora publicada</span>${race.time || 'Pendent de confirmar'}</div><div><span>Població</span>${h(race.town)}</div></div>
    <p><b>Eixida:</b> ${h(race.location)}</p><p>${h(race.note)}</p><h3>Fonts d’esta convocatòria</h3><ul>${race.sources.map(source => `<li><a href="${h(source.url)}" target="_blank" rel="noopener noreferrer">${h(source.label)} ↗</a></li>`).join('')}</ul><p>Revisat el ${h(longDate(race.verifiedAt))}. Confirma les condicions i els dorsals disponibles a la font.</p>
    <div class="dialog-actions"><a class="primary-button" href="${h(race.url)}" target="_blank" rel="noopener noreferrer">Consultar la convocatòria ↗</a><button class="secondary-button" data-calendar="${h(race.id)}">↓ Afegir al calendari</button><button class="secondary-button" data-save="${h(race.id)}" aria-pressed="${saved.includes(id)}">${saved.includes(id) ? '♥ Guardada' : '♡ Guardar'}</button></div><p style="font-size:10px">El fitxer de calendari guarda el dia complet; els horaris publicats apareixen en la descripció.</p>`, id, show);
}

function showSources() {
  if (!data) return;
  openDialog(`<h2 id="dialog-title">Una agenda amb fonts.</h2><p>Prioritzem Cronorunner i Sportmaniacs, i contrastem les convocatòries amb els webs dels organitzadors. Última revisió: ${h(longDate(data.updatedAt))}.</p>${data.sources.map(source => `<div class="source-item"><h3><a href="${h(source.url)}" target="_blank" rel="noopener noreferrer">${h(source.name)} ↗</a></h3><p>${h(source.description)}</p>${source.note ? `<small>${h(source.note)}</small>` : ''}</div>`).join('')}${data.pending.length ? '<h3>Pendents de verificació · fora de l’agenda</h3>' : ''}${data.pending.map(item => `<div class="source-item"><h3>${h(item.name)}</h3><p>${h(item.reason)}</p><p>${item.sources.map(source => `<a href="${h(source.url)}" target="_blank" rel="noopener noreferrer">${h(source.label)} ↗</a>`).join(' · ')}</p></div>`).join('')}`);
}

function showMethod() {
  if (!data) return;
  openDialog(`<h2 id="dialog-title">A prop, i encara per córrer.</h2><p>Una selecció de carreres a peu amb convocatòria publicada. No és un calendari exhaustiu de totes les proves de la província.</p><h3>Què vol dir «a prop»?</h3><p>Un màxim de 50 km en línia recta des del centre de Catarroja (39,402; −0,403) fins a unes coordenades aproximades del centre de cada població. Calculem el radi amb la fórmula de Haversine. No és la distància per carretera ni fins a l’arc d’eixida.</p><h3>Quin període cobrim?</h3><p>Des de demà fins a un any després de hui, segons l’hora d’Europe/Madrid. Excloem tot el dia actual per a no mostrar proves que ja hagen acabat. El límit es mou cada dia.</p><h3>Com es revisen les dades?</h3><p>Esta primera versió és una selecció revisada manualment el ${h(longDate(data.updatedAt))}. Les dates passades s’oculten automàticament; les noves convocatòries i els ajornaments necessiten una nova revisió de les fonts. No s’han inventat dates de 2027 a partir d’edicions anteriors.</p><p>Els esdeveniments amb diverses distàncies compten com una cita. Mostrem les distàncies de carrera, excloent marxes i triatlons. Les hores desconegudes es marquen com a pendents.</p><h3>I les carreres guardades?</h3><p>Es guarden només en este navegador, sense compte ni servidor. Pots exportar les carreres visibles a un fitxer .ics. Es creen esdeveniments de dia complet per a evitar confusions entre modalitats i horaris.</p>`);
}

function downloadCalendar(races) {
  if (!races.length) return;
  const blob = new Blob([makeCalendar(races)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url;
  link.download = races.length === 1 ? `${races[0].id}.ics` : 'carreres-catarroja.ics';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Calendari descarregat · esdeveniments de dia complet');
}

document.addEventListener('click', event => {
  const save = event.target.closest('[data-save]');
  const detail = event.target.closest('[data-detail]');
  const calendar = event.target.closest('[data-calendar]');
  if (save) toggleSave(save.dataset.save);
  else if (detail) raceDetails(detail.dataset.detail);
  else if (calendar) downloadCalendar(data.races.filter(race => race.id === calendar.dataset.calendar));
  else if (event.target.closest('[data-reset]')) resetFilters();
});
form.addEventListener('change', () => render());
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', event => { event.preventDefault(); resetFilters(); });
$('#search').addEventListener('input', () => render());
$('#sort').addEventListener('change', () => render());
for (const id of ['saved-nav', 'saved-filter']) $(`#${id}`).addEventListener('click', () => { savedOnly = !savedOnly; render(); if (id === 'saved-nav') $('#agenda').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); });
for (const id of ['sources-open', 'sidebar-sources']) $(`#${id}`).addEventListener('click', showSources);
for (const id of ['method-open', 'footer-method']) $(`#${id}`).addEventListener('click', showMethod);
$('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
$('#export').addEventListener('click', () => downloadCalendar(visible));
window.addEventListener('popstate', () => { if (data) { restoreUrl(); render({ updateUrl: false }); } });

async function init() {
  try {
    const response = await fetch(new URL('./data/races.json', import.meta.url));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
    const knownIds = new Set(data.races.map(race => race.id));
    saved = [...new Set(saved)].filter(id => knownIds.has(id));
    const upcoming = selectRaces(data.races, data.origin);
    const months = [...new Set(upcoming.map(race => race.date.slice(0, 7)))];
    for (const month of months) $('#month').add(new Option(displayDate(`${month}-01`, { month: 'long', year: 'numeric' }), month));
    for (const source of data.sources) $('#source').add(new Option(source.name, source.id));
    $('#data-status').textContent = `${upcoming.length} cites amb data publicada · Revisat el ${longDate(data.updatedAt)}`;
    if ((date(madridToday()) - date(data.updatedAt)) / 86400000 > 30) {
      $('#data-status').classList.add('stale');
      $('#data-status').textContent += ' · Cal revisar les fonts';
    }
    if (matchMedia('(max-width: 760px)').matches) $('#filter-details').open = false;
    restoreUrl(); render({ updateUrl: false });
  } catch (error) {
    console.error('No s’ha pogut carregar el calendari', error);
    $('#data-status').textContent = 'El calendari no s’ha pogut carregar';
    $('#results-description').textContent = 'Error en carregar les dades';
    $('#race-list').innerHTML = '<div class="empty-state"><h3>No hem pogut preparar l’agenda</h3><p>Comprova la connexió i torna-ho a provar.</p><button class="primary-button" id="retry">Tornar a carregar</button></div>';
    $('#retry').addEventListener('click', () => location.reload());
  }
}
init();
