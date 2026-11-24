import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {execFile} from 'node:child_process';
import {createApi,createTransport} from './dist/api.mjs';
const here=dirname(fileURLToPath(import.meta.url));
export async function startServer({port=43828,fetchImpl=globalThis.fetch,interval=2100,staticRoot=resolve(here,'dist')}={}){
 const session=randomBytes(32).toString('hex'),accounts=new Map(),pending=new Map(),transport=createTransport({fetchImpl,interval});
 let localOrigin;const approved=new Set(['https://mapo-transformer.citrus-pike-4292.chatgpt.site','http://127.0.0.1:43828','http://localhost:43828']);
 const send=(res,status,data,type='application/json')=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'});res.end(type==='application/json'?JSON.stringify(data):data);};
 const cancelAuth=destination=>{for(const [state,p] of pending)if(p.destination===destination){clearTimeout(p.timer);p.controller.abort();pending.delete(state);}};
 const server=http.createServer(async(req,res)=>{
  const address=server.address();if(!['127.0.0.1:'+address.port,'localhost:'+address.port].includes(req.headers.host)){send(res,403,{error:'Unrecognized local host.'});return;}
  const origin=req.headers.origin;if(origin&&!approved.has(origin)){send(res,403,{error:'This website is not allowed to use the local connector.'});return;}
  if(origin){res.setHeader('access-control-allow-origin',origin);res.setHeader('vary','Origin');res.setHeader('access-control-allow-private-network','true');}
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'content-type,x-mapo-session'});res.end();return;}
  const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
  try{
   const url=new URL(req.url,localOrigin);
   if(url.pathname==='/oauth/callback'){
    const state=url.searchParams.get('state')??'',p=pending.get(state);if(!p){send(res,400,'This sign-in expired or has invalid state. Return to Hikkoshi and start again.','text/plain');return;}
    if(p.exchanging){send(res,400,'Sign-in is already completing.','text/plain');return;}p.exchanging=true;
    if(url.searchParams.has('error')){clearTimeout(p.timer);pending.delete(state);send(res,400,'Sign-in was declined. Return to Hikkoshi.','text/plain');return;}
    const code=url.searchParams.get('code');if(!code){clearTimeout(p.timer);pending.delete(state);send(res,400,'The authorization service did not return a code.','text/plain');return;}
    try{const form=new URLSearchParams({grant_type:'authorization_code',client_id:p.clientId,code,redirect_uri:localOrigin+'/oauth/callback'});if(p.destination==='AniList')form.set('client_secret',p.secret);else form.set('code_verifier',p.verifier);
     const tokenResponse=await fetchImpl(p.destination==='AniList'?'https://anilist.co/api/v2/oauth/token':'https://myanimelist.net/v1/oauth2/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form.toString(),signal:AbortSignal.any([p.controller.signal,AbortSignal.timeout(45000)])});
     if(!tokenResponse.ok)throw Error('Authorization exchange failed. Check your application credentials and exact redirect URL.');const tokenJson=await tokenResponse.json();if(typeof tokenJson.access_token!=='string'||!tokenJson.access_token)throw Error('No access token was returned.');const api=createApi({destination:p.destination,token:tokenJson.access_token,clientId:p.clientId,transport});const account=await api.account(p.controller.signal);p.controller.signal.throwIfAborted();accounts.set(p.destination,{api,account});send(res,200,'<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Hikkoshi sign-in complete</title><h1>Connected to Hikkoshi</h1><p>You can close this tab and return to the web app. No library changes were made.</p>','text/html');
    }catch{send(res,400,'Sign-in did not complete. Check the client ID, AniList client secret, and redirect URL; then retry in Hikkoshi.','text/plain');}finally{clearTimeout(p.timer);pending.delete(state);p.secret='';}return;
   }
   if(url.pathname==='/api/hello'){send(res,200,{version:'2.2.0',session,accounts:Object.fromEntries([...accounts].map(([d,a])=>[d,a.account])),redirect:localOrigin+'/oauth/callback',pending:[...pending.values()].map(p=>p.destination)});return;}
   if(url.pathname.startsWith('/api/')){
    if(req.method!=='POST'||!origin||!approved.has(origin)||!equal(req.headers['x-mapo-session'],session)){send(res,403,{error:'Reconnect the local connector before continuing.'});return;}
    let data='',size=0;for await(const chunk of req){size+=chunk.length;if(size>1024*1024)throw Error('Request is too large. Backups must stay in your browser.');data+=chunk;}const body=JSON.parse(data||'{}');const destination=body.destination;if(!['AniList','MyAnimeList'].includes(destination))throw Error('Choose a supported destination.');
    if(url.pathname==='/api/signout'){cancelAuth(destination);accounts.delete(destination);send(res,200,{ok:true});return;}
    if(url.pathname==='/api/auth/cancel'){cancelAuth(destination);send(res,200,{ok:true});return;}
    if(url.pathname==='/api/auth/start'){
     const clientId=String(body.clientId??'').trim(),secret=String(body.secret??'').trim();if(!clientId)throw Error('Enter your application client ID.');if(destination==='AniList'&&!secret)throw Error('Enter your own AniList application client secret, not your account password.');cancelAuth(destination);
     const state=randomBytes(32).toString('hex'),verifier=randomBytes(48).toString('hex');const params=new URLSearchParams({client_id:clientId,redirect_uri:localOrigin+'/oauth/callback',response_type:'code',state});if(destination==='MyAnimeList'){params.set('code_challenge',verifier);params.set('code_challenge_method','plain');}
     const p={destination,clientId,secret,verifier,controller:new AbortController()};p.timer=setTimeout(()=>{p.secret='';p.controller.abort();pending.delete(state);},300000);p.timer.unref();pending.set(state,p);send(res,200,{url:(destination==='AniList'?'https://anilist.co/api/v2/oauth/authorize?':'https://myanimelist.net/v1/oauth2/authorize?')+params});return;
    }
    if(url.pathname==='/api/rpc'){
     const {method,args=[]}=body;if(!['account','list','search','lookup','get','save'].includes(method))throw Error('Unsupported operation.');let api=accounts.get(destination)?.api;if(!api&&['search','lookup'].includes(method))api=createApi({destination,clientId:String(body.clientId??''),transport});if(!api)throw Error('Sign in to this destination first.');const value=['account','list'].includes(method)?await api[method](controller.signal):await api[method](args[0],controller.signal);send(res,200,{value:value??null});return;
    }send(res,404,{error:'Unknown connector route.'});return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){send(res,405,{error:'Method not allowed.'});return;}
   const path=resolve(staticRoot,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(staticRoot+'\\')&&!path.startsWith(staticRoot+'/')){send(res,403,{error:'Invalid path.'});return;}try{const content=await readFile(path);const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};res.writeHead(200,{'content-type':types[extname(path)]??'application/octet-stream','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'});res.end(req.method==='HEAD'?undefined:content);}catch{send(res,404,'Not found','text/plain');}
  }catch(error){if(!res.headersSent&&!res.destroyed)send(res,400,{error:error.name==='AbortError'?'Cancelled.':error instanceof SyntaxError?'Invalid request.':String(error.message||'Operation failed.')});}
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});localOrigin='http://127.0.0.1:'+server.address().port;approved.add(localOrigin);server.on('close',()=>{for(const p of pending.values()){clearTimeout(p.timer);p.controller.abort();}pending.clear();accounts.clear();});return {server,origin:localOrigin,close:()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();})};
}
function equal(a,b){return typeof a==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {origin}=await startServer();console.log(`Hikkoshi 2.2.0 · ${origin}\nBackups stay in your browser. Tokens stay in memory. Close this window to stop.`);if(process.argv.includes('--open'))execFile('cmd.exe',['/c','start','',origin]);
}
