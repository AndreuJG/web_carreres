import {formatDistance, oneYearAfter} from '../../lib/races.js';

const html = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const dayLabel = day => day.split('-').reverse().join('/');
const distanceLabel = distances => distances.map(formatDistance).join(' / ') + ' km';
const distanceKey = distances => [...distances].sort((a, b) => a - b).join(',');

export function raceNews(before, after, cancelledIds, today) {
  const previous = new Map(before.races.map(race => [race.id, race]));
  const current = new Map(after.races.map(race => [race.id, race]));
  const end = oneYearAfter(today);
  const upcoming = race => race.date > today && race.date <= end;
  const news = [];
  for (const race of current.values()) {
    if (!upcoming(race)) continue;
    const old = previous.get(race.id);
    if (!old) {
      news.push({race, label: 'Nova carrera', details: [dayLabel(race.date), distanceLabel(race.distances)]});
      continue;
    }
    const details = [];
    if (old.date !== race.date) details.push(`Data: ${dayLabel(old.date)} → ${dayLabel(race.date)}`);
    if (old.time !== race.time) details.push(`Hora: ${old.time || 'pendent'} → ${race.time || 'pendent'}`);
    if (distanceKey(old.distances) !== distanceKey(race.distances)) {
      details.push(`Distància: ${distanceLabel(old.distances)} → ${distanceLabel(race.distances)}`);
    }
    if (details.length) news.push({race, label: 'Canvi', details});
  }
  for (const id of cancelledIds) {
    const race = previous.get(id);
    if (race && race.date >= today && race.date <= end && !current.has(id)) {
      news.push({race, label: 'Cancel·lada', details: [dayLabel(race.date)]});
    }
  }
  return news.sort((a, b) => a.race.date.localeCompare(b.race.date) || a.race.name.localeCompare(b.race.name, 'ca'));
}

export function digestMessages(news, today) {
  const heading = `<b>Novetats de Córrer a prop · ${dayLabel(today)}</b>`;
  const messages = [];
  let message = heading;
  for (const {race, label, details} of news) {
    const url = new URL(race.url);
    if (url.protocol !== 'https:') throw Error('Enllaç de convocatòria invàlid');
    const name = html(race.name.slice(0, 280));
    const entry = `\n\n<b>${label}</b> · <a href="${html(url.href)}">${name}</a>\n${html([race.town, ...details].join(' · '))}`;
    if (message.length + entry.length > 4000 && message !== heading) {
      messages.push(message);
      message = heading;
    }
    message += entry;
  }
  if (message !== heading) messages.push(message);
  return messages;
}

export async function sendMessage({token, channel, message, fetchImpl = fetch}) {
  let response;
  let body;
  try {
    response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      redirect: 'error',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({chat_id: channel, text: message, parse_mode: 'HTML', link_preview_options: {is_disabled: true}}),
      signal: AbortSignal.timeout(15000)
    });
    body = await response.json();
  } catch {
    return {status: 'uncertain'};
  }
  if (response.ok && body?.ok === true && Number.isSafeInteger(body.result?.message_id)) {
    return {status: 'sent', messageId: body.result.message_id};
  }
  if (body?.ok === false && response.status >= 400 && response.status < 500) {
    return {status: 'rejected', code: response.status};
  }
  return {status: 'uncertain'};
}

export async function deliverDigest(state, today, save, send) {
  for (const part of state.pending.parts) {
    if (part.messageId !== undefined) continue;
    part.inFlight = true;
    save(state);
    const result = await send(part.text);
    if (result.status === 'uncertain') throw Error('Lliurament incert. Revisa el canal abans de resoldre el fragment pendent.');
    delete part.inFlight;
    if (result.status === 'sent') part.messageId = result.messageId;
    save(state);
    if (result.status === 'rejected') throw Error(`Telegram ha rebutjat l’enviament (HTTP ${result.code}). Es tornarà a intentar.`);
  }
  state.catalog = state.pending.catalog;
  state.lastSentDay = today;
  delete state.pending;
  save(state);
}
