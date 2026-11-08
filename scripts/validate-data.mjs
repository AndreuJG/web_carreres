import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TYPE_LABELS, distanceKm } from '../lib/races.js';

const data = JSON.parse(await readFile(new URL('../data/races.json', import.meta.url), 'utf8'));
const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const ids = new Set(), sourceIds = new Set(data.sources.map(source => source.id));
assert(isDate(data.updatedAt), 'La data de revisió ha de ser vàlida');
function https(url) { assert.equal(new URL(url).protocol, 'https:', `Enllaç no segur: ${url}`); }
for (const source of data.sources) https(source.url);
for (const race of data.races) {
  assert(!ids.has(race.id), `ID duplicat: ${race.id}`); ids.add(race.id);
  assert(race.name && race.town && race.location && race.note, `Fitxa incompleta: ${race.id}`);
  assert(isDate(race.date) && isDate(race.verifiedAt), `Data invàlida: ${race.id}`);
  assert(race.verifiedAt <= data.updatedAt, `Revisió futura: ${race.id}`);
  assert(race.time === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(race.time), `Hora invàlida: ${race.id}`);
  assert(Object.hasOwn(TYPE_LABELS, race.type), `Tipus desconegut: ${race.id}`);
  assert(race.distances.length && race.distances.every(km => Number.isFinite(km) && km > 0), `Distància invàlida: ${race.id}`);
  assert(Number.isFinite(race.lat) && Number.isFinite(race.lon) && Math.abs(race.lat) <= 90 && Math.abs(race.lon) <= 180, `Coordenades invàlides: ${race.id}`);
  assert(distanceKm(data.origin, race) <= 50, `Fora del radi: ${race.id}`);
  assert(race.sourceIds.length && race.sourceIds.every(id => sourceIds.has(id)), `Font desconeguda: ${race.id}`);
  assert(race.sources.length && race.sources.every(source => source.label), `Falten fonts: ${race.id}`);
  https(race.url); race.sources.forEach(source => https(source.url));
}
console.log(`${data.races.length} carreres validades: dates, coordenades, radi, fonts i enllaços HTTPS.`);
