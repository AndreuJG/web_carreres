import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '../scripts/sync/http.mjs';

test('admet la mida real de Multiesport mantenint el límit de les altres fonts', async () => {
  const body='a'.repeat(6409000);
  const client=createClient({fetchImpl:async()=>new Response(body)});
  assert.equal((await client('https://multiesport.es/event/test/')).text.length,body.length);
  await assert.rejects(client('https://www.runatica.com/event/test'),/Resposta massa gran/);
});
test('interromp la lectura quan supera el màxim i no repetix la mateixa descàrrega', async () => {
  let requests=0,cancelled=false;
  const client=createClient({fetchImpl:async()=>{
    requests++;
    return new Response(new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(1000000));},cancel(){cancelled=true;}}));
  }});
  await assert.rejects(client('https://multiesport.es/event/test/'),/Resposta massa gran/);
  assert.equal(requests,1); assert.equal(cancelled,true);
});
