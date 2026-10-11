// Publishing routes for the local server: connections (keys stay here) and publishing with live progress.
import type {Connect} from 'vite';
import {getConnection,listConnections,platformNames,removeConnection,saveConnection,type Platform} from './connections';
import {publishers,webflowOptions} from './publish';
import {body,json,query as q} from './http';
import type {GetStore} from './db';

const platforms:Platform[]=['wordpress','webflow','hubspot','ghost'];
export function publishRoutes(use:Connect.Server['use'],getStore:GetStore){
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
 // mode: draft (default), publish, or schedule with `at`. With an articleId, the outcome is saved to that article.
 use('/api/publish',async(req,res)=>{
  res.setHeader('content-type','application/x-ndjson');const send=(e:object)=>res.write(JSON.stringify(e)+'\n');
  try{const {domain,platform,mode:m,at,post,images,articleId}=await body(req);const c=await getConnection(domain,platform);if(!c)throw new Error('This platform is not connected. Connect it in Settings.');
   const mode=m==='publish'||m==='schedule'?m:'draft',when=mode==='schedule'?new Date(at):null;
   if(when&&(isNaN(+when)||+when<Date.now()+60_000))throw new Error('Pick a date and time in the future.');
   post.datePublished=(when||new Date()).toISOString().slice(0,10);
   const r=await publishers[platform as Platform].publish(c,post,images,mode,{step:label=>send({t:'step',label}),warn:text=>send({t:'warn',text})},when?.toISOString());
   if(articleId)try{
    const s=await getStore(),base={id:articleId,cms:platform,externalId:r.id,editUrl:r.editUrl};
    await s.saveArticle(domain,r.status==='published'?{...base,status:'Published',liveUrl:r.url,publishedAt:new Date().toISOString(),scheduledFor:null}
     :r.status==='scheduled'?{...base,status:'Scheduled',scheduledFor:when!.toISOString()}:base,r.status==='draft'?{label:`Sent to ${platformNames[platform as Platform]} as a draft`}:undefined);
   }catch(e){r.warnings.push(`It went to your blog, but saving that here failed: ${(e as Error).message}`);}
   send({t:'done',...r});}
  catch(e){send({t:'error',message:(e as Error).message});}
  res.end();
 });
}
