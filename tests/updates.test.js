import assert from 'node:assert/strict';
import test from 'node:test';
import {mergeRouteLinks} from '../scripts/sync/core.mjs';
import {findRouteLinks} from '../scripts/sync/routes.mjs';
import {deliverDigest, digestMessages, raceNews, sendMessage} from '../scripts/telegram/digest.mjs';

const date = '2026-11-13';
const race = {id: 'a', name: 'Cursa A & B', town: 'Catarroja', date: '2026-12-01', time: '09:00',
  distances: [5, 10], url: 'https://example.org/carrera?a=1&b=2'};

test('Telegram envia canvis de carrera i cancel·lacions explícites i ignora actualitzacions tècniques', () => {
  const cancelled = {...race, id: 'cancelled'};
  const deleted = {...race, id: 'deleted'};
  const expired = {...race, id: 'expired', date: '2026-11-12'};
  const before = {races: [race, cancelled, deleted, expired]};
  const after = {races: [
    {...race, date: '2026-12-02', distances: [10, 5], checkedAt: 'new'},
    {...race, id: 'new'},
  ]};
  const news = raceNews(before, after, new Set(['cancelled', 'expired']), date);
  assert.deepEqual(news.map(item => item.label), ['Nova carrera', 'Cancel·lada', 'Canvi']);
  assert.deepEqual(news.at(-1).details, ['Data: 01/12/2026 → 02/12/2026']);
  assert.match(digestMessages(news, date)[0], /Cursa A &amp; B/);
  assert.match(digestMessages(news, date)[0], /\?a=1&amp;b=2/);
  assert.deepEqual(digestMessages(raceNews(before, before, new Set(), date), date), []);
});

test('Telegram conserva fragments lliurats i reintenta un rebuig explícit', async () => {
  const state = {catalog: 'old', pending: {catalog: 'new', parts: [{text: 'primer'}, {text: 'segon'}]}};
  const saves = [];
  const save = value => saves.push(structuredClone(value));
  await assert.rejects(deliverDigest(state, date, save, async text => text === 'primer'
    ? {status: 'sent', messageId: 1} : {status: 'rejected', code: 429}), /429/);
  assert.equal(state.catalog, 'old');
  assert.equal(state.pending.parts[0].messageId, 1);
  assert.equal(state.pending.parts[1].inFlight, undefined);
  await deliverDigest(state, date, save, async text => {
    assert.equal(text, 'segon');
    return {status: 'sent', messageId: 2};
  });
  assert.deepEqual(state, {catalog: 'new', lastSentDay: date});
  assert.equal(saves[0].pending.parts[0].inFlight, true);
});

test('Telegram deixa constància d’un lliurament incert sense revelar el token', async () => {
  const state = {catalog: 'old', pending: {catalog: 'new', parts: [{text: 'resum'}]}};
  const send = message => sendMessage({token: 'secret', channel: '@agenda', message,
    fetchImpl: async () => { throw Error('secret'); }});
  await assert.rejects(deliverDigest(state, date, () => {}, send), /^Error: Lliurament incert\./);
  assert.equal(state.pending.parts[0].inFlight, true);
});

test('incorpora un GPX amb modalitat i edició acreditades i conserva els dubtes per a revisar', () => {
  const source = 'https://example.org/carrera';
  const routeLinks = findRouteLinks(`
    <a href="/track_10k_2026.gpx">Track 10K</a>
    <a href="/track_10k_2025.gpx">Track 10K</a>
    <a href="/reglament-2026.pdf">Reglament</a>
    <a href="/mapa">Recorregut</a>
    <a href="javascript:alert(1)">Track</a>
    <iframe src="https://es.wikiloc.com/wikiloc/embedv2.do?id=123456"></iframe>
  `, source);
  const existing = {...race, routes: [{url: 'https://example.org/antic.gpx', year: 2024}]};
  const pending = mergeRouteLinks(existing, {...race, sourceId: 'source', routeLinks});
  assert.deepEqual(existing.routes.map(route => route.year), [2024, 2026]);
  assert.equal(existing.routes[1].modality, '10 km');
  assert.equal(pending.length, 3);
  assert.equal(pending.at(-1).url, 'https://es.wikiloc.com/wikiloc/view.do?id=123456');
});
