// Publishing routes for the local server: connections (keys stay here) and publishing with live progress.
import type {Connect} from 'vite';
import type {IncomingMessage} from 'node:http';
import {getConnection,listConnections,removeConnection,saveConnection,type Platform} from './connections';
import {publishers,webflowOptions} from './publish';

const platforms:Platform[]=['wordpress','webflow','hubspot','ghost'];
async function body(req:IncomingMessage):Promise<any>{
 let size=0;const chunks:Buffer[]=[];
 for await(const c of req){size+=c.length;if(size>30_000_000)throw new Error('Request too large.');chunks.push(c as Buffer);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
}
const json=(res:any,status:number,data:unknown)=>{res.statusCode=status;res.setHeader('content-type','application/json');res.end(JSON.stringify(data));};
const q=(req:IncomingMessage)=>new URL(req.url||'','http://local').searchParams;

export function publishRoutes(use:Connect.Server['use']){
 use('/api/connections/settings',async(req,res)=>{
  try{const {domain,platform,settings}=await body(req);const c=await getConnection(domain,platform);if(!c)return json(res,404,{error:'Not connected.'});
   await saveConnection(domain,{...c,settings:{...c.settings,...settings}});json(res,200,{ok:true});}catch(e){json(res,400,{error:(e as Error).message});}
 });
 use('/api/connections/webflow-options',async(req,res)=>{
  try{const c=await getConnection(q(req).get('domain')||'','webflow');if(!c)return json(res,404,{error:'Webflow is not connected.'});json(res,200,{collections:await webflowOptions(c.creds,c.settings.siteId)});}
  catch(e){json(res,400,{error:(e as Error).message});}
 });
 use('/api/connections',async(req,res)=>{
  try{
   if(req.method==='GET')return json(res,200,{connections:await listConnections(q(req).get('domain')||'')});
   if(req.method==='DELETE'){await removeConnection(q(req).get('domain')||'',q(req).get('platform') as Platform);return json(res,200,{ok:true});}
   const {domain,platform,creds}=await body(req);if(!platforms.includes(platform))return json(res,400,{error:'Unknown platform.'});
   // Test before saving, so a saved connection always works.
   const t=await publishers[platform as Platform].test(creds);
   await saveConnection(domain,{platform,creds,settings:t.settings,label:t.label,connectedAt:new Date().toISOString()});
   json(res,200,{platform,label:t.label,settings:t.settings});
  }catch(e){json(res,400,{error:(e as Error).message});}
 });
 // Streams one JSON object per line: {t:'step'|'warn'|'done'|'error', ...}
 use('/api/publish',async(req,res)=>{
  res.setHeader('content-type','application/x-ndjson');const send=(e:object)=>res.write(JSON.stringify(e)+'\n');
  try{const {domain,platform,mode,post,images}=await body(req);const c=await getConnection(domain,platform);if(!c)throw new Error('This platform is not connected. Connect it in Settings.');
   const r=await publishers[platform as Platform].publish(c,post,images,mode==='publish'?'publish':'draft',{step:label=>send({t:'step',label}),warn:text=>send({t:'warn',text})});
   send({t:'done',...r});}
  catch(e){send({t:'error',message:(e as Error).message});}
  res.end();
 });
}
