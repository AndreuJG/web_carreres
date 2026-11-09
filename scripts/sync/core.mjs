import { createHash } from 'node:crypto';
import { normalize, distanceKm, oneYearAfter } from '../../lib/races.js';

export const clean = value => String(value ?? '').replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/\s+/g, ' ').trim();
export const norm = value => normalize(clean(value)).replace(/[^a-z0-9]+/g, ' ').trim();
export function canonical(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('La font ha de ser HTTPS');
  url.hash = ''; url.search = '';
  url.pathname = url.pathname.replace('/es/services/inscription/', '/es/races/').replace('/es/eventos/', '/eventos/').replace(/\/$/, '');
  url.hostname = url.hostname.replace(/^www\./, '');
  return url.href;
}
export function validDay(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
export function parseDay(value) {
  const text = norm(clean(value).replace(/[’']/g,' ')), original = clean(value);
  const iso = original.match(/\b(20\d{2}-\d{2}-\d{2})(?=T|\s|$)/);
  if (iso && validDay(iso[1])) return iso[1];
  const numeric = original.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})\b/);
  const months = {ene:1,gen:1,feb:2,mar:3,abr:4,may:5,mai:5,jun:6,jul:7,ago:8,sep:9,set:9,oct:10,nov:11,dic:12,des:12};
  const natural = text.match(/\b(\d{1,2}) (?:(?:de|d) )?([a-z]+) (?:de )?(20\d{2})\b/);
  const parts = numeric ? [numeric[3], numeric[2], numeric[1]] : natural ? [natural[3], String(months[natural[2].slice(0,3)]||0), natural[1]] : null;
  if (!parts) return null;
  const day = parts.map((part,i) => i ? part.padStart(2,'0') : part).join('-');
  return validDay(day) ? day : null;
}
export function parseTime(value) {
  const m = clean(value).match(/(?:T|\b)([01]?\d|2[0-3])[:h]([0-5]\d)\b/);
  return m ? `${m[1].padStart(2,'0')}:${m[2]}` : null;
}
export function distancesFrom(value) {
  const text = clean(value).replace(/(\d)\.(\d{3})\s*(metros|mts|m\b)/gi, '$1$2 $3');
  const result = [...text.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(kil[oó]metros?|quil[oò]metres?|km\b|k\b|metros?\b|mts\b|m\b)/gi)].map(m => Number(m[1].replace(',','.')) / (/^(m|mts|metro)/i.test(m[2]) ? 1000 : 1));
  if (!result.length && /(?:media|mitja|half)\s*(?:marat[oó]|marathon)/i.test(text)) result.push(21.0975);
  if (!result.length && !/mini/i.test(text) && /\bmarat[oó]n?\b/i.test(text)) result.push(42.195);
  return [...new Set(result.filter(km => km > 0 && km <= 300))].sort((a,b)=>a-b);
}
export const notRunning = value => /\b(caminata|caminada|marcha|marxa|senderis\w*|walk|dorsal (?:cero|zero|0)|nordic\w*|natacion|nado|natacio|travesia|travessia|swim|bany|cicli\w*|btt|mtb|gravel|bike|triat\w*|ironman|duat\w*|ocr|hybrid|hibrid\w*|padel|esqui|sup race)\b/.test(norm(value));
export const circuitPass = value => /^(?:circuit |circuito |circuit d |abonament|abono)|valencia trail race 20\d{2} 20\d{2}/.test(norm(value));
export function raceType(value) {
  const n=norm(value);
  return /trail|muntanya|montana/.test(n) ? 'trail' : /mini marato|infantil|junior/.test(n) ? 'infantil' : /solidari|cancer|fibrosi|salut mental/.test(n) ? 'solidaria' : /10kfem|categoria femenina/.test(n) ? 'dones' : 'popular';
}
export function createTownResolver(gazetteer, catalog) {
  const aliases = new Map(), ambiguous = new Set();
  for (const town of gazetteer.towns) for (const alias of [town.name,...town.aliases]) {
    const key=norm(alias);
    if(key && aliases.has(key) && distanceKm(aliases.get(key),town)>5)ambiguous.add(key);
    if (key && !aliases.has(key)) aliases.set(key,town);
  }
  for (const town of [...catalog.races, ...(catalog.boundaryExclusions||[])]) {aliases.set(norm(town.town),{name:town.town,lat:town.lat,lon:town.lon});ambiguous.delete(norm(town.town));}
  const translations = {valencia:'València',alboraya:'Alboraia',sagunto:'Sagunt',puzol:'Puçol'};
  for (const [alias,name] of Object.entries(translations)) if(aliases.has(norm(name))) {aliases.set(alias,aliases.get(norm(name)));ambiguous.delete(alias);}
  return function resolveTown(explicit, name) {
    const places = clean(explicit).split(/[,(/]/).map(norm).filter(Boolean);
    for (const place of places) if (aliases.has(place) && !ambiguous.has(place) && !['valencia','castellon','castellon de la plana'].includes(place)) return aliases.get(place);
    // A named but unknown town must never be guessed from generic words in the race title.
    if(places.length && !places.every(p=>['valencia','castellon','castellon de la plana'].includes(p)))return null;
    const n=` ${norm(name)} `;
    const inName=[...aliases].filter(([alias])=>!ambiguous.has(alias) && alias.length>=4 && n.includes(` ${alias} `)).sort((a,b)=>b[0].length-a[0].length);
    if(inName.length) return inName[0][1];
    for (const place of places) if(aliases.has(place)&&!ambiguous.has(place)) return aliases.get(place);
    return null;
  };
}
export function candidateDecision(candidate, origin, today) {
  if (!validDay(candidate.date)) return 'Data de carrera sense confirmar';
  if (candidate.date <= today || candidate.date > oneYearAfter(today)) return 'Fora del període';
  if (candidate.excluded || circuitPass(candidate.name) || notRunning(candidate.sport || candidate.name)) return 'Modalitat exclosa o abonament de circuit';
  if (candidate.cancelled) return 'Convocatòria cancel·lada';
  if (!candidate.town || !Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lon)) return 'Població sense coordenades inequívoces';
  if (distanceKm(origin,candidate) > 50) return 'Fora del radi';
  if (!candidate.distances?.length) return 'Distància de carrera sense confirmar';
  return null;
}
export function sameRace(a,b) {
  if (a.date !== b.date || norm(a.town) !== norm(b.town)) return false;
  const stop=new Set(['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx','xxi','xxii','xxiii','xxiv','xxv','de','del','la','el','i','y','a','al','2026','2027']);
  const words=v=>new Set(norm(v).replace(/\bmaraton\b/g,'marato').replace(/\bmedia\b/g,'mitja').replace(/\bsan\b/g,'sant').split(' ').filter(w=>!stop.has(w)&&!/^\d+$/.test(w)));
  const aw=words(a.name),bw=words(b.name), common=[...aw].filter(w=>bw.has(w));
  const identical=common.length===aw.size&&common.length===bw.size;
  return common.length>=2 && common.length/Math.min(aw.size,bw.size)>=0.7 && (identical || !a.distances?.length || !b.distances?.length || a.distances.some(x=>b.distances.some(y=>Math.abs(x-y)<0.2)));
}
export function mergeCandidates(data, candidates, today, checkedAt) {
  const next=structuredClone(data), changes=[], pending=[];
  for (const candidate of candidates) {
    const urls=[candidate.url,...(candidate.aliasUrls||[])].map(canonical);
    const linked=next.races.filter(r=>[r.url,...r.sources.map(s=>s.url)].some(u=>urls.includes(canonical(u))));
    let existing=linked.sort((a,b)=>Math.abs(Date.parse(a.date)-Date.parse(candidate.date))-Math.abs(Date.parse(b.date)-Date.parse(candidate.date)))[0];
    // Evergreen organizer URLs are reused each year. Keep the old edition and its saved ID.
    if(existing && Date.parse(candidate.date)-Date.parse(existing.date)>180*86400000)existing=undefined;
    if(!existing){
      const matches=next.races.filter(r=>sameRace(r,candidate) || candidate.sourceId==='runcancer' && r.sourceIds.includes('runcancer') && r.date===candidate.date && norm(r.town)===norm(candidate.town));
      if(matches.length===1)existing=matches[0];
      else if(matches.length>1){pending.push({name:candidate.name,reason:'Possible duplicat ambigu: cal contrastar la convocatòria',sources:[{label:candidate.sourceId,url:candidate.url}]});continue;}
    }
    const reason=candidateDecision(candidate,next.origin,today);
    if(reason) {
      if(!['Fora del període','Fora del radi','Modalitat exclosa o abonament de circuit'].includes(reason)) pending.push({name:candidate.name,reason,sources:[{label:candidate.sourceId,url:candidate.url}]});
      // Only an explicit cancellation can remove an existing event. Missing/empty pages never do.
      if(existing && candidate.cancelled) { next.races=next.races.filter(r=>r.id!==existing.id); changes.push({kind:'cancelled',id:existing.id,source:candidate.sourceId}); }
      continue;
    }
    const observation={date:candidate.date,time:candidate.time||null,distances:candidate.distances,location:candidate.location||null,checkedAt};
    if(existing) {
      const previous=existing.automation?.observations?.[candidate.sourceId];
      const fields=['date','time','distances',...(existing.verification==='automatic'&&existing.sourceIds[0]===candidate.sourceId?['location']:[])];
      const updated={};
      for(const field of fields) {
        // Baseline the first automated reading; never overwrite a manual regulation correction blindly.
        const value=candidate[field];
        if((previous ? JSON.stringify(previous[field])!==JSON.stringify(value) : field==='date' && existing.date!==value) && value!==null && value!==undefined && JSON.stringify(existing[field])!==JSON.stringify(value)) {
          updated[field]=value;
        }
      }
      const locked=existing.automation?.lockedFields||[];
      for(const field of locked) delete updated[field];
      if(Object.keys(updated).length) {
        Object.assign(existing,updated);
        existing.automaticNote=`Canvi detectat el ${today}: ${Object.keys(updated).join(', ')}. Consulta la convocatòria actualitzada; les notes de la revisió manual són històriques.`;
        changes.push({kind:'updated',id:existing.id,fields:Object.keys(updated),source:candidate.sourceId});
      }
      existing.automation={...existing.automation,checkedAt,observations:{...existing.automation?.observations,[candidate.sourceId]:observation}};
      if(!existing.sourceIds.includes(candidate.sourceId))existing.sourceIds.push(candidate.sourceId);
      if(!existing.sources.some(s=>canonical(s.url)===canonical(candidate.url)))existing.sources.push({label:`${candidate.sourceId} · lectura automàtica`,url:candidate.url});
    } else {
      const id=`auto-${candidate.sourceId}-${createHash('sha256').update(`${canonical(candidate.url)} ${candidate.date}`).digest('hex').slice(0,12)}`;
      next.races.push({id,name:candidate.name,date:candidate.date,time:candidate.time||null,town:candidate.town,lat:candidate.lat,lon:candidate.lon,location:candidate.location||`${candidate.town}; consulta l’eixida en la convocatòria`,distances:candidate.distances,type:candidate.type||raceType(candidate.name),sourceIds:[candidate.sourceId],sources:[{label:`${candidate.sourceId} · convocatòria`,url:candidate.url}],url:candidate.url,note:candidate.note||'Convocatòria incorporada automàticament des de la plataforma. Confirma les modalitats, els horaris i els dorsals a la font.',verifiedAt:today,verification:'automatic',automation:{checkedAt,observations:{[candidate.sourceId]:observation}}});
      changes.push({kind:'added',id,name:candidate.name,url:candidate.url,source:candidate.sourceId});
    }
  }
  next.races.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'23:59').localeCompare(b.time||'23:59')||a.id.localeCompare(b.id));
  next.updatedAt=[next.updatedAt,...next.races.map(r=>r.verifiedAt)].sort().at(-1);
  return {data:next,changes,pending};
}
