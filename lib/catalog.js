export const LIVE_CATALOG_URL='https://raw.githubusercontent.com/AndreuJG/web_carreres/main/data/races.json';
const CACHE_KEY='correr-a-prop:catalog-v1';

export function isCatalog(data){
 return Boolean(data&&/^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt)&&data.origin&&Array.isArray(data.races)&&data.races.length&&Array.isArray(data.sources)&&Array.isArray(data.pending)&&data.races.every(r=>r.id&&r.name&&r.date&&r.sourceIds&&r.sources&&r.distances?.length&&Number.isFinite(r.lat)&&Number.isFinite(r.lon)&&r.url?.startsWith('https://')));
}
export async function loadCatalog({localUrl,remoteUrl=LIVE_CATALOG_URL,fetchImpl=fetch,storage,timeoutMs=8000}={}){
 const read=async url=>{
  const response=await fetchImpl(url,{signal:AbortSignal.timeout(timeoutMs),cache:'no-cache'});
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  const data=await response.json();if(!isCatalog(data))throw Error('Catàleg invàlid');return data;
 };
 if(remoteUrl){
  try{
   const data=await read(remoteUrl);
   try{storage?.setItem(CACHE_KEY,JSON.stringify(data));}catch{/* Optional offline cache. */}
   return {data,mode:'live'};
  }catch{/* Last known good catalog remains available below. */}
 }
 let cached;
 try{cached=JSON.parse(storage?.getItem(CACHE_KEY)||'null');}catch{}
 let bundled;
 try{bundled=await read(localUrl);}catch(error){if(!isCatalog(cached))throw error;}
 if(isCatalog(cached)&&(!bundled||(cached.sync?.checkedAt||cached.updatedAt)>(bundled.sync?.checkedAt||bundled.updatedAt)))return {data:cached,mode:'cached'};
 return {data:bundled,mode:remoteUrl?'bundled':'local'};
}
