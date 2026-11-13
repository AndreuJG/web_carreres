import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createClient} from './sync/http.mjs';
import {SOURCE_DEFINITIONS,discover,seedLinks,readItem} from './sync/sources.mjs';
import {canonical,clean,norm,createTownResolver,candidateDecision,mergeCandidates,circuitPass,notRunning,sameRace} from './sync/core.mjs';
import {madridToday,oneYearAfter,distanceKm} from '../lib/races.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const catalog=JSON.parse(await readFile(new URL('../data/races.json',import.meta.url),'utf8'));
const gazetteer=JSON.parse(await readFile(new URL('./sync/towns.json',import.meta.url),'utf8'));
const overrides=JSON.parse(await readFile(new URL('./sync/overrides.json',import.meta.url),'utf8'));
const args=new Set(process.argv.slice(2)), dryRun=args.has('--dry-run');
const dateArg=[...args].find(x=>x.startsWith('--today='))?.split('=')[1];
const today=dateArg||madridToday(),checkedAt=new Date().toISOString();
const selected=[...args].find(x=>x.startsWith('--sources='))?.split('=')[1].split(',');
const definitions=SOURCE_DEFINITIONS.filter(d=>!selected||selected.includes(d.id));
if(!definitions.length)throw Error('No hi ha cap font seleccionada');
const request=createClient(),resolveTown=createTownResolver(gazetteer,catalog);
const results=[];

async function runSource(def){
 const result={id:def.id,name:def.name,checkedAt,status:'ok',catalogEntries:0,read:0,eligible:0,errors:[],decisions:[],candidates:[]};
 let discovery={items:[],errors:[]};
 try{discovery=await discover(def,request,today);result.catalogEntries=discovery.items.length;result.errors.push(...discovery.errors);}catch(error){result.errors.push({stage:'catalog',message:error.message});}
 const seed=seedLinks(def,catalog),items=new Map(seed.map(x=>[canonical(x.url),x]));
 for(const item of discovery.items)items.set(canonical(item.url),{...items.get(canonical(item.url)),...item});
 for(const item of items.values()){
  if(circuitPass(item.name)||notRunning(item.name)){result.decisions.push({url:item.url,name:item.name,status:'excluded',reason:'Modalitat o abonament exclòs'});continue;}
  const town=resolveTown(item.town,item.name);
  if(!item.existingId && town && distanceKm(catalog.origin,town)>50){result.decisions.push({url:item.url,name:item.name,status:'excluded',reason:'Fora del radi'});continue;}
  if(item.date && (item.date>oneYearAfter(today)||Date.parse(item.date)<Date.parse(today)-120*86400000))continue;
  try{
   const candidate=await readItem(def,item,request);
   candidate.name=clean(candidate.name);candidate.sourceId=def.id;
   for(const rule of overrides.rules){
    if(rule.sourceId===def.id && canonical(rule.url)===canonical(candidate.url) && JSON.stringify(candidate[rule.field])===JSON.stringify(rule.when))candidate[rule.field]=rule.value;
   }
   if(!candidate.name||!candidate.date)throw Error('Nom o data de carrera sense confirmar');
   let existing=item.existingId ? catalog.races.find(r=>r.id===item.existingId):catalog.races.find(r=>[r.url,...r.sources.map(s=>s.url)].some(url=>canonical(url)===canonical(item.url)));
   const place=existing?{name:existing.town,lat:existing.lat,lon:existing.lon}:resolveTown(candidate.town||item.town,candidate.name);
   if(place){
    if(['valencia','castellon','castellon de la plana'].includes(norm(candidate.town))&&norm(candidate.town)!==norm(place.name))candidate.location=`${place.name}; consulta el punt d’eixida en la convocatòria`;
    Object.assign(candidate,{town:place.name,lat:place.lat,lon:place.lon});
   }
   if(!existing){
    const matches=catalog.races.filter(r=>sameRace(r,candidate)||def.id==='runcancer'&&r.sourceIds.includes('runcancer')&&r.date===candidate.date&&norm(r.town)===norm(candidate.town));
    if(matches.length===1)existing=matches[0];
   }
   const sameEdition=existing&&Math.abs(Date.parse(candidate.date)-Date.parse(existing.date))<=180*86400000;
   if(sameEdition && !candidate.distances?.length){candidate.distances=existing.distances;candidate.inheritedDistance=true;}
   if(!candidate.time && sameEdition)candidate.time=existing.time;
   if(/backyard/.test(norm(candidate.name))&&!existing)candidate.distances=[];
   if(candidate.name && def.id==='fdm'&&!/carrer|cursa|marat|pas ras|volta a peu|breakfast|\d+k/.test(norm(candidate.name)))candidate.excluded=true;
   const reason=candidateDecision(candidate,catalog.origin,today);
   result.read++;if(!reason)result.eligible++;
   result.decisions.push({url:item.url,name:candidate.name,date:candidate.date,town:candidate.town,distances:candidate.distances,time:candidate.time,status:reason?'excluded':'eligible',...(reason?{reason}:{})});
   result.candidates.push(candidate);
  }catch(error){result.errors.push({url:item.url,message:error.message});}
 }
 result.status=result.errors.length?(result.read?'partial':'error'):'ok';
 if(!result.read && !result.catalogEntries && !def.catalogs.length)result.status='error';
 console.log(`${def.name}: ${result.status}; ${result.catalogEntries} al calendari, ${result.read} fitxes llegides, ${result.eligible} admissibles, ${result.errors.length} errors.`);
 return result;
}

// Two independent sources at once, with sequential reads within each provider.
for(let i=0;i<definitions.length;i+=2)results.push(...await Promise.all(definitions.slice(i,i+2).map(runSource)));
const candidates=results.flatMap(r=>r.candidates);
const merged=mergeCandidates(catalog,candidates,today,checkedAt);
const successful=results.filter(r=>r.status==='ok').length,usable=successful>0||results.some(r=>r.read>0);
const status=successful===definitions.length?'ok':usable?'partial':'error';
const report={schemaVersion:1,checkedAt,today,status,window:{after:today,through:oneYearAfter(today),radiusKm:50},changes:merged.changes,pending:merged.pending,routePending:merged.routePending,sources:results.map(({candidates,...rest})=>rest)};
merged.data.manualReviewAt ||= catalog.updatedAt;
const sourceHealth=results.map(({id,name,status,read,eligible,errors})=>({id,name,status,checkedAt,read,eligible,errors:errors.length}));
if(selected)sourceHealth.push(...(catalog.sync?.sources||[]).filter(s=>!selected.includes(s.id)));
merged.data.sync={checkedAt,status:selected?'partial':status,lastSuccessfulAt:status==='ok'&&!selected?checkedAt:catalog.sync?.lastSuccessfulAt||null,sources:sourceHealth,changes:merged.changes.length,pending:merged.pending.length};
merged.data.automaticPending=merged.pending;
for(const def of definitions)if(!merged.data.sources.some(s=>s.id===def.id))merged.data.sources.push({id:def.id,name:def.name,url:def.base,description:def.id==='mychip'?'Pròximes convocatòries de la portada i fitxes conegudes, incloent proves inscrites en RockTheSport.':'Font consultada per l’actualitzador diari.'});

// Validate the complete candidate catalog before replacing either public file.
const {validateCatalog}=await import('./sync/validate.mjs');
validateCatalog(merged.data);
await mkdir(new URL('../reports/',import.meta.url),{recursive:true});
await writeFile(new URL('../reports/sync.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
if(!dryRun){
 for(const [path,value]of [['data/races.json',merged.data],['data/sync-status.json',report]]){
  const target=root+path,temp=target+'.tmp';await writeFile(temp,JSON.stringify(value,null,2)+'\n');await rename(temp,target);
 }
}
if(process.env.GITHUB_STEP_SUMMARY){
 const summary=[`## Actualització de carreres · ${today}`,`Estat: **${status}**. ${merged.changes.length} canvis; ${merged.pending.length} convocatòries pendents.`, '', '| Font | Estat | Fitxes | Admissibles | Errors |','| --- | --- | ---: | ---: | ---: |',...results.map(r=>`| ${r.name} | ${r.status} | ${r.read} | ${r.eligible} | ${r.errors.length} |`),'','Les fonts fallides conserven les últimes dades bones. El detall és en l’artefacte sync-report.',''].join('\n');
 await writeFile(process.env.GITHUB_STEP_SUMMARY,summary,{flag:'a'});
}
console.log(`${dryRun?'Simulació':'Actualització'}: ${status}; ${merged.data.races.length} cites, ${merged.changes.length} canvis. Informe en reports/sync.json.`);
if(!usable)process.exitCode=1;
