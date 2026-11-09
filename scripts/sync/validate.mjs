import assert from 'node:assert/strict';
import {distanceKm,TYPE_LABELS} from '../../lib/races.js';
import {validDay} from './core.mjs';
export function validateCatalog(data){
 assert(validDay(data.updatedAt),'Data de revisió invàlida');
 assert(data.origin && Number.isFinite(data.origin.lat) && Number.isFinite(data.origin.lon),'Origen invàlid');
 assert(Array.isArray(data.races)&&data.races.length,'Catàleg buit o invàlid');
 assert(Array.isArray(data.sources)&&Array.isArray(data.pending),'Esquema incomplet');
 const ids=new Set(),sources=new Set(data.sources.map(s=>s.id));
 const https=url=>assert(new URL(url).protocol==='https:','Font no HTTPS');
 for(const race of data.races){
  assert(!ids.has(race.id)&&race.id,'ID duplicat o buit');ids.add(race.id);
  assert(race.name&&race.town&&race.location&&race.note,`Fitxa incompleta: ${race.id}`);
  assert(validDay(race.date)&&validDay(race.verifiedAt)&&race.verifiedAt<=data.updatedAt,`Dates invàlides: ${race.id}`);
  assert(race.time===null||/^([01]\d|2[0-3]):[0-5]\d$/.test(race.time),`Hora invàlida: ${race.id}`);
  assert(Object.hasOwn(TYPE_LABELS,race.type),`Tipus invàlid: ${race.id}`);
  assert(race.distances?.length&&race.distances.every(km=>Number.isFinite(km)&&km>0&&km<=300),`Distàncies invàlides: ${race.id}`);
  assert(Number.isFinite(race.lat)&&Number.isFinite(race.lon)&&distanceKm(data.origin,race)<=50,`Coordenades fora del radi: ${race.id}`);
  assert(race.sourceIds?.length&&race.sourceIds.every(s=>sources.has(s)),`Font desconeguda: ${race.id}`);
  assert(race.sources?.length&&race.sources.every(s=>s.label),`Sense fonts: ${race.id}`);
  https(race.url);race.sources.forEach(s=>https(s.url));
 }
 data.sources.forEach(s=>https(s.url));return data;
}
