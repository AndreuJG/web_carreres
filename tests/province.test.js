import test from 'node:test';
import assert from 'node:assert/strict';
import {municipalities, provinceMunicipality} from '../lib/municipalities.js';
import {selectRaces} from '../lib/races.js';
import {candidateDecision} from '../scripts/sync/core.mjs';

test('els 266 municipis tenen codi únic, coordenades i Catarroja com a opció', () => {
 assert.equal(municipalities.length,266);
 assert.equal(new Set(municipalities.map(t=>t.id)).size,266);
 assert(municipalities.every(t=>t.id.startsWith('46')&&Number.isFinite(t.lat)&&Number.isFinite(t.lon)));
 assert.equal(municipalities.find(t=>t.id==='46094').name,'Catarroja');
});
test('el catàleg provincial admet Requena i exclou localitats de Castelló', () => {
 const centre=municipalities.find(t=>t.name==='Catarroja');
 const town=municipalities.find(t=>t.name==='Requena');
 const race={...town,town:town.name,id:'test',name:'Trail Requena',date:'2027-01-01',distances:[10],sourceIds:['cronorunner']};
 const outside={...race,town:'Sot de Ferrer',lat:39.8,lon:-0.4};
 assert(provinceMunicipality(race));
 assert.equal(provinceMunicipality(outside),undefined);
 assert.equal(candidateDecision(race,{...centre,province:'46'},'2026-11-23'),null);
 assert.equal(selectRaces([race,outside],centre,{province:true,radius:'all'},'2026-11-23').length,1);
 assert.equal(selectRaces([race],centre,{province:true,radius:25},'2026-11-23').length,0);
 assert.equal(selectRaces([race],town,{province:true,radius:10},'2026-11-23').length,1);
});
