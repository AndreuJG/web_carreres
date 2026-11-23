import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/contact.js';

test('contacte: valida la petició i només confirma una entrega acceptada', async () => {
  const oldEmail=process.env.CONTACT_EMAIL, oldFetch=globalThis.fetch;
  process.env.CONTACT_EMAIL='private@example.org';
  let calls=0;
  globalThis.fetch=async ()=>{calls++;return {ok:true,json:async()=>({success:'true'})};};
  const run=async (body,origin='https://carreresprop.vercel.app')=>{
    const res={setHeader(){},status(code){this.code=code;return this;},json(value){this.value=value;return this;}};
    await handler({method:'POST',headers:{origin,'content-type':'application/json','x-real-ip':'test'},body},res);return res;
  };
  try {
    assert.equal((await run({email:'bad',message:'Missatge de prova'})).code,400);
    assert.equal((await run({email:'runner@example.org',message:'Missatge de prova'},'https://other.example')).code,403);
    assert.equal(calls,0);
    assert.equal((await run({website:'spam'})).code,200);assert.equal(calls,0);
    const response=await run({email:'runner@example.org',message:'Missatge de prova'});
    assert.equal(response.code,200);assert.deepEqual(response.value,{ok:true});assert.equal(calls,1);
    globalThis.fetch=async ()=>({ok:true,json:async()=>({success:'false'})});
    assert.equal((await run({email:'runner@example.org',message:'Missatge de prova'})).code,502);
  } finally {globalThis.fetch=oldFetch;if(oldEmail===undefined)delete process.env.CONTACT_EMAIL;else process.env.CONTACT_EMAIL=oldEmail;}
});
