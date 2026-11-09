export const MAX_RADIUS = 50;
export const TYPE_LABELS = { popular: 'Popular', solidaria: 'Solidària', dones: 'Categoria femenina', trail: 'Trail', infantil: 'Infantil' };

export function madridToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function oneYearAfter(day) {
  const [year, month, date] = day.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year + 1, month, 0)).getUTCDate();
  return `${year + 1}-${String(month).padStart(2, '0')}-${String(Math.min(date, lastDay)).padStart(2, '0')}`;
}

export function distanceKm(a, b) {
  const rad = value => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function normalize(value) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[’']/g, '');
}

export function matchesDistance(distances, filter) {
  if (!filter || filter === 'all') return true;
  const half = km => km >= 20.9 && km <= 21.2;
  const marathon = km => km >= 42 && km < 43;
  return distances.some(km => ({ short: km <= 5, medium: km > 5 && km <= 10, long: km > 10 && km <= 15, half: half(km), marathon: marathon(km), otherLong: km > 15 && !half(km) && !marathon(km) })[filter]);
}

export function selectRaces(races, origin, filters = {}, today = madridToday()) {
  const end = oneYearAfter(today);
  const query = normalize(filters.query || '');
  return races.map(race => ({ ...race, proximity: distanceKm(origin, race) }))
    .filter(race => race.date > today && race.date <= end && race.proximity <= Math.min(MAX_RADIUS, filters.radius ?? MAX_RADIUS))
    .filter(race => !query || normalize(`${race.name} ${race.town}`).includes(query))
    .filter(race => !filters.month || race.date.startsWith(filters.month))
    .filter(race => !filters.type || race.type === filters.type)
    .filter(race => !filters.source || race.sourceIds.includes(filters.source))
    .filter(race => matchesDistance(race.distances, filters.distance))
    .filter(race => !filters.savedOnly || filters.savedIds?.includes(race.id))
    .sort((a, b) => filters.sort === 'near' ? a.proximity - b.proximity || a.date.localeCompare(b.date) : a.date.localeCompare(b.date) || (a.time || '23:59').localeCompare(b.time || '23:59') || a.name.localeCompare(b.name, 'ca'));
}

export function formatDistance(km) {
  return new Intl.NumberFormat('ca-ES', { maximumFractionDigits: 1 }).format(km);
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function icsEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

// Fold at 75 UTF-8 octets, keeping accented characters intact (RFC 5545).
function foldLine(line) {
  let result = '', current = '', size = 0;
  for (const char of line) {
    const bytes = new TextEncoder().encode(char).length;
    if (size + bytes > 75) { result += `${current}\r\n`; current = ' '; size = 1; }
    current += char; size += bytes;
  }
  return result + current;
}

export function makeCalendar(races, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Correr a prop//Carreres//CA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Carreres a prop de Catarroja'];
  for (const race of races) {
    const next = new Date(`${race.date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    lines.push('BEGIN:VEVENT', `UID:${race.id}@correr-a-prop.local`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${race.date.replaceAll('-', '')}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replaceAll('-', '')}`, `SUMMARY:${icsEscape(race.name)}`, `LOCATION:${icsEscape(`${race.location}, ${race.town}`)}`, `DESCRIPTION:${icsEscape(`${race.time ? `Hora publicada: ${race.time} (Europe/Madrid). ` : 'Hora pendent de confirmar. '}${race.automaticNote ? `${race.automaticNote}\nNotes anteriors: ` : ''}${race.note}\n${race.url}`)}`, `URL:${race.url}`, 'END:VEVENT');
  }
  return [...lines, 'END:VCALENDAR'].map(foldLine).join('\r\n') + '\r\n';
}
