// Routes for the company's market. Finding competitors and buyer groups takes a minute or two, so each runs as a
// background job per company; the browser checks on it every couple of seconds and can leave the page meanwhile.
import type {Connect} from 'vite';
import {body,json,query} from './http';
import {checkCompetitor,findBuyerGroups,findCompetitors,writeMarketMd,type Job,type Market,type MarketStore} from './market';
import {webSearch} from './search';
import type {Writer} from './llm';
import type {GetStore} from './db';

const jobs=new Map<string,Job>();
const key=(d:unknown)=>String(d||'').trim().toLowerCase();

export function marketRoutes(use:Connect.Server['use'],getStore:GetStore,writer:Writer|null){
 const store=async():Promise<MarketStore&{name:(d:string)=>Promise<string>}>=>{const s=await getStore();
  return {getMarket:d=>s.getMarket(d) as Promise<Market>,saveMarket:async(d,m)=>{const r=await s.saveMarket(d,m) as Market;const w=await s.workspace(d);await writeMarketMd(d,w.company?.name||d,r).catch(()=>{});return r;},name:async d=>(await s.workspace(d)).company?.name||d};};
 // Starts a job unless one of the same kind is already running for this company.
 const start=(domain:string,kind:Job['kind'],run:(progress:(line:string,done?:number,total?:number)=>void)=>Promise<unknown>)=>{
  const k=`${kind}:${domain}`,cur=jobs.get(k);if(cur?.running)return cur;
  const job:Job={kind,running:true,lines:[],done:0,total:0};jobs.set(k,job);
  const progress=(line:string,done?:number,total?:number)=>{if(job.lines[job.lines.length-1]!==line)job.lines=[...job.lines.slice(-5),line];if(done!==undefined)job.done=done;if(total!==undefined)job.total=total;};
  run(progress).then(()=>{job.running=false;job.finished=new Date().toISOString();},e=>{job.running=false;job.error=(e as Error).message;console.error(`[market] ${kind} ${domain}:`,e);});
  return job;
 };
 const needWriter=()=>{if(!writer)throw Object.assign(new Error('No writing model is set up. Add ANTHROPIC_API_KEY to .env (or LLM_BASE_URL, LLM_API_KEY and LLM_MODEL), then restart the dev server.'),{status:503});return writer;};
 const route=(path:string,fn:(req:Connect.IncomingMessage)=>Promise<unknown>)=>use(path,async(req,res)=>{
  try{json(res,200,await fn(req));}catch(e){json(res,(e as {status?:number}).status||500,{error:(e as Error).message});}
 });
 const state=async(domain:string)=>({...(await (await store()).getMarket(domain)),jobs:{competitors:jobs.get(`competitors:${domain}`)||null,groups:jobs.get(`groups:${domain}`)||null}});

 // GET  /api/market?domain=                    competitors, buyer groups and any running job
 // POST /api/market/competitors/find {domain}   look for competitors again
 // POST /api/market/competitors/check {input}   read a website the user typed, for its chip
 // POST /api/market/groups/find {domain}        work out buyer groups from the kept competitors
 // POST /api/market {domain, competitors?, groups?}  save the user's edits
 route('/api/market/competitors/find',async req=>{const {domain}=await body(req),d=key(domain),w=needWriter(),s=await store();
  start(d,'competitors',progress=>findCompetitors(d,{search:webSearch,writer:w,store:s,progress}));return state(d);});
 route('/api/market/competitors/check',async req=>({competitor:await checkCompetitor(String((await body(req)).input||''))}));
 route('/api/market/groups/find',async req=>{const {domain}=await body(req),d=key(domain),w=needWriter(),s=await store();
  start(d,'groups',progress=>findBuyerGroups(d,{writer:w,store:s,progress}));return state(d);});
 route('/api/market',async req=>{
  if(req.method==='GET')return state(key(query(req).get('domain')));
  const {domain,competitors,groups}=await body(req),d=key(domain);
  await (await store()).saveMarket(d,{...(competitors?{competitors}:{}),...(groups?{groups}:{})});return state(d);
 });

 // Called when website research finishes, so competitors are being found while the user reads the brief.
 return {afterResearch:(domain:string)=>{if(writer)void store().then(s=>start(key(domain),'competitors',progress=>findCompetitors(key(domain),{search:webSearch,writer,store:s,progress})));}};
}
