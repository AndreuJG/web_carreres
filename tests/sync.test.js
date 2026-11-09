import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseDay,parseTime,distancesFrom,notRunning,candidateDecision,createTownResolver,mergeCandidates,sameRace} from '../scripts/sync/core.mjs';
import {cronoEdition,sportDetail,multiDetail} from '../scripts/sync/parsers.mjs';
import {discover,SOURCE_DEFINITIONS} from '../scripts/sync/sources.mjs';
import {createClient} from '../scripts/sync/http.mjs';
import {validateCatalog} from '../scripts/sync/validate.mjs';
import {loadCatalog} from '../lib/catalog.js';

const catalog=JSON.parse(await readFile(new URL('./fixtures/catalog-2026-11-08.json',import.meta.url),'utf8'));
const day='2026-11-09',stamp='2026-11-09T05:17:00Z';
const race=catalog.races.find(r=>r.id==='catarroja-2026');
const observation={...race,sourceId:'cronorunner'};

test('dates ISO amb T, dates valencianes i dates impossibles',()=>{
 assert.equal(parseDay('2026-11-14T00:00:00.000Z'),'2026-11-14');
 assert.equal(parseDay('diumenge 25 d’abril de 2027'),'2027-04-25');
 assert.equal(parseDay('24 d\'octubre 2027'),'2027-10-24');
 assert.equal(parseDay('30 desembre 2026'),'2026-12-30');
 assert.equal(parseDay('31/02/2027'),null);
 assert.equal(parseDay('Inscripciones abiertas'),null);
 assert.equal(parseTime('2026-11-15T09:30:00.000Z'),'09:30');
});
test('distàncies: decimals, metres i mitja; exclou caminades i dorsal zero',()=>{
 assert.deepEqual(distancesFrom('21,1 km / 5K / 300 m'),[0.3,5,21.1]);
 assert.deepEqual(distancesFrom('5.000 metros'),[5]);
 assert.deepEqual(distancesFrom('Media Maratón'),[21.0975]);
 for(const name of ['CAMINATA','MARCHA','Dorsal 0','senderista','Marxa nòrdica','OCR'])assert(notRunning(name));
 assert(!notRunning('Carrera de muntanya'));
});
test('Cronorunner: hores locals publicades i modalitats, sense marxa ni dorsal zero',()=>{
 const parsed=cronoEdition({name:'Carrera Lusitania',eventDate:'2027-02-07T00:00:00.000Z',location:'Marines',status:'published',races:[
  {name:'TRAIL',raceType:'trail',status:'published',distanceMeters:21000,startDate:'2027-02-07T09:00:00.000Z'},
  {name:'SPRINTRAIL',raceType:'running',status:'published',distanceMeters:15000,startDate:'2027-02-07T09:15:00.000Z'},
  {name:'TRAIL INICIACIÓN',raceType:'other',status:'published',distanceMeters:10500,startDate:'2027-02-07T09:30:00.000Z'},
  {name:'MARCHA',raceType:'walk',status:'published',distanceMeters:10500,startDate:'2027-02-07T09:30:00.000Z'},
  {name:'DORSAL CERO',raceType:'other',status:'published',distanceMeters:0}
 ]});
 assert.equal(parsed.date,'2027-02-07');assert.equal(parsed.time,'09:00');
 assert.deepEqual(parsed.distances,[10.5,15,21]);assert(!parsed.note.includes('MARCHA'));
});
test('Sportmaniacs: no confon la data d’inscripció amb la carrera ni inclou caminades',()=>{
 const cards=[['MARATON','08:00',40],['TRAIL','09:00',19],['SPRINT','09:02',12],['CAMINATA','09:03',12]].map(([name,time,distance])=>`<div class="event-card"><h2 class="event-title">${name}<div class="extra-info"><span class="event-time">15/11/2026 ${time}</span><span class="event-distance">${distance}km</span></div></h2></div>`).join('');
 const html=`<script type="application/ld+json">${JSON.stringify({'@type':'SportsEvent',name:'XI TRAIL NAVARRES',startDate:'2026-11-15',location:{address:{addressLocality:'Navarrés'}}})}</script><p>Inscripciones hasta 11/11/2026</p><section id="registrations">${cards}</section>`;
 const parsed=sportDetail(html,'https://sportmaniacs.com/es/races/trail-navarres');
 assert.equal(parsed.date,'2026-11-15');assert.equal(parsed.time,'08:00');assert.deepEqual(parsed.distances,[12,19,40]);
 assert.throws(()=>sportDetail('<h1>Forbidden</h1>','https://sportmaniacs.com/es/races/failed'));
});
test('Multiesport: interpreta la llista 11, 21Km sense convertir-la en 11,21',()=>{
 const html='<h1>Trail Llíria</h1>'+['Fecha: 22/11/2026','Hora: 09:00','Km: 11, 21Km','Población: Llíria','Disciplina: Trail'].map(x=>`<div class="jet-listing-dynamic-field__content">${x}</div>`).join('');
 assert.deepEqual(multiDetail(html,'https://multiesport.es/event/lliria/').distances,[11,21]);
});
test('paginació Sportmaniacs: recorre les futures i para en les dates passades',async()=>{
 const calls=[];
 const card=date=>`<a class="raceCard" href="/es/races/test-${date}"><h3 class="card-title">10K</h3><div class="card-footer"><time datetime="${date}">${date}</time> Valencia</div></a>`;
 const request=async url=>{calls.push(url);return{text:url.includes('page=1')?card('2027-01-10'):card('2026-11-08')}};
 const result=await discover(SOURCE_DEFINITIONS.find(s=>s.id==='sportmaniacs'),request,day);
 assert.equal(calls.length,4);assert.equal(result.items.length,1);
});
test('geografia: Tabernas d’Almeria no és Tavernes; desconegudes no s’inferixen de «carrera»',async()=>{
 const gazetteer=JSON.parse(await readFile(new URL('../scripts/sync/towns.json',import.meta.url),'utf8'));
 const resolve=createTownResolver(gazetteer,catalog);
 assert(resolve('Tabernas','Carrera del desierto de Tabernas').lat<38);
 assert.equal(resolve('Poble inventat','Carrera solidària del poble'),null);
 assert.equal(resolve('Valencia','Sant Silvestre Trail Barx').name,'Barx');
 assert.equal(resolve('Puçol','Trail').name,'Puçol');
 const ambiguous=createTownResolver({towns:[{name:'Lloc A',lat:39.4,lon:-.4,aliases:['Nom repetit']},{name:'Lloc B',lat:40.4,lon:-.4,aliases:['Nom repetit']}]},{races:[]});
 assert.equal(ambiguous('Nom repetit','10K'),null);
});
test('fusió: una font buida o fallida conserva totes les carreres bones',()=>{
 const merged=mergeCandidates(catalog,[],day,stamp);
 assert.deepEqual(merged.data.races,catalog.races);assert.deepEqual(merged.changes,[]);
});
test('fusió: primera lectura preserva correccions manuals; un canvi posterior actualitza sense duplicar',()=>{
 const first=mergeCandidates(catalog,[observation],day,stamp).data;
 const second=mergeCandidates(first,[{...observation,date:'2026-11-21',time:'09:15'}],day,'2026-11-10T05:17:00Z');
 assert.equal(second.data.races.length,catalog.races.length);
 assert.equal(second.data.races.find(r=>r.id===race.id).date,'2026-11-21');
 assert.equal(second.data.races.find(r=>r.id===race.id).time,'09:15');
 assert(second.data.races.find(r=>r.id===race.id).automaticNote);
 assert.deepEqual(second.changes[0].fields,['date','time']);
});
test('un ajornament conegut en la primera consulta s’incorpora i els ajustos bloquejats es respecten',()=>{
 const seeded=structuredClone(catalog);const old=seeded.races.find(r=>r.id===race.id);
 old.automation={lockedFields:['distances'],observations:{cronorunner:{date:old.date,time:old.time,distances:old.distances}}};
 const merged=mergeCandidates(seeded,[{...observation,date:'2026-11-21',distances:[12]}],day,stamp);
 assert.deepEqual(merged.data.races.find(r=>r.id===race.id).distances,[10]);
 assert.equal(merged.data.races.find(r=>r.id===race.id).date,'2026-11-21');
});
test('deduplicació entre fonts amb accents i variants del nom',()=>{
 assert(sameRace({name:'Bimbo Valencia Breakfast Run',town:'València',date:day,distances:[5]},{name:'Bimbo València Breakfast Run 2026',town:'València',date:day,distances:[5.4]}));
 assert(!sameRace({...race},{...race,date:'2027-11-14'}));
});
test('una URL reutilitzada l’any següent crea una nova edició sense moure la carrera antiga',()=>{
 const next={...observation,date:'2027-11-14'};
 const merged=mergeCandidates(catalog,[next],'2026-11-15',stamp);
 assert.equal(merged.data.races.find(r=>r.id===race.id).date,'2026-11-14');
 assert.equal(merged.data.races.length,catalog.races.length+1);
 assert.equal(mergeCandidates(merged.data,[next],'2026-11-15',stamp).data.races.length,merged.data.races.length);
});
test('una convocatòria cancel·lada explícitament es retira, una dada incompleta no',()=>{
 const incomplete=mergeCandidates(catalog,[{...observation,distances:[]}],day,stamp);assert(incomplete.data.races.some(r=>r.id===race.id));
 const cancelled=mergeCandidates(catalog,[{...observation,cancelled:true}],day,stamp);assert(!cancelled.data.races.some(r=>r.id===race.id));
 assert.equal(candidateDecision({...observation,lat:40.5},catalog.origin,day),'Fora del radi');
});
test('client HTTP: un 403 no és una llista buida i no es consulten hosts aliens',async()=>{
 let calls=0;const request=createClient({fetchImpl:async()=>{calls++;return new Response('Forbidden',{status:403})},retries:0});
 await assert.rejects(request('https://sportmaniacs.com/es/races'),/HTTP 403/);assert.equal(calls,1);
 await assert.rejects(request('https://example.com/private'),/Font no autoritzada/);
});
test('carrega el catàleg viu i conserva una còpia vàlida si la xarxa falla',async()=>{
 const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
 const remote={...catalog,sync:{checkedAt:stamp}};
 const online=await loadCatalog({localUrl:'local',remoteUrl:'remote',storage,fetchImpl:async()=>({ok:true,json:async()=>remote})});
 assert.equal(online.mode,'live');
 const offline=await loadCatalog({localUrl:'local',remoteUrl:'remote',storage,fetchImpl:async url=>{if(url==='remote')throw Error('offline');return{ok:true,json:async()=>catalog}}});
 assert.equal(offline.mode,'cached');assert.equal(offline.data.sync.checkedAt,stamp);
});
test('un JSON remot invàlid no substituïx el catàleg de reserva',async()=>{
 const result=await loadCatalog({localUrl:'local',remoteUrl:'remote',fetchImpl:async url=>({ok:true,json:async()=>url==='remote'?{races:[]}:catalog})});
 assert.equal(result.mode,'bundled');assert.equal(result.data.races.length,46);
});
test('el catàleg de producció continua complint l’esquema després de qualsevol sincronització',async()=>{
 const live=JSON.parse(await readFile(new URL('../data/races.json',import.meta.url),'utf8'));
 assert.equal(validateCatalog(live),live);
 assert.throws(()=>validateCatalog({...live,races:[]}));
});
