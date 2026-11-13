import {spawnSync} from 'node:child_process';

if(process.env.GITHUB_ACTIONS!=='true'||!process.env.GITHUB_TOKEN)throw Error('Publicació disponible només en GitHub Actions amb el token del repositori');
if(process.env.GITHUB_REPOSITORY!=='AndreuJG/web_carreres'||process.env.GITHUB_REF!=='refs/heads/main')throw Error('Repositori o branca de publicació inesperats');
function runGit(args,env=process.env){
 return spawnSync('git',args,{encoding:'utf8',env});
}
function checked(result,args){
 if(result.status!==0)throw Error(`Git ${args[0]} ha fallat: ${result.stderr?.slice(0,1200)}`);
 return result.stdout;
}
function git(args,env=process.env){
 return checked(runGit(args,env),args);
}
const files=['data/races.json','data/sync-status.json'];
if(!git(['status','--porcelain','--',...files]).trim()){console.log('Sense canvis per publicar.');process.exit(0);}
const base=git(['rev-parse','HEAD']).trim();
git(['add','--',...files]);
const author=['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com'];
git([...author,'commit','-m','Update race calendar and daily source health']);
// Use the temporary token only for authenticated Git operations.
const auth={...process.env,GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.https://github.com/.extraheader',GIT_CONFIG_VALUE_0:`AUTHORIZATION: basic ${Buffer.from(`x-access-token:${process.env.GITHUB_TOKEN}`).toString('base64')}`};
const inputs=[...files,'scripts/sync-races.mjs','scripts/sync','lib','package.json','package-lock.json'];
const pushArgs=['push','--porcelain','origin','HEAD:main'];
for(let attempt=0;attempt<3;attempt++){
 const result=runGit(pushArgs,auth);
 if(result.status===0){
  console.log('Catàleg i informe diari publicats en main.');
  break;
 }
 const stale=/\[rejected\].*\((?:fetch first|non-fast-forward)\)/.test(result.stdout);
 if(!stale||attempt===2)checked(result,pushArgs);
 git(['fetch','--no-tags','origin','main'],auth);
 const diffArgs=['diff','--quiet',base,'FETCH_HEAD','--',...inputs];
 const diff=runGit(diffArgs);
 if(diff.status===1)throw Error('Han canviat les dades o els lectors en main. Cal tornar a executar l’actualització des de main.');
 checked(diff,diffArgs);
 git([...author,'rebase','FETCH_HEAD']);
 console.log('main ha avançat. Es reprén la publicació sobre el commit més recent.');
}
