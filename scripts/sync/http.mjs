const ALLOWED = new Set(['inscripciones.cronorunner.com','sportmaniacs.com','www.runatica.com','www.toprun.es','multiesport.es','crono4sports.com','web.rockthesport.com','www.fdmvalencia.es','www.valenciaciudaddelrunning.com','runcancer.com','www.mychip.es','sfztfth1r1.execute-api.eu-central-1.amazonaws.com']);
export function createClient({fetchImpl=fetch,timeout=20000,retries=2}={}) {
  const cache=new Map(), jars=new Map();
  return async function request(value, options={}) {
    const url=new URL(value);
    if(url.protocol!=='https:' || !ALLOWED.has(url.hostname))throw Error(`Font no autoritzada: ${url.hostname}`);
    if(url.hostname.endsWith('amazonaws.com')&&!['/prod/home','/prod/events'].includes(url.pathname))throw Error('Ruta del calendari no autoritzada');
    if(options.visited?.includes(url.href))throw Error('Redirecció circular');
    const key=`${options.method||'GET'} ${url.href} ${options.body||''}`;
    if(cache.has(key))return cache.get(key);
    const promise=(async()=>{
      // Some Multiesport event pages embed more than 6 MB of page-builder data.
      const maxBytes = url.hostname === 'multiesport.es' ? 8000000 : 6000000;
      for(let attempt=0;attempt<=retries;attempt++){
        try {
          const response=await fetchImpl(url,{...options,redirect:'manual',headers:{'User-Agent':'CorrerAProp/1.0 (+https://github.com/AndreuJG/web_carreres)','Accept':'text/html,application/json;q=0.9',...(jars.has(url.origin)?{Cookie:jars.get(url.origin)}:{}),...options.headers},signal:AbortSignal.timeout(timeout)});
          const cookies=response.headers.getSetCookie?.()||[];
          if(cookies.length)jars.set(url.origin,cookies.map(c=>c.split(';')[0]).join('; '));
          if(response.status>=300 && response.status<400){
            const location=new URL(response.headers.get('location'),url);
            if(location.href===url.href)throw Error('Redirecció circular');
            if((options.redirectCount||0)>=5)throw Error('Massa redireccions');
            return request(location.href,{...options,visited:[...(options.visited||[]),url.href],redirectCount:(options.redirectCount||0)+1});
          }
          if(!response.ok)throw Error(`HTTP ${response.status} en ${url.hostname}${url.pathname}`);
          const length=Number(response.headers.get('content-length')||0);
          if(length>maxBytes) {await response.body?.cancel();throw Error('Resposta massa gran');}
          let text;
          if(response.body?.getReader){
            const reader=response.body.getReader(),decoder=new TextDecoder(),chunks=[];
            let bytes=0;
            while(true){
              const {done,value}=await reader.read();if(done)break;
              bytes+=value.byteLength;
              if(bytes>maxBytes){await reader.cancel();throw Error('Resposta massa gran');}
              chunks.push(decoder.decode(value,{stream:true}));
            }
            text=chunks.join('')+decoder.decode();
          }else text=await response.text();
          if(Buffer.byteLength(text,'utf8')>maxBytes)throw Error('Resposta massa gran');
          return {text,url:response.url||url.href,json:()=>JSON.parse(text)};
        }catch(error){
          if(attempt===retries || /HTTP 4(?!29)|Resposta massa gran/.test(error.message))throw error;
          await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
        }
      }
    })();
    cache.set(key,promise);return promise;
  };
}
