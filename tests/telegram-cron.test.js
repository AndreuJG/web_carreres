import assert from 'node:assert/strict';
import test from 'node:test';
import {deliveryStatus, runTelegramCron} from '../lib/telegram-cron.js';

const env = {CRON_SECRET: 'test-secret', GITHUB_DISPATCH_TOKEN: 'test-token'};
const req = {method: 'GET', headers: {authorization: 'Bearer test-secret'}};
const mockResponse = () => ({
  code: null, body: null, setHeader() {},
  status(code) {this.code = code; return this;},
  json(body) {this.body = body; return this;}
});

test('el disparador rebutja peticions sense autorització i configuració incompleta', async () => {
  let response = mockResponse();
  const neverFetch = async () => {throw Error('Unexpected request');};
  await runTelegramCron({...req, headers: {}}, response, 'telegram.yml', {env, fetchImpl: neverFetch});
  assert.equal(response.code, 401);
  response = mockResponse();
  await runTelegramCron(req, response, 'telegram.yml', {env: {CRON_SECRET: env.CRON_SECRET}, fetchImpl: neverFetch});
  assert.equal(response.code, 503);
});

test('el disparador comprova el lliurament abans de llançar el workflow', async () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/Madrid'}).format(now);
  const response = mockResponse();
  let calls = 0;
  await runTelegramCron(req, response, 'telegram.yml', {env, fetchImpl: async () => {
    calls++;
    return Response.json({lastSentDay: parts});
  }});
  assert.equal(response.code, 200);
  assert.equal(response.body.action, 'already-delivered');
  assert.equal(calls, 1);
});

test('la recuperació llança un workflow manual i informa dels permisos rebutjats', async () => {
  for (const status of [204, 403]) {
    const response = mockResponse();
    const calls = [];
    await runTelegramCron(req, response, 'telegram.yml', {env, fetchImpl: async (url, options) => {
      calls.push({url, options});
      return calls.length === 1 ? Response.json({lastSentDay: '2020-01-01'})
        : new Response(null, {status});
    }});
    assert.equal(response.code, status === 204 ? 202 : 502);
    assert.deepEqual(JSON.parse(calls[1].options.body), {ref: 'main', inputs: {mode: 'send'}});
  }
});

test('la comprovació detecta dies sense avís i els lliuraments incerts', async () => {
  const response = mockResponse();
  await runTelegramCron(req, response, 'telegram.yml', {env, fetchImpl: async () =>
    Response.json({lastSentDay: '2020-01-01', pending: {parts: [{inFlight: true}]}})});
  assert.equal(response.code, 503);
  const stale = await deliveryStatus(async () => Response.json({lastSentDay: '2026-11-22'}), new Date('2026-11-23T12:05:00Z'));
  assert.equal(stale.overdue, true);
});
