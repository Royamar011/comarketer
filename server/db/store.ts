// Reads and writes for companies and their articles. Every article call names its company, and an article is only
// ever read or changed through the company that owns it.
import crypto from 'node:crypto';
import {workflowSteps,type Article,type Status} from '../../src/data';
import {platformNames} from '../connections';
import type {Db,Q} from './index';

export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
const bad=(m:string)=>new HttpError(400,m),missing=()=>new HttpError(404,'This article is no longer here.');

export type Company={id:string;domain:string;name:string;logo:string;md:string;saved:number;groups:{group:string;count:number;pages:string[]}[]};
export type Event={label:string;detail?:string};
const key=(domain:unknown)=>String(domain??'').trim().toLowerCase().slice(0,253);
const statusIn:Record<Status,string>={'In progress':'in_progress',Ready:'ready',Scheduled:'scheduled',Published:'published'};
const statusOut=Object.fromEntries(Object.entries(statusIn).map(([k,v])=>[v,k])) as Record<string,Status>;

// Article fields the browser may set, and their columns.
type Kind='text'|'int'|'json'|'time';
const fields:Record<string,[string,Kind]>={keyword:['keyword','text'],title:['title','text'],status:['status','text'],step:['step','int'],waiting:['waiting','text'],next:['next_action','text'],voice:['voice','text'],
 plan:['plan','json'],content:['content','json'],words:['words','int'],quality:['quality','int'],sources:['sources','int'],images:['images','int'],slug:['slug','text'],cms:['cms','text'],externalId:['external_id','text'],
 liveUrl:['live_url','text'],editUrl:['edit_url','text'],scheduledFor:['scheduled_for','time'],publishedAt:['published_at','time'],archivedAt:['archived_at','time']};
const allowed:Record<string,unknown[]>={waiting:['you','us'],voice:['founder','team'],cms:Object.keys(platformNames)};
const listCols=['id','created_at','updated_at',...Object.values(fields).map(f=>f[0]).filter(c=>c!=='content')].join(',');

function value(k:string,kind:Kind,v:unknown){
 if(v===null||v===undefined){if(k==='status')throw bad('An article needs a status.');return k==='keyword'||k==='title'?'':null;}
 if(k==='status'){const s=statusIn[v as Status];if(!s)throw bad('Unknown status.');return s;}
 if(allowed[k]&&!allowed[k].includes(v))throw bad(`Unknown ${k}.`);
 if(kind==='text')return String(v).slice(0,k==='title'||k==='keyword'?300:2000);
 if(kind==='int'){const n=Math.round(Number(v));if(!Number.isFinite(n)||Math.abs(n)>1e9)throw bad(`${k} must be a number.`);if(k==='step'&&(n<1||n>4))throw bad('Step is 1 to 4.');return n;}
 // JSON goes in as text so both drivers store exactly this.
 if(kind==='json'){const s=JSON.stringify(v);if(s.length>3_000_000)throw bad('This article is too large to save.');return s;}
 const d=new Date(String(v));if(isNaN(+d))throw bad(`${k} is not a date.`);return d.toISOString();
}
const iso=(d:unknown)=>d==null?undefined:new Date(d as string).toISOString();
function toArticle(r:any):Article{
 const a:any={id:r.id,keyword:r.keyword,title:r.title,status:statusOut[r.status],created:iso(r.created_at),updated:iso(r.updated_at)};
 for(const [k,[col,kind]] of Object.entries(fields)){if(k==='status'||k==='keyword'||k==='title'||r[col]==null)continue;a[k]=kind==='time'?iso(r[col]):r[col];}
 return a;
}
const withoutContent=({content,...a}:Article)=>a;
const toCompany=(r:any):Company=>({id:r.id,domain:r.domain,name:r.name,logo:r.logo,md:r.brief_md,saved:r.pages_saved,groups:r.page_groups||[]});

// What changed, in words, for the article's history.
function changes(old:any,row:any):Event[]{
 if(!old)return [{label:'Started',detail:row.keyword}];
 const out:Event[]=[],on=row.cms?` on ${platformNames[row.cms as keyof typeof platformNames]||row.cms}`:'';
 if(old.step&&row.step>old.step)for(let s=old.step;s<row.step;s++)out.push({label:`${workflowSteps[s-1]} done`});
 if(old.status!==row.status){
  if(row.status==='ready')out.push(old.status==='in_progress'?{label:'Ready to publish',detail:row.words?`${Number(row.words).toLocaleString('en-US')} words`:''}:{label:'Moved back to Ready'});
  if(row.status==='published')out.push({label:`Published${on}`,detail:row.live_url||''});
  if(row.status==='scheduled')out.push({label:`Scheduled${on}`,detail:iso(row.scheduled_for)||''});
 }
 if(!old.archived_at&&row.archived_at)out.push({label:'Archived'});
 if(old.archived_at&&!row.archived_at)out.push({label:'Restored'});
 return out;
}
const log=(q:Q,id:string,events:Event[])=>Promise.all(events.map(e=>q('insert into article_events(article_id,label,detail) values($1,$2,$3)',[id,String(e.label).slice(0,200),String(e.detail||'').slice(0,500)])));

// Older browsers saved dates as display text ("just now", "11 Oct"). Keep what parses, use now for the rest.
function legacyDate(v:unknown){
 if(!v)return null;const s=String(v),d=new Date(s);if(!isNaN(+d)&&d.getFullYear()>2020)return d.toISOString();
 if(!/^\d{1,2} [a-z]{3}$/i.test(s.trim()))return null;
 const y=new Date(`${s} ${new Date().getFullYear()}`);return isNaN(+y)?null:y.toISOString();
}

export function makeStore(db:Db){
 const companyRow=async(q:Q,domain:unknown)=>(await q('select * from companies where domain=$1',[key(domain)]))[0];
 const ensureCompany=async(q:Q,domain:unknown)=>{await q('insert into companies(domain) values($1) on conflict(domain) do nothing',[key(domain)]);return companyRow(q,domain);};
 const owned=async(q:Q,domain:unknown,id:string,cols='*')=>{const c=await companyRow(q,domain);const r=c&&(await q(`select ${cols} from articles where id=$1 and company_id=$2`,[id,c.id]))[0];if(!r)throw missing();return r;};
 const ids=(v:unknown)=>{if(!Array.isArray(v)||!v.length||v.length>500)throw bad('Pick at least one article.');return v.map(String);};

 const store={
  kind:db.kind,
  async workspace(domain:unknown){
   const c=await companyRow(db.query,domain);if(!c)return {company:null,articles:[]};
   const rows=await db.query(`select ${listCols} from articles where company_id=$1 order by updated_at desc`,[c.id]);
   return {company:toCompany(c),articles:rows.map(toArticle)};
  },
  async saveCompany(c:Partial<Company>&{domain:string}){
   const r=(await db.query(`insert into companies(domain,name,logo,brief_md,pages_saved,page_groups) values($1,$2,$3,$4,$5,$6)
    on conflict(domain) do update set name=excluded.name,logo=excluded.logo,brief_md=excluded.brief_md,pages_saved=excluded.pages_saved,page_groups=excluded.page_groups,updated_at=now() returning *`,
    [key(c.domain),String(c.name||'').slice(0,200),String(c.logo||'').slice(0,2000),String(c.md||''),Math.max(0,Math.round(Number(c.saved)||0)),JSON.stringify(Array.isArray(c.groups)?c.groups:[])]))[0];
   return toCompany(r);
  },
  async article(domain:unknown,id:string){return toArticle(await owned(db.query,domain,id));},
  async events(domain:unknown,id:string){
   await owned(db.query,domain,id,'id');
   return (await db.query('select label,detail,created_at from article_events where article_id=$1 order by created_at desc,id desc limit 200',[id])).map(r=>({label:r.label,detail:r.detail,at:iso(r.created_at)}));
  },
  // Creates the article on its first save, then changes only the fields sent. A field sent as null is cleared.
  async saveArticle(domain:unknown,patch:Record<string,unknown>,event?:Event){
   const id=String(patch?.id||'');if(!/^[\w-]{1,64}$/.test(id))throw bad('Bad article id.');
   const sets:[string,unknown][]=Object.entries(fields).filter(([k])=>k in patch).map(([k,[col,kind]])=>[col,value(k,kind,patch[k])]);
   return db.tx(async({query:q})=>{
    const c=await ensureCompany(q,domain),old=(await q('select * from articles where id=$1 for update',[id]))[0];
    if(old&&old.company_id!==c.id)throw missing();
    let row=old;
    if(!old){const cols=['id','company_id',...sets.map(s=>s[0])];
     row=(await q(`insert into articles(${cols.join(',')}) values(${cols.map((_,i)=>`$${i+1}`).join(',')}) returning *`,[id,c.id,...sets.map(s=>s[1])]))[0];}
    else if(sets.length)row=(await q(`update articles set ${sets.map((s,i)=>`${s[0]}=$${i+2}`).join(',')},updated_at=now() where id=$1 returning *`,[id,...sets.map(s=>s[1])]))[0];
    await log(q,id,[...changes(old,row),...(event?.label?[event]:[])]);
    return withoutContent(toArticle(row));
   });
  },
  // A copy to work on: same content, not linked to any published post.
  async duplicate(domain:unknown,id:string){
   return db.tx(async({query:q})=>{
    const src=await owned(q,domain,id),nid=crypto.randomUUID(),title=`${src.title} (copy)`.slice(0,300),slug=src.slug?`${src.slug}-copy`.slice(0,80):null;
    const content=src.content?JSON.stringify({...src.content,title,slug:slug||src.content.slug}):null;
    const row=(await q(`insert into articles(id,company_id,keyword,title,status,step,waiting,next_action,voice,plan,content,words,quality,sources,images,slug)
     select $1,company_id,keyword,$2,case when status='in_progress' then 'in_progress' else 'ready' end,step,waiting,next_action,voice,plan,$3,words,quality,sources,images,$4 from articles where id=$5 returning *`,[nid,title,content,slug,id]))[0];
    await log(q,nid,[{label:'Duplicated',detail:`From “${src.title}”`}]);
    return withoutContent(toArticle(row));
   });
  },
  async bulk(domain:unknown,list:unknown,action:unknown){
   const c=await companyRow(db.query,domain),pick=ids(list);if(!c)throw missing();
   if(action==='delete')return (await db.query('delete from articles where company_id=$1 and id=any($2::text[]) returning id',[c.id,pick])).map(r=>r.id as string);
   if(action!=='archive'&&action!=='restore')throw bad('Unknown action.');
   return db.tx(async({query:q})=>{
    const done=(await q(`update articles set archived_at=${action==='archive'?'now()':'null'},updated_at=now() where company_id=$1 and id=any($2::text[]) and archived_at is ${action==='archive'?'':'not '}null returning id`,[c.id,pick])).map(r=>r.id as string);
    for(const id of done)await log(q,id,[{label:action==='archive'?'Archived':'Restored'}]);
    return done;
   });
  },
  // One-time move of a company and its articles from an older browser-only version. Articles already here are kept as they are.
  async importBrowser(company:Partial<Company>&{domain:string},articles:unknown){
   const c=await store.saveCompany(company);
   const list=(Array.isArray(articles)?articles:[]).slice(0,1000) as Record<string,unknown>[];
   await db.tx(async({query:q})=>{for(const a of list){
    const id=String(a.id||'');if(!/^[\w-]{1,64}$/.test(id)||!statusIn[a.status as Status])continue;
    const patch={...a,scheduledFor:legacyDate(a.scheduledFor),publishedAt:legacyDate(a.publishedAt),archivedAt:null};
    const sets=Object.entries(fields).filter(([k])=>k in patch).map(([k,[col,kind]])=>{try{return [col,value(k,kind,patch[k as keyof typeof patch])];}catch{return [col,null];}}).filter(([col,v])=>v!==null||col!=='status');
    const at=legacyDate(a.updated)||new Date().toISOString(),cols=['id','company_id','created_at','updated_at',...sets.map(s=>s[0] as string)];
    const r=await q(`insert into articles(${cols.join(',')}) values(${cols.map((_,i)=>`$${i+1}`).join(',')}) on conflict(id) do nothing returning id`,[id,c.id,legacyDate(a.created)||at,at,...sets.map(s=>s[1])]);
    if(r.length)await log(q,id,[{label:'Moved from this browser to the database'}]);
   }});
   return store.workspace(company.domain);
  },
 };
 return store;
}
export type Store=ReturnType<typeof makeStore>;
