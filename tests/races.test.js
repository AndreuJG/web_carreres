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
test('el catàleg revisat conté 46 cites futures, amb exclusió automàtica posterior', async () => {
  const data = JSON.parse(await readFile(new URL('../data/races.json', import.meta.url), 'utf8'));
  assert.equal(selectRaces(data.races, data.origin, {}, '2026-11-08').length, 46);
  assert.equal(selectRaces(data.races, data.origin, {}, '2027-11-08').length, 0);
});

test('Sagunt i Benifaió apareixen amb la seua font, modalitats i radi correctes', async () => {
  const data = JSON.parse(await readFile(new URL('../data/races.json', import.meta.url), 'utf8'));
  for (const [query, source, expectedId, distances] of [
    ['sagunt', 'sportmaniacs', 'sagunt-2026', [10, 21, 30]],
    ['benifaio', 'cronorunner', 'benifaio-2026', [10, 21.1]]
  ]) {
    const races = selectRaces(data.races, data.origin, { query, source }, '2026-11-08').filter(race => race.id === expectedId);
    assert.equal(races.length, 1);
    assert.equal(races[0].id, expectedId);
    assert.equal(races[0].date, '2026-11-15');
    assert.deepEqual(races[0].distances, distances);
    assert(races[0].proximity < 50);
  }
});

test('els filtres separen 20 km, mitja marató, 30/40 km i marató', () => {
  assert(!matchesDistance([20], 'half'));
  assert(!matchesDistance([19], 'long'));
  assert(matchesDistance([15], 'long'));
  for (const km of [19, 20, 25, 30, 40]) assert(matchesDistance([km], 'otherLong'));
  for (const km of [21, 21.0975, 21.1]) {
    assert(matchesDistance([km], 'half'));
    assert(!matchesDistance([km], 'otherLong'));
  }
  assert(!matchesDistance([40], 'marathon'));
  assert(matchesDistance([42], 'marathon'));
  assert(!matchesDistance([42.195], 'otherLong'));
});

test('totes les fitxes i circuits de Cronorunner tenen decisió i cobertura', async () => {
  const data = JSON.parse(await readFile(new URL('../data/races.json', import.meta.url), 'utf8'));
  const review = JSON.parse(await readFile(new URL('../research/review.json', import.meta.url), 'utf8'));
  const records = review.catalogs.cronorunner;
  assert.equal(records.length, 17);
  assert.equal(new Set(records.map(r => r.url)).size, 17);
  const included = records.filter(r => r.status === 'included');
  assert.equal(included.length, 13);
  assert.deepEqual(new Set(selectRaces(data.races, data.origin, { source: 'cronorunner' }, review.reviewedAt).map(r => r.id)), new Set(included.map(r => r.raceId)));
  assert.equal(review.catalogs.cronorunnerCircuits.length, 5);
  assert.equal(review.catalogs.cronorunnerCircuits.flatMap(c => c.entries).length, 55);
  for (const record of [...records, ...review.catalogs.cronorunnerCircuits.flatMap(c => c.entries)]) {
    assert(record.date, `Falta data: ${record.url}`);
    if (record.status === 'included') {
      const race = data.races.find(r => r.id === record.raceId);
      assert(race, `Falta carrera: ${record.url}`);
      assert(race.sources.some(s => s.url === record.url), `Falta font directa: ${record.raceId}`);
      // La fitxa actualitzada pot substituir una data antiga del circuit (Catarroja).
      if (records.includes(record)) assert.equal(race.date, record.date);
    } else {
      assert(record.reason, `Falta causa d’exclusió: ${record.url}`);
      if (record.date > review.reviewedAt) assert(/Calles|Benidorm/.test(record.reason), `Cita futura del circuit sense incorporar: ${record.url}`);
    }
  }
});

test('l’inventari de les altres fonts referencia fitxes reals i exclusions explícites', async () => {
  const data = JSON.parse(await readFile(new URL('../data/races.json', import.meta.url), 'utf8'));
  const review = JSON.parse(await readFile(new URL('../research/review.json', import.meta.url), 'utf8'));
  for (const record of [...review.catalogs.sportmaniacs, ...review.catalogs.sportmaniacsCastellon, ...review.catalogs.crono4sports]) {
    if (record.status === 'included') {
      const race = data.races.find(r => r.id === record.raceId);
      assert(race, record.url);
      assert(race.sources.some(s => s.url.replace('/es/services/inscription/', '/es/races/') === record.url), record.url);
    } else assert(record.reason, record.url);
  }
  assert.equal(review.newRaceIds.length, 28);
  assert(review.newRaceIds.every(id => data.races.some(r => r.id === id)));
  assert(review.boundaryExclusions.every(town => distanceKm(data.origin, town) > 50));
  assert(selectRaces(data.races, data.origin, { query: 'xativa' }, review.reviewedAt).length === 3);
  assert(selectRaces(data.races, data.origin, { query: 'xeraco' }, review.reviewedAt).length === 1);
});

test('les modalitats de caminada no contaminen les distàncies de carrera', async () => {
  const data = JSON.parse(await readFile(new URL('../data/races.json', import.meta.url), 'utf8'));
  for (const [id, distances] of [['castell-sagunt-2027', [10.6]], ['sueca-2026', [8.5, 15]], ['lliria-2026', [11.3, 20]], ['navarres-2026', [12, 19, 40]]]) {
    assert.deepEqual(data.races.find(r => r.id === id).distances, distances);
  }
  assert(!data.races.some(r => /circuit-vall-de-sego|valencia-trail-race-2026-2027/.test(r.url)));
});

test('Catarroja usa la nova data i no queda duplicada com a pendent ni exclosa per la data antiga', async () => {
  const data = JSON.parse(await readFile(new URL('../data/races.json', import.meta.url), 'utf8'));
  const races = selectRaces(data.races, data.origin, { query: 'catarroja', source: 'cronorunner', radius: 10 }, '2026-11-08');
  assert.equal(races.length, 1);
  assert.equal(races[0].date, '2026-11-14');
  assert.equal(races[0].time, '08:30');
  assert(races[0].note.includes('Ajornada del 3 d’octubre'));
  assert(races[0].sources.some(source => source.url.includes('ref=156-2172')));
  assert(!data.pending.some(item => /Catarroja|Benifaió/.test(item.name)));
  assert.equal(selectRaces(data.races, data.origin, { query: 'catarroja' }, '2026-11-14').length, 0);
});
