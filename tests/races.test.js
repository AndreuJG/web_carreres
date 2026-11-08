import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { madridToday, oneYearAfter, distanceKm, selectRaces, makeCalendar, matchesDistance } from '../lib/races.js';

const origin = { lat: 39.402, lon: -0.403 };
const fixture = { id: 'test', name: 'Carrera d’Alcàsser', town: 'Alcàsser', date: '2027-01-10', time: null, lat: 39.368, lon: -0.444, distances: [5, 10], type: 'popular', sourceIds: ['cronorunner'], location: 'Plaça del Castell', note: 'Hora pendent.', url: 'https://example.org/' };

test('usa el dia de Madrid en els canvis d’hora i de data', () => {
  assert.equal(madridToday(new Date('2026-11-08T23:30:00Z')), '2026-11-09');
  assert.equal(madridToday(new Date('2027-07-01T22:30:00Z')), '2027-07-02');
});
test('l’any següent respecta el 29 de febrer', () => {
  assert.equal(oneYearAfter('2028-02-29'), '2029-02-28');
  assert.equal(oneYearAfter('2026-11-08'), '2027-11-08');
});
test('exclou hui i dates passades, i inclou el límit anual', () => {
  const races = ['2026-11-07', '2026-11-08', '2026-11-09', '2027-11-08', '2027-11-09'].map(day => ({ ...fixture, id: day, date: day }));
  assert.deepEqual(selectRaces(races, origin, {}, '2026-11-08').map(race => race.date), ['2026-11-09', '2027-11-08']);
});
test('el radi té un màxim de 50 km encara que es demane més', () => {
  assert.equal(distanceKm(origin, origin), 0);
  assert(Math.abs(distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }) - 111.195) < 0.01);
  const far = { ...fixture, lat: 40, lon: -0.4 };
  assert.equal(selectRaces([far], origin, { radius: 500 }, '2026-11-08').length, 0);
});
test('cerca sense accents i combina filtres i guardades', () => {
  assert.equal(selectRaces([fixture], origin, { query: 'alcasser', source: 'cronorunner', month: '2027-01', savedOnly: true, savedIds: ['test'] }, '2026-11-08').length, 1);
  assert.equal(selectRaces([fixture], origin, { savedOnly: true, savedIds: [] }, '2026-11-08').length, 0);
  assert.equal(selectRaces([fixture], origin, { source: 'sportmaniacs' }, '2026-11-08').length, 0);
});
test('les variants d’una carrera coincideixen amb més d’un filtre', () => {
  assert(matchesDistance([5, 10], 'short'));
  assert(matchesDistance([5, 10], 'medium'));
  assert(!matchesDistance([7.5], 'short'));
  assert(matchesDistance([21.0975], 'half'));
  assert(matchesDistance([42.195], 'marathon'));
});
test('el calendari usa dies complets, límits exclusius, escapament i plegat UTF-8', () => {
  const calendar = makeCalendar([{ ...fixture, date: '2026-12-31', name: 'Una carrera, solidària; de prova', note: 'À'.repeat(100) + '\nSegona línia' }], new Date('2026-11-08T12:00:00Z'));
  assert(calendar.includes('DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101'));
  assert(calendar.includes('Una carrera\\, solidària\\; de prova'));
  assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert(calendar.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75));
});
test('la selecció inicial conté 15 cites futures, amb exclusió automàtica posterior', async () => {
  const data = JSON.parse(await readFile(new URL('../data/races.json', import.meta.url), 'utf8'));
  assert.equal(selectRaces(data.races, data.origin, {}, '2026-11-08').length, 15);
  assert.equal(selectRaces(data.races, data.origin, {}, '2027-11-08').length, 0);
});
