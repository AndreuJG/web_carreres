import test from 'node:test';
import assert from 'node:assert/strict';
import {publishStateCommit} from '../scripts/telegram/publish-state.mjs';

test('reintenta el mateix comprovant després d’una fallada transitòria', () => {
  const commits=[], waits=[];
  publishStateCommit({commit:'receipt',parent:'old',readHead:()=> 'old',sleep:ms=>waits.push(ms),push:id=>{commits.push(id);if(commits.length<3)throw Error('temporary');}});
  assert.deepEqual(commits,['receipt','receipt','receipt']); assert.deepEqual(waits,[1000,3000]);
});
test('una resposta perduda de GitHub no provoca repetir la publicació', () => {
  let pushes=0;
  publishStateCommit({commit:'receipt',parent:'old',readHead:()=> 'receipt',sleep:()=>assert.fail(),push:()=>{pushes++;throw Error('lost response');}});
  assert.equal(pushes,1);
});
test('no sobreescriu un estat concurrent i limita els reintents', () => {
  assert.throws(()=>publishStateCommit({commit:'receipt',parent:'old',readHead:()=> 'other',sleep:()=>assert.fail(),push:()=>{throw Error();}}),/altra execució/);
  let pushes=0;
  assert.throws(()=>publishStateCommit({commit:'receipt',parent:'old',readHead:()=>{throw Error();},sleep:()=>{},push:()=>{pushes++;throw Error();}}),/quatre intents/);
  assert.equal(pushes,4);
});
