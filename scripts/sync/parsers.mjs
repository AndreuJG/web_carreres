import { load } from 'cheerio';
import {clean,norm,parseDay,parseTime,distancesFrom,notRunning,raceType} from './core.mjs';

export function page(html){return load(html);}
export function textOf($, selector) {const node=$(selector).first().clone();node.find('script,style,nav,footer').remove();return clean(node.text());}
export function eventsLd($) {
  const result=[];
  const visit=value=>{
    if(Array.isArray(value))value.forEach(visit);
    else if(value && typeof value==='object'){
      if([value['@type']].flat().some(t=>/^(SportsEvent|Event)$/.test(t)))result.push(value);
      if(value['@graph'])visit(value['@graph']);
    }
  };
  $('script[type="application/ld+json"]').each((_,el)=>{try{visit(JSON.parse($(el).text()))}catch{/* malformed metadata does not become a successful reading */}});
  return result;
}
const positiveModalities = rows => rows.filter(r=>!notRunning(r.name) && r.distances?.length);
function summary(rows){
  const valid=positiveModalities(rows);
  // Associate the earliest start with its modality and keep all published starts in the note.
  return {distances:[...new Set(valid.flatMap(r=>r.distances))].sort((a,b)=>a-b),time:valid.map(r=>r.time).filter(Boolean).sort()[0]||null,note:valid.map(r=>`${r.name}: ${r.distances.join('/')} km${r.time?` (${r.time})`:''}`).join(' · '),modalities:valid};
}
export function cronoEdition(edition) {
  if(!edition?.name || !Array.isArray(edition.races))throw Error('Esquema de Cronorunner no reconegut');
  const rows=edition.races.filter(r=>r.status==='published' && !notRunning(`${r.name} ${r.raceType}`)).map(r=>({name:clean(r.name),date:parseDay(r.startDate),time:parseTime(r.startDate),distances:Number(r.distanceMeters)>0?[Number(r.distanceMeters)/1000]:[]}));
  const adults=rows.filter(r=>!/(?:infantil|chupetin|cadete|alevin|benjamin|peque|prebenjamin)/.test(norm(r.name)));
  const selected=adults.length?adults:rows;
  const detail=summary(selected);
  return {name:clean(edition.name),date:parseDay(edition.eventDate),town:clean(edition.location),...detail,type:raceType(`${edition.name} ${edition.races.map(r=>r.raceType).join(' ')}`),excluded:edition.status!=='published'||!detail.distances.length,cancelled:edition.status==='cancelled'};
}
export function sportList(html,base) {
  const $=page(html);
  return $('a.raceCard[href]').map((_,el)=>({url:new URL($(el).attr('href'),base).href,name:clean($(el).find('.card-title').text()),date:parseDay($(el).find('time').attr('datetime')),town:clean($(el).find('.card-footer').text().replace($(el).find('time').text(),''))})).get();
}
export function sportDetail(html,url) {
  const $=page(html),ld=eventsLd($)[0];
  if(!ld?.name||!ld.startDate)throw Error('Fitxa Sportmaniacs incompleta');
  const rows=$('#registrations .event-card').map((_,el)=>{
    const title=$(el).find('.event-title').clone();title.find('.extra-info').remove();
    return {name:clean(title.text()),date:parseDay($(el).find('.event-time').text()),time:parseTime($(el).find('.event-time').text()),distances:distancesFrom($(el).find('.event-distance').text())};
  }).get();
  const detail=summary(rows);
  return {url,name:clean(ld.name),date:parseDay(ld.startDate),town:clean(ld.location?.address?.addressLocality||ld.location?.name),...detail,type:raceType(`${ld.name} ${rows.map(r=>r.name).join(' ')}`),cancelled:/EventCancelled/.test(ld.eventStatus||''),location:clean(ld.location?.address?.streetAddress)};
}
export function multiDetail(html,url) {
  const $=page(html), fields=$('.jet-listing-dynamic-field__content').map((_,el)=>clean($(el).text())).get();
  const get=label=>fields.find(x=>norm(x).startsWith(label))?.split(':').slice(1).join(':').trim();
  const name=textOf($,'h1'),date=parseDay(get('fecha'));
  if(!name||!date)throw Error('Fitxa Multiesport incompleta');
  const rawDistance=get('km')||'';
  const ds=rawDistance.replace(/\s*,\s+(?=\d)/g,' km / ');
  return {url,name,date,time:parseTime(get('hora')),town:get('poblacion'),distances:distancesFrom(ds),sport:get('disciplina'),type:raceType(`${name} ${get('disciplina')}`)};
}
export function runaticaDetail(html,url) {
  const $=page(html),name=textOf($,'h3'), calendar=$('.fa-calendar-alt').first().parent().text();
  const date=parseDay(calendar);
  if(!name||!date)throw Error('Fitxa Runática incompleta');
  const rows=$('#accordionModal .card').map((_,el)=>({name:clean($(el).find('.card-header').text()),time:parseTime($(el).find('.fa-calendar-alt').parent().text()),distances:distancesFrom($(el).find('.fa-map').parent().text())})).get();
  return {url,name,date,town:clean($('a[href*="google.com/maps"]').first().text()),...summary(rows),type:raceType(name)};
}
export function crono4Detail(html,url){
  const $=page(html),name=textOf($,'h1'),main=$('main'),date=parseDay(main.find('.ti-calendar').first().parent().text());
  if(!name||!date)throw Error('Fitxa Crono4Sports incompleta');
  const headings=main.find('h3').map((_,el)=>clean($(el).text())).get();
  const distanceText=headings.join(' ');
  return {url,name,date,time:parseTime(main.find('.ti-clock').first().parent().text()),town:clean(main.find('.ti-map-pin').first().parent().text()),distances:distancesFrom(distanceText),sport:clean(main.find('h1').parent().children('span').first().text()),type:raceType(name)};
}
export function fdmDetail(html,url){
  const $=page(html),name=textOf($,'h1'),header=textOf($,'.entry-content header'),body=textOf($,'.entry-content .desc');
  const date=parseDay(header);
  if(!name||!date)throw Error('Fitxa FDM incompleta');
  // Only sentences explicitly describing the race; ignore travel, age, fees and aid stations.
  const sentences=body.split(/[.;]|(?<=km)\s/i).filter(s=>/carrera|recorri|distancia|prueba|metres|metros|kilometr/i.test(s)&&!notRunning(s));
  return {url,name,date,time:parseTime(header),town:'València',distances:distancesFrom(sentences.join(' ')),sport:name,type:raceType(name)};
}
export function ldCandidate(event,sourceId){
  const loc=event.location||{},name=clean(event.name),description=clean(load(event.description||'').text());
  return {sourceId,url:event.url,name,date:parseDay(event.startDate),time:parseTime(event.startDate),town:clean(loc.address?.addressLocality||loc.name||(sourceId==='runcancer'?name:'')),location:clean(loc.address?.streetAddress),distances:distancesFrom(name),type:raceType(sourceId==='runcancer'?`${name} cancer`:name),sport:event.sport||name,cancelled:/EventCancelled/.test(event.eventStatus||''),description};
}
export function rockDetail(html,url){
  const $=page(html),ld=eventsLd($)[0];
  if(!ld)throw Error('Fitxa RockTheSport incompleta');
  const c=ldCandidate(ld,'rockthesport');c.url=url;
  const main=$('main').clone();main.find('script,style').remove();
  const types=main.find('h2,h3,h4').map((_,el)=>clean($(el).text())).get().filter(x=>!notRunning(x));
  c.distances=[...new Set(types.flatMap(distancesFrom))].sort((a,b)=>a-b);
  if(!c.distances.length)c.distances=distancesFrom(`${ld.name} ${main.text().match(/(?:Media Maratón|Half marathon|Maratón)/i)?.[0]||''}`);
  return c;
}
export function toprunDetail(html,url,listing={}){
  const $=page(html),name=textOf($,'h1')||listing.name;
  const dates=$('[ng-init*="initDates"]').map((_,el)=>$(el).attr('ng-init').match(/20\d{2}-\d{2}-\d{2} \d{2}:\d{2}/)?.[0]).get().filter(Boolean);
  const ds=distancesFrom(`${listing.tags||''} ${$('.tp-ecl-prices-modality-name,.tp-prices-title,.tp-evento-prices h3').text()}`);
  return {url,name,date:parseDay(dates[0]||listing.date),time:parseTime(dates[0]),town:listing.town,distances:ds,type:raceType(`${name} ${listing.tags||''}`)};
}
