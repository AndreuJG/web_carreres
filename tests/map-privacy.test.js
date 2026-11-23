import test from 'node:test';
import assert from 'node:assert/strict';
import {mapGroups} from '../lib/map.js';
import {CONSENT_KEY, CONSENT_LIFETIME, readConsent} from '../lib/consent.js';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('analítica de producció: no hi ha peticions abans d’acceptar i retirar-la recarrega', async () => {
  const handlers = new Map(), scripts = [], store = new Map();
  let reloads = 0;
  const control = key => ({dataset:{consent:key}, addEventListener:(_,fn)=>handlers.set(key,fn)});
  const panel = {setAttribute(){}, querySelectorAll:()=>[control('false'),control('true')], querySelector:()=>control('close'), showModal(){}, close(){}};
  const context = {
    CONSENT_KEY, readConsent, Date,
    localStorage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)},
    document:{createElement:tag=>tag==='dialog'?panel:{},querySelector:()=>({content:'/_vercel/insights/script.js'}),querySelectorAll:()=>[],body:{append(){}},head:{append:script=>scripts.push(script)}},
    window:{addEventListener(){}},location:{reload(){reloads++;}}
  };
  const source=(await readFile(new URL('../privacy.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'');
  vm.runInNewContext(source,context);
  assert.equal(scripts.length,0);
  handlers.get('false')(); assert.equal(scripts.length,0);
  handlers.get('true')(); assert.equal(scripts.length,1);
  assert.equal(scripts[0].src,'/_vercel/insights/script.js');
  handlers.get('false')(); assert.equal(reloads,1);
  assert.equal(JSON.parse(store.get(CONSENT_KEY)).analytics,false);
});

test('el mapa agrupa carreres del mateix municipi amb les coordenades del poble', () => {
  const races = [{id:'a',town:'Catarroja',lat:39.4,lon:-0.4},{id:'b',town:'Catarroja',lat:39.41,lon:-0.41},{id:'c',town:'Requena',lat:39.48,lon:-1.1}];
  const groups = mapGroups(races);
  assert.equal(groups.length,2);
  assert.deepEqual(groups.find(g=>g.name==='Catarroja').races.map(r=>r.id),['a','b']);
  assert.equal(mapGroups([]).length,0);
});
test('consentiment invàlid, caducat o inaccessible mai activa analítica', () => {
  const now=1800000000000;
  const storage=value=>({getItem:key=>key===CONSENT_KEY?JSON.stringify(value):null});
  const accepted={version:1,analytics:true,at:now-100};
  assert.equal(readConsent(storage(accepted),now).analytics,true);
  assert.equal(readConsent(storage({...accepted,analytics:false}),now).analytics,false);
  for(const value of [null,{}, {...accepted,analytics:'true'}, {...accepted,at:now+1}, {...accepted,at:now-CONSENT_LIFETIME}]) assert.equal(readConsent(storage(value),now),null);
  assert.equal(readConsent({getItem(){throw Error('blocked');}},now),null);
});
test('cap pàgina font carrega directament el script d’analítica', async () => {
  for(const page of ['index.html','ajuda.html','privacitat.html']) {
    const html=await readFile(new URL('../'+page,import.meta.url),'utf8');
    assert(!/<script[^>]+src=["'][^"']*insights/.test(html));
    assert(html.includes('data-privacy-settings'));
    assert(html.includes('./privacy.js'));
  }
});
