import {page,eventsLd,sportList,cronoEdition,sportDetail,multiDetail,runaticaDetail,crono4Detail,fdmDetail,rockDetail,toprunDetail,ldCandidate,textOf} from './parsers.mjs';
import {clean,canonical,norm,parseDay,distancesFrom,circuitPass,notRunning,raceType} from './core.mjs';

export const SOURCE_DEFINITIONS=[
  {id:'cronorunner',name:'Cronorunner',base:'https://inscripciones.cronorunner.com',catalogs:['https://inscripciones.cronorunner.com/api/public/events'],path:/\/evento\/[^/]+$/},
  {id:'sportmaniacs',name:'Sportmaniacs',base:'https://sportmaniacs.com',catalogs:['https://sportmaniacs.com/es/races/search/valencia','https://sportmaniacs.com/es/races/search/castellon'],path:/\/es\/(?:races|services\/inscription)\/[^/]+$/},
  {id:'runatica',name:'Runática',base:'https://www.runatica.com',catalogs:['https://www.runatica.com/'],path:/\/event\/[^/]+$/},
  {id:'multiesport',name:'Multiesport',base:'https://multiesport.es',catalogs:['https://multiesport.es/calendario-running/','https://multiesport.es/calendario-trail/','https://multiesport.es/calendario-cross/'],path:/\/event\/[^/]+\/?$/},
  {id:'crono4sports',name:'Crono4Sports',base:'https://crono4sports.com',catalogs:['https://crono4sports.com/eventos'],path:/\/evento\/[^/]+$/},
  {id:'toprun',name:'TopRun',base:'https://www.toprun.es',catalogs:['https://www.toprun.es/info-home/normal'],path:/\/eventos\/[^/]+\/?$/},
  {id:'vcr',name:'Valencia Ciudad del Running',base:'https://www.valenciaciudaddelrunning.com',catalogs:['https://www.valenciaciudaddelrunning.com/calendario/'],path:/\/evento\/[^/]+\/?$/},
  {id:'fdm',name:'Fundació Esportiva Municipal',base:'https://www.fdmvalencia.es',catalogs:['https://www.fdmvalencia.es/agenda/'],path:/\/(?:es\/)?eventos\/[^/]+\/?$/},
  {id:'runcancer',name:'RunCáncer',base:'https://runcancer.com',catalogs:['https://runcancer.com/carreras/'],path:/\/events\/[^/]+\/?$/},
  {id:'rockthesport',name:'RockTheSport',base:'https://web.rockthesport.com',catalogs:[],path:/\/es\/event\/[^/]+\/?$/},
  {id:'mychip',name:'Mychip',base:'https://www.mychip.es',catalogs:['https://sfztfth1r1.execute-api.eu-central-1.amazonaws.com/prod/home'],path:/\/e\/[^/]+\/?$/}
];

function links(html,base,path){
 const $=page(html),map=new Map();
 $('a[href]').each((_,el)=>{try{const url=new URL($(el).attr('href'),base);if(url.origin===new URL(base).origin&&path.test(url.pathname)&&!url.pathname.includes('/categorias/'))map.set(canonical(url.href),{url:url.href,name:clean($(el).text())});}catch{}});
 return [...map.values()];
}
export async function discover(def,request,today){
 const items=[],urls=new Set(),errors=[];
 const add=list=>{for(const item of list){if(!urls.has(canonical(item.url))){urls.add(canonical(item.url));items.push(item);}}};
 if(def.id==='cronorunner'){
  const json=(await request(def.catalogs[0])).json();
  if(!Array.isArray(json.editions))throw Error('Catàleg Cronorunner no reconegut');
  add(json.editions.map(e=>({url:`${def.base}/evento/${e.slug}`,name:e.name,date:parseDay(e.eventDate),town:e.location,slug:e.slug})));
 }else if(def.id==='sportmaniacs'){
  for(const base of def.catalogs){
   let finished=false;
   for(let p=1;p<=30;p++){
    const list=sportList((await request(`${base}?page=${p}`)).text,base);
    if(!list.length){if(p===1)throw Error(`Catàleg Sportmaniacs buit o canviat: ${base}`);finished=true;break;}
    if(list.some(x=>!x.date))throw Error('Falten dates en el catàleg Sportmaniacs');
    add(list.filter(x=>x.date>today));
    if(list.some(x=>x.date<=today)){finished=true;break;}
   }
   if(!finished)throw Error('Límit de paginació Sportmaniacs: cobertura incompleta');
  }
 }else if(def.id==='toprun'){
  const json=(await request(def.catalogs[0])).json();if(!Array.isArray(json.eventos))throw Error('Catàleg TopRun no reconegut');
  add(json.eventos.map(e=>({url:`${def.base}/eventos/${e.url}`,name:e.nombre,date:parseDay(e.fechacompleta),town:e.poblacion,tags:e.tags})));
 }else if(def.id==='crono4sports'){
  let html=(await request(def.catalogs[0])).text,$=page(html),snapshot=$('[wire\\:snapshot]').attr('wire:snapshot');
  const script=$('script[data-update-uri]'),endpoint=script.attr('data-update-uri'),csrf=script.attr('data-csrf');
  if(!snapshot||!endpoint||!csrf)throw Error('Paginació Crono4Sports no reconeguda');
  for(let p=0;p<20;p++){
    add(links(html,def.base,def.path));
    if(!$('[wire\\:click="loadMore"]').length)break;
    if(p===19)throw Error('Límit de paginació Crono4Sports');
    const json=(await request(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Livewire':''},body:JSON.stringify({_token:csrf,components:[{snapshot,updates:{},calls:[{path:'',method:'loadMore',params:[]}]}]})})).json();
    html=json.components?.[0]?.effects?.html;snapshot=json.components?.[0]?.snapshot;
    if(!html||!snapshot)throw Error('Resposta de paginació Crono4Sports incompleta');
    $=page(html);
  }
 }else if(def.id==='mychip'){
  const data=(await request(def.catalogs[0])).json();
  if(!Array.isArray(data.events_next))throw Error('Portada de Mychip no reconeguda');
  add(data.events_next.map(e=>({url:`${def.base}/e/${encodeURIComponent(e.slug)}`,name:e.name,town:e.location?.city,date:parseDay(e.date_start?.$date),mychip:e})));
 }else if(def.id==='runatica'){
  const html=(await request(def.catalogs[0])).text,$=page(html);
  const cards=$('.grid-container').first().find('.card');
  if(!cards.length)throw Error('Calendari pròxim de Runática no reconegut');
  add(cards.map((_,el)=>{const card=$(el),a=card.find('a[href^="/event/"]').first();return {url:new URL(a.attr('href'),def.base).href,name:clean(card.find('h5').text()),date:parseDay(card.text()),town:clean(card.find('.fa-map-marker-alt').parent().text())};}).get().filter(x=>x.date&&x.date>today));
 }else if(def.id==='fdm'){
  const html=(await request(def.catalogs[0])).text,$=page(html);
  const pages=[...new Set($('a[href*="pno="]').map((_,el)=>new URL($(el).attr('href'),def.base).href).get())];
  const running=list=>list.filter(x=>/carrer|cursa|marat|pas ras|volta a peu|breakfast|\d+k/.test(norm(x.name+' '+x.url)));
  add(running(links(html,def.base,def.path)));
  for(const url of pages.slice(0,20))add(running(links((await request(url)).text,def.base,def.path)));
 }else if(['vcr','runcancer'].includes(def.id)){
  const html=(await request(def.catalogs[0])).text,$=page(html),events=eventsLd($);
  if(!events.length)throw Error(`Catàleg estructurat ${def.name} buit o canviat`);
  add(events.filter(e=>e.url).map(e=>({...ldCandidate(e,def.id),structured:e})));
 }else{
  for(const url of def.catalogs){
   const html=(await request(url)).text,found=links(html,def.base,def.path);
   // Empty cross calendar is allowed; other catalogs must expose their normal event links.
   if(!found.length && !url.includes('cross'))errors.push(`Sense enllaços de proves: ${url}`);
   add(found);
  }
 }
 return {items,errors};
}

export function seedLinks(def,catalog){
 const map=new Map();
 for(const race of catalog.races) for(const source of [{url:race.url},...race.sources]) {
  try{const url=new URL(source.url);if(url.hostname.replace(/^www\./,'')===new URL(def.base).hostname.replace(/^www\./,'')&&def.path.test(url.pathname))map.set(canonical(url.href),{url:url.href,name:race.name,town:race.town,date:race.date,existingId:race.id});}catch{}
 }
 return [...map.values()];
}
export async function readItem(def,item,request){
 if(def.id==='mychip'){
  let event=item.mychip;
  if(!event){
   const slug=decodeURIComponent(new URL(item.url).pathname.split('/').at(-1));
   const items=(await request('https://sfztfth1r1.execute-api.eu-central-1.amazonaws.com/prod/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug})})).json();
   event=Array.isArray(items)?items.find(e=>e.slug===slug):null;
  }
  if(!event?.name||!Array.isArray(event.modalities))throw Error('Fitxa Mychip incompleta');
  const rows=event.modalities.filter(m=>!notRunning(m.name)&&['running','trail_running','cross'].includes(m.sport));
  const registration=event.slug_rts?`https://web.rockthesport.com/es/event/${encodeURIComponent(event.slug_rts)}`:null;
  let time=null;
  // Mongo date fields in this source do not establish whether the time is local or UTC.
  // Use the registration page's explicitly published local time rather than guessing.
  if(registration){try{time=rockDetail((await request(registration)).text,registration).time;}catch{/* Date/distance can still be verified without inventing the hour. */}}
  return {url:item.url,aliasUrls:registration?[registration]:[],name:clean(event.name),date:parseDay(event.date_start?.$date),time,town:event.location?.city,location:clean(event.location?.street),distances:[...new Set(rows.map(m=>Number(m.distance)/1000).filter(km=>km>0&&km<=300))].sort((a,b)=>a-b),type:raceType(`${event.name} ${rows.map(m=>m.sport).join(' ')}`),excluded:!rows.length,cancelled:event.status==='cancelled',note:'Data i modalitats de carrera publicades per Mychip. S’exclouen caminades, dorsals zero i altres esports. Consulta els horaris i les condicions de cada modalitat en la convocatòria.'};
 }
 if(def.id==='cronorunner'){
  const slug=new URL(item.url).pathname.split('/').filter(Boolean).at(-1);
  return {url:item.url,...cronoEdition((await request(`${def.base}/api/public/editions/${encodeURIComponent(slug)}`)).json().edition)};
 }
 if(item.structured){
  const c=ldCandidate(item.structured,def.id);
  if(!c.distances.length){
   const $=page((await request(item.url)).text);
   const body=def.id==='runcancer'?textOf($,'.eventon_desc_in,.evcal_eventcard,.entry-content'):textOf($,'.tribe-events-single-event-description');
   const sentences=body.split(/[;]|(?<=[.!?])\s/).filter(s=>/carrera|recorr|distancia|prueba/i.test(s)&&!notRunning(s));
   c.distances=distancesFrom(sentences.join(' '));
  }
  return c;
 }
 const html=(await request(item.url)).text;
 const parser={sportmaniacs:sportDetail,runatica:runaticaDetail,multiesport:multiDetail,crono4sports:crono4Detail,fdm:fdmDetail,rockthesport:rockDetail,toprun:toprunDetail}[def.id];
 if(parser)return parser(html,item.url,item);
 const $=page(html),event=eventsLd($).find(e=>e.startDate);
 if(!event)throw Error('Fitxa sense dades estructurades de carrera');
 return ldCandidate(event,def.id);
}
