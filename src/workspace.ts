import {useEffect,useState,useSyncExternalStore} from 'react';
import type {Article} from './data';

// The current company: its brief (context.md), what research saved, and its articles. The database on the server is
// the record (server/db). This keeps a copy in the browser so pages open instantly, and shows every change straight away
// while it saves in the background, one write at a time and in order.
export type Company={domain:string;name:string;logo:string;md:string;saved:number;groups:{group:string;count:number;pages:string[]}[]};
export type Workspace=Company&{articles:Article[];sync:'loading'|'saving'|'saved'|'error'};
export type ArticleEvent={label:string;detail:string;at:string};
const empty:Workspace={domain:'',name:'Your company',logo:'',md:'',saved:0,groups:[],articles:[],sync:'loading'};
const KEY='comarketer.workspace.v3';
const read=(k:string)=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
// Before the database, everything lived only in this browser. It moves across once, the first time that company loads.
const legacy=():{domain:string;name:string;logo:string;md:string;saved:number;groups:Company['groups'];articles?:Article[]}|null=>{const v2=read('comarketer.workspace.v2'),v1=read('comarketer.workspace');return v2||(v1&&!v1.sample?v1:null);};
const dropLegacy=()=>{try{localStorage.removeItem('comarketer.workspace.v2');localStorage.removeItem('comarketer.workspace');}catch{}};

// Data from before the database wins until it has moved across (it is removed once it has).
let current:Workspace=(()=>{const c=read(KEY),old=legacy();return old?{...empty,...old,articles:old.articles||[],sync:'loading'}:c?{...empty,...c,sync:'loading'}:empty;})();
const subs=new Set<()=>void>();
function set(w:Partial<Workspace>){
 current={...current,...w};
 // Article content can be large and the server has it, so the browser copy leaves it out.
 try{localStorage.setItem(KEY,JSON.stringify({...current,articles:current.articles.map(({content,...a})=>a)}));}catch{}
 subs.forEach(f=>f());
}
export function useWorkspace(){return useSyncExternalStore(f=>{subs.add(f);return()=>subs.delete(f);},()=>current);}
export const getWorkspace=()=>current;
const enc=encodeURIComponent;

async function api<T=any>(path:string,body?:unknown):Promise<T>{
 const r=await fetch(path,body===undefined?undefined:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const d=await r.json().catch(()=>({error:'The server is not responding. Make sure the dev server is running.'}));
 if(!r.ok)throw new Error(d.error||`Request failed (${r.status}).`);
 return d;
}

// Writes run one after another, so the database ends up in the same order as the screen.
let chain:Promise<unknown>=Promise.resolve(),inflight=0,failed=false;
const pending=new Map<string,number>();
function queue<T>(ids:string[],run:()=>Promise<T>):Promise<T|null>{
 inflight++;ids.forEach(id=>pending.set(id,(pending.get(id)||0)+1));set({sync:'saving'});
 const p=chain.then(run).then(r=>{failed=false;return r;},e=>{failed=true;console.error(e);return null;});
 chain=p;
 return p.then(r=>{inflight--;ids.forEach(id=>{const n=(pending.get(id)||1)-1;n?pending.set(id,n):pending.delete(id);});set({sync:inflight?'saving':failed?'error':'saved'});return r;});
}

// Server data wins, except for articles with changes still on their way.
function merge(server:Article[]){
 const local=new Map(current.articles.map(a=>[a.id,a]));
 const out=server.map(a=>pending.has(a.id)?local.get(a.id)||a:{...a,content:local.get(a.id)?.content});
 return [...current.articles.filter(a=>pending.has(a.id)&&!server.some(s=>s.id===a.id)),...out];
}
async function load(domain:string){
 set({sync:'loading'});
 try{
  let d=await api<{company:Company|null;articles:Article[]}>(`/api/workspace?domain=${enc(domain)}`);
  const old=legacy();
  if(!d.company&&old&&(old.domain||'')===domain&&(old.md||old.articles?.length)){d=await api('/api/import',{company:{...old,domain},articles:old.articles||[]});dropLegacy();}
  if(current.domain!==domain)return;
  set({...(d.company?{name:d.company.name||empty.name,logo:d.company.logo,md:d.company.md,saved:d.company.saved,groups:d.company.groups}:{}),articles:merge(d.articles),sync:inflight?'saving':'saved'});
 }catch(e){console.error(e);if(current.domain===domain)set({sync:'error'});}
}
if(typeof window!=='undefined')load(current.domain);
export const reloadWorkspace=()=>load(current.domain);

// After research: switch to this company. Its articles load from the database; another company's stay saved there.
export async function setCompany(c:Company){
 const same=c.domain===current.domain;
 set({...c,articles:same?current.articles:[]});
 const old=legacy();
 try{if(old&&(old.domain||'')===c.domain){await api('/api/import',{company:c,articles:old.articles||[]});dropLegacy();}else await api('/api/companies',c);}
 catch(e){console.error(e);set({sync:'error'});return;}
 await load(c.domain);
}

// Creates the article on first save, then changes only the fields given. A field set to undefined is cleared.
export function saveArticle(a:Partial<Article>&{id:string},event?:{label:string;detail?:string}){
 const now=new Date().toISOString(),list=current.articles,i=list.findIndex(x=>x.id===a.id);
 set({articles:i<0?[{title:a.keyword||'Untitled',keyword:'',status:'In progress',created:now,updated:now,...a} as Article,...list]:list.map(x=>x.id===a.id?{...x,...a,updated:now}:x)});
 const domain=current.domain,article=Object.fromEntries(Object.entries(a).map(([k,v])=>[k,v===undefined?null:v]));
 return queue([a.id],()=>api('/api/articles',{domain,article,event})).then(r=>r!==null);
}
export async function duplicateArticle(id:string){
 const domain=current.domain,r=await queue([],()=>api<{article:Article}>(`/api/articles/${enc(id)}/duplicate`,{domain}));
 if(!r||domain!==current.domain)return null;
 set({articles:[r.article,...current.articles]});return r.article;
}
function bulk(ids:string[],action:'archive'|'restore'|'delete'){
 const domain=current.domain,now=new Date().toISOString();
 set({articles:action==='delete'?current.articles.filter(a=>!ids.includes(a.id)):current.articles.map(a=>ids.includes(a.id)?{...a,archivedAt:action==='archive'?a.archivedAt||now:undefined,updated:now}:a)});
 // If it fails, reload from the database so the list matches what is really saved.
 return queue(ids,()=>api('/api/articles/bulk',{domain,ids,action})).then(r=>{if(r===null)load(domain);return r!==null;});
}
export const archiveArticles=(ids:string[])=>bulk(ids,'archive');
export const restoreArticles=(ids:string[])=>bulk(ids,'restore');
export const deleteArticles=(ids:string[])=>bulk(ids,'delete');

// The full article, with its content, for the article page.
export async function loadArticle(id:string){
 const domain=current.domain;
 try{const {article}=await api<{article:Article}>(`/api/articles/${enc(id)}?domain=${enc(domain)}`);
  if(domain===current.domain&&!pending.has(id))set({articles:current.articles.some(a=>a.id===id)?current.articles.map(a=>a.id===id?article:a):[article,...current.articles]});
  return true;}
 catch(e){console.error(e);return false;}
}
// What happened to an article, newest first. Reloads when `version` changes.
export function useArticleEvents(id:string,version:string){
 const [events,setEvents]=useState<ArticleEvent[]|null>(null);
 useEffect(()=>{let live=true;
  // Let queued writes land first, so the newest change is in the list.
  chain.then(()=>api<{events:ArticleEvent[]}>(`/api/articles/${enc(id)}/events?domain=${enc(current.domain)}`)).then(d=>{if(live)setEvents(d.events);}).catch(()=>{if(live)setEvents([]);});
  return()=>{live=false;};
 },[id,version]);
 return events;
}

// "just now", "5 min ago", "Today 10:12", "Yesterday", "11 Oct", "11 Oct 2025".
export function when(iso?:string){
 if(!iso)return '';const d=new Date(iso),now=new Date();if(isNaN(+d))return iso;
 const mins=Math.round((+now-+d)/60000),day=(x:Date)=>x.toDateString(),y=new Date(now);y.setDate(now.getDate()-1);
 if(mins>=0&&mins<1)return 'just now';if(mins>=0&&mins<60)return `${mins} min ago`;
 if(day(d)===day(now))return `Today ${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
 if(day(d)===day(y))return 'Yesterday';
 const t=new Date(now);t.setDate(now.getDate()+1);if(day(d)===day(t))return `Tomorrow ${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
 return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',...(d.getFullYear()!==now.getFullYear()?{year:'numeric'}:{})});
}
// A date with its time, for scheduled posts.
export const whenExact=(iso?:string)=>iso?new Date(iso).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
