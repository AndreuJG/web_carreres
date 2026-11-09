import {spawnSync} from 'node:child_process';

if(process.env.GITHUB_ACTIONS!=='true'||!process.env.GITHUB_TOKEN)throw Error('Publicació disponible només en GitHub Actions amb el token del repositori');
if(process.env.GITHUB_REPOSITORY!=='AndreuJG/web_carreres'||process.env.GITHUB_REF!=='refs/heads/main')throw Error('Repositori o branca de publicació inesperats');
function git(args,env=process.env){
 const result=spawnSync('git',args,{encoding:'utf8',env});
 if(result.status!==0)throw Error(`Git ${args[0]} ha fallat: ${result.stderr?.slice(0,1200)}`);
 return result.stdout;
}
const files=['data/races.json','data/sync-status.json'];
if(!git(['status','--porcelain','--',...files]).trim()){console.log('Sense canvis per publicar.');process.exit(0);}
git(['add','--',...files]);
git(['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','Update race calendar and daily source health']);
// Ephemeral credentials are passed only to git push, never stored in a file or echoed.
git(['push','origin','HEAD:main'],{...process.env,GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.https://github.com/.extraheader',GIT_CONFIG_VALUE_0:`AUTHORIZATION: basic ${Buffer.from(`x-access-token:${process.env.GITHUB_TOKEN}`).toString('base64')}`});
console.log('Catàleg i informe diari publicats en main.');
