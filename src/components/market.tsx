import {useEffect,useRef,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {ArrowRight,Check,ChevronDown,LoaderCircle,Plus,RefreshCw,Search,Undo2,X} from 'lucide-react';
import {ProblemCard,Ring,ease,spring} from './ui';
import {useWorkspace} from '../workspace';

// The company's market: who it competes with and who buys. Found by research (server/market.ts), confirmed here.
export type Source={kind:'search'|'list'|'your-site'|'ai'|'you';query?:string;url?:string};
export type Competitor={domain:string;name:string;logo:string;what:string;why:string;match:'direct'|'adjacent';confidence:'high'|'medium'|'low';sources:Source[];added:'auto'|'you';status:'kept'|'extra'|'removed';reachable?:boolean};
export type Evidence={from:string;page:string;quote:string};
export type BuyerGroup={id:string;name:string;who:string;companyType:string;size:string;roles:string[];pains:string[];triggers:string[];searches:string[];compares:string[];objections:string[];knowledge:'new'|'familiar'|'expert';served:'yours'|'market';companies:string[];evidence:Evidence[];confidence:'high'|'medium'|'low';added:'auto'|'you';status:'kept'|'removed'};
type Job={running:boolean;lines:string[];done:number;total:number;error?:string;finished?:string}|null;
type State={competitors:Competitor[];groups:BuyerGroup[];jobs:{competitors:Job;groups:Job}};

async function call(path:string,body?:object):Promise<any>{
 const r=await fetch(path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:undefined);
 const d=await r.json().catch(()=>({error:'The server is not responding. Make sure it is running (npm run dev).'}));
 if(!r.ok)throw new Error(d.error||`Request failed (${r.status}).`);return d;
}

// Loads the market, checks on running jobs every 1.5 seconds, and saves edits (shown straight away, saved in the background).
export function useMarket(){
 const ws=useWorkspace(),domain=ws.domain,[state,setRaw]=useState<State|null>(null),[error,setError]=useState(''),latest=useRef<State|null>(null);
 // Edits that follow each other quickly (several competitors pasted at once) build on the newest list, not a stale copy.
 const setState=(f:State|null|((s:State|null)=>State|null))=>setRaw(s=>{const v=typeof f==='function'?f(s):f;latest.current=v;return v;});
 const busy=!!(state?.jobs.competitors?.running||state?.jobs.groups?.running);
 const load=()=>call(`/api/market?domain=${encodeURIComponent(domain)}`).then(d=>{setState(d);setError('');}).catch(e=>setError(e.message));
 useEffect(()=>{if(domain)load();},[domain]);
 useEffect(()=>{if(!busy)return;const t=setInterval(load,1500);return()=>clearInterval(t);},[busy,domain]);
 const run=(path:string)=>call(path,{domain}).then(d=>{setState(d);setError('');}).catch(e=>setError(e.message));
 const save=(patch:Partial<Pick<State,'competitors'|'groups'>>)=>{setState(s=>s&&{...s,...patch});return call('/api/market',{domain,...patch}).then(d=>setState(s=>s&&{...s,competitors:d.competitors,groups:d.groups})).catch(e=>setError(e.message));};
 return {domain,state,error,busy,latest:()=>latest.current,reload:load,findCompetitors:()=>run('/api/market/competitors/find'),findGroups:()=>run('/api/market/groups/find'),save};
}
type Market=ReturnType<typeof useMarket>;

const confidenceLabel={high:'Strong match',medium:'Likely',low:'Check this'};
const sourceLabel=(s:Source)=>s.kind==='your-site'?`Your site compares with them`:s.kind==='search'?`Ranks for “${s.query}”`:s.kind==='list'?`Listed on ${(()=>{try{return new URL(s.url||'').hostname.replace(/^www\./,'');}catch{return 'a list of tools';}})()}`:s.kind==='ai'?'From general knowledge':'Added by you';

function Logo({src,name}:{src:string;name:string}){
 const [bad,setBad]=useState(!src);
 return bad?<span className="mk-initial" aria-hidden="true">{(name||'?')[0].toUpperCase()}</span>:<img className="mk-logo" src={src} alt="" width={28} height={28} onError={()=>setBad(true)}/>;
}

// Progress of a running job: what it is doing now, in plain words.
function Working({job,title}:{job:NonNullable<Job>;title:string}){
 return <motion.div className="mk-working" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:.3,ease}} role="status">
  <Ring value={job.total?job.done/job.total:.15} size={40}/>
  <div><strong>{title}</strong><AnimatePresence mode="wait" initial={false}><motion.span key={job.lines.at(-1)} className="muted" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:.18}}>{job.lines.at(-1)||'Starting'}{job.total>1?` · ${job.done} of ${job.total}`:''}</motion.span></AnimatePresence></div>
 </motion.div>;
}

// ---------- Competitors ----------
// In setup the page title already says what this is, so the section title is left out (`bare`).
export function CompetitorsEditor({m,bare}:{m:Market;bare?:boolean}){
 const {state,save,findCompetitors}=m,job=state?.jobs.competitors,list=state?.competitors||[];
 const [input,setInput]=useState(''),[checking,setChecking]=useState<string[]>([]),[open,setOpen]=useState<string|null>(null),[bad,setBad]=useState('');
 const kept=list.filter(c=>c.status==='kept'),extra=list.filter(c=>c.status==='extra'),removed=list.filter(c=>c.status==='removed');
 const set=(domain:string,status:Competitor['status'])=>save({competitors:list.map(c=>c.domain===domain?{...c,status}:c)});
 // Paste one or several: "rival.com, other.io" or one per line. Each is read so its chip shows who it is.
 const add=async(raw:string)=>{
  const items=raw.split(/[\s,;]+/).map(s=>s.trim()).filter(Boolean);setInput('');setBad('');
  for(const it of items){
   const guess=it.toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,'');
   if(!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(guess)){setBad(`“${it}” is not a website address. Try something like rival.com.`);continue;}
   const known=(m.latest()?.competitors||list).find(c=>c.domain===guess||guess.endsWith('.'+c.domain));
   if(known){set(known.domain,'kept');continue;}
   setChecking(c=>[...c,guess]);
   try{const {competitor}=await call('/api/market/competitors/check',{input:it});const cur=m.latest()?.competitors||[];
    await save({competitors:[...cur.filter(c=>c.domain!==competitor.domain),competitor]});}
   catch(e){setBad((e as Error).message);}
   setChecking(c=>c.filter(x=>x!==guess));
  }
 };
 return <section className="mk-section" aria-labelledby="mk-comp">
  <header className="mk-head"><div>{!bare&&<><h2 id="mk-comp">Who you compete with</h2><p className="muted">The companies your buyers compare you with. Articles use them to understand your market and to write fair comparisons.</p></>}</div>
   {!job?.running&&<button className="button ghost compact" onClick={findCompetitors}><RefreshCw size={14}/>Look again</button>}</header>
  {job?.running&&<Working job={job} title="Finding your competitors"/>}
  {job?.error&&!job.running&&<ProblemCard problem={{title:'Couldn’t finish looking for competitors',fix:/blocked|No competitors found/i.test(job.error)?'Search didn’t return enough to go on. Add the competitors you know below; you can look again any time.':'Add the competitors you know below, or try again.',details:job.error,retry:findCompetitors}}/>}
  <div className="mk-chips">
   <AnimatePresence initial={false}>{kept.map(c=><motion.div layout key={c.domain} className={`mk-chip ${open===c.domain?'open':''}`} initial={{opacity:0,scale:.94}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.94,transition:{duration:.15}}} transition={spring}>
    <button className="mk-chip-main" aria-expanded={open===c.domain} onClick={()=>setOpen(o=>o===c.domain?null:c.domain)}>
     <Logo src={c.logo} name={c.name}/>
     <span className="mk-chip-text"><strong>{c.name}</strong><small>{c.domain}</small></span>
     {c.added==='you'?<span className="mk-tag you">Added by you</span>:<span className={`mk-tag ${c.confidence}`}>{c.match==='adjacent'?'Sometimes compared':confidenceLabel[c.confidence]}</span>}
    </button>
    <button className="icon-button mk-x" aria-label={`Remove ${c.name}`} onClick={()=>set(c.domain,'removed')}><X size={15}/></button>
    <AnimatePresence initial={false}>{open===c.domain&&<motion.div className="mk-chip-more" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.2,ease}}>
     {c.what&&<p>{c.what}</p>}{c.why&&<p className="muted">{c.why}</p>}
     {c.reachable===false&&<p className="muted">We couldn’t open this website, so it is kept as you typed it.</p>}
     {c.added!=='you'&&<ul>{c.sources.slice(0,4).map((s,i)=><li key={i}>{sourceLabel(s)}</li>)}</ul>}
    </motion.div>}</AnimatePresence>
   </motion.div>)}</AnimatePresence>
   {checking.map(d=><div key={d} className="mk-chip checking"><span className="mk-initial"><LoaderCircle className="spin" size={14}/></span><span className="mk-chip-text"><strong>{d}</strong><small>Reading their website</small></span></div>)}
   {!kept.length&&!checking.length&&!job?.running&&<p className="muted mk-empty">No competitors yet. Add the ones you know below.</p>}
  </div>
  <form className="mk-add" onSubmit={e=>{e.preventDefault();if(input.trim())add(input);}}>
   <Search size={16}/><input aria-label="Add competitors" placeholder="Add a competitor’s website, or paste several" value={input} onChange={e=>setInput(e.target.value)} onPaste={e=>{const t=e.clipboardData.getData('text');if(/[\s,;]/.test(t.trim())){e.preventDefault();add(t);}}}/>
   <button className="button secondary compact" disabled={!input.trim()}><Plus size={14}/>Add</button>
  </form>
  {bad&&<p className="mk-bad" role="alert">{bad}</p>}
  {extra.length>0&&<div className="mk-extra"><span className="eyebrow">Also found</span><div>{extra.map(c=><button key={c.domain} className="mk-pill" onClick={()=>set(c.domain,'kept')} title={c.what}><Plus size={13}/>{c.name}</button>)}</div></div>}
  {removed.length>0&&<p className="mk-removed muted">Removed: {removed.map((c,i)=><span key={c.domain}>{i>0&&', '}{c.name||c.domain} <button className="link-btn" onClick={()=>set(c.domain,'kept')}><Undo2 size={12}/>Undo</button></span>)}</p>}
 </section>;
}

// ---------- Buyer groups ----------
const knowledgeLabel={new:'New to this',familiar:'Knows the basics',expert:'Knows it well'};
function GroupCard({g,company,onRemove}:{g:BuyerGroup;company:string;onRemove:()=>void}){
 const [open,setOpen]=useState(false);
 return <motion.article layout className={`mk-group ${g.served}`} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:.97,transition:{duration:.15}}} transition={{duration:.3,ease}}>
  <header><span className={`mk-served ${g.served}`}>{g.served==='yours'?'You serve this':'Others in your market serve this'}</span>
   {g.confidence==='low'&&g.added!=='you'&&<span className="mk-tag low">Check this</span>}
   <button className="icon-button mk-x" aria-label={`Remove ${g.name}`} onClick={onRemove}><X size={15}/></button></header>
  <h3>{g.name}</h3>{g.who&&<p className="mk-who">{g.who}</p>}
  {g.pains.length>0&&<div className="mk-row"><span>Their problems</span><ul>{g.pains.slice(0,3).map(p=><li key={p}>{p}</li>)}</ul></div>}
  {g.searches.length>0&&<div className="mk-row"><span>What they search</span><div className="mk-searches">{g.searches.slice(0,4).map(s=><span key={s} className="kw kw-sm muted"><Search size={11}/>{s}</span>)}</div></div>}
  {(g.evidence.length>0||g.roles.length>0||g.compares.length>0)&&<>
   <button className="link-btn mk-more" aria-expanded={open} onClick={()=>setOpen(o=>!o)}><ChevronDown size={14} className={open?'turned':''}/>{open?'Less':'More about them'}</button>
   <AnimatePresence initial={false}>{open&&<motion.div className="mk-group-more" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.2,ease}}>
    {g.roles.length>0&&<p><b>Who decides:</b> {g.roles.join(', ')}</p>}
    {g.triggers.length>0&&<p><b>What makes them look:</b> {g.triggers.join('; ')}</p>}
    {g.compares.length>0&&<p><b>What they compare:</b> {g.compares.join(', ')}</p>}
    {g.objections.length>0&&<p><b>Why they hesitate:</b> {g.objections.join('; ')}</p>}
    <p><b>How much they know:</b> {knowledgeLabel[g.knowledge]}</p>
    {g.evidence.length>0&&<ul className="mk-evidence">{g.evidence.map((e,i)=><li key={i}>“{e.quote}”<small>{e.from==='you'?company:e.from}{e.page!=='/'?e.page:''}</small></li>)}</ul>}
   </motion.div>}</AnimatePresence>
  </>}
 </motion.article>;
}

export function GroupsEditor({m,bare}:{m:Market;bare?:boolean}){
 const ws=useWorkspace(),{state,save,findGroups}=m,job=state?.jobs.groups,list=state?.groups||[];
 const kept=list.filter(g=>g.status==='kept'),removed=list.filter(g=>g.status==='removed'),[name,setName]=useState('');
 const mine=kept.filter(g=>g.served==='yours'),market=kept.filter(g=>g.served==='market');
 const set=(id:string,status:BuyerGroup['status'])=>save({groups:list.map(g=>g.id===id?{...g,status}:g)});
 const add=()=>{const n=name.trim();if(!n)return;setName('');
  save({groups:[...list,{id:`u${Date.now().toString(36)}`,name:n,who:'',companyType:'',size:'',roles:[],pains:[],triggers:[],searches:[],compares:[],objections:[],knowledge:'familiar',served:'yours',companies:['you'],evidence:[],confidence:'high',added:'you',status:'kept'}]});};
 const competitors=state?.competitors.filter(c=>c.status==='kept').length||0;
 return <section className="mk-section" aria-labelledby="mk-groups">
  <header className="mk-head"><div>{!bare&&<><h2 id="mk-groups">Who buys in your market</h2><p className="muted">Read from your website and your competitors’. Each article is written for one of these groups: their problems, their words, what they compare.</p></>}</div>
   {!job?.running&&list.length>0&&<button className="button ghost compact" onClick={findGroups}><RefreshCw size={14}/>Work it out again</button>}</header>
  {job?.running&&<Working job={job} title={`Reading your site and ${competitors} competitor${competitors===1?'':'s'}`}/>}
  {job?.error&&!job.running&&<ProblemCard problem={{title:'Couldn’t work out who buys',fix:'Try again. If it keeps happening, check the writing model is set up in .env.',details:job.error,retry:findGroups}}/>}
  {!job?.running&&!list.length&&<div className="mk-start"><p>{competitors?`We’ll read your website and your ${competitors} competitor${competitors===1?'':'s'}’ websites to see who buys in your market.`:'Add a few competitors first. Their websites show who else buys in your market.'}</p>
   <button className="button primary" disabled={!competitors} onClick={findGroups}>Work out who buys <ArrowRight size={16}/></button></div>}
  {mine.length>0&&<div className="mk-groups"><AnimatePresence initial={false}>{mine.map(g=><GroupCard key={g.id} g={g} company={ws.name} onRemove={()=>set(g.id,'removed')}/>)}</AnimatePresence></div>}
  {market.length>0&&<><p className="mk-note"><b>Others in your market</b> Buyers your competitors go after. Articles use what they share with your buyers, and never claim you serve them. Some may be worth writing for.</p>
   <div className="mk-groups"><AnimatePresence initial={false}>{market.map(g=><GroupCard key={g.id} g={g} company={ws.name} onRemove={()=>set(g.id,'removed')}/>)}</AnimatePresence></div></>}
  {(list.length>0||!job?.running)&&<form className="mk-add" onSubmit={e=>{e.preventDefault();add();}}><Plus size={16}/><input aria-label="Add a group of buyers" placeholder="Add a group you sell to, like “Agencies managing many clients”" value={name} onChange={e=>setName(e.target.value)}/><button className="button secondary compact" disabled={!name.trim()}>Add</button></form>}
  {removed.length>0&&<p className="mk-removed muted">Removed: {removed.map((g,i)=><span key={g.id}>{i>0&&', '}{g.name} <button className="link-btn" onClick={()=>set(g.id,'kept')}><Undo2 size={12}/>Undo</button></span>)}</p>}
 </section>;
}

// Step 4 of setup: confirm competitors, then see who buys. Both can be changed later on the Company brief page.
export function MarketSetup({onDone}:{onDone:()=>void}){
 const m=useMarket(),[part,setPart]=useState<'competitors'|'groups'>('competitors'),top=useRef<HTMLDivElement>(null);
 const kept=m.state?.competitors.filter(c=>c.status==='kept').length||0;
 const toGroups=()=>{setPart('groups');top.current?.scrollIntoView({behavior:'smooth'});if(!m.state?.groups.length&&kept)m.findGroups();};
 return <div className="brief mk-setup" ref={top}>
  <div className="brief-head"><div><span className="eyebrow">Step 4 of 4</span><h1>{part==='competitors'?'Your competitors':'Who buys in your market'}</h1>
   <p className="lead">{part==='competitors'?'We looked at who ranks for what you do, lists of tools in your space, and the companies your site compares itself with. Keep the right ones and add any we missed.':'Read from your website and your competitors’. Every article is written for one of these groups, so it speaks to their problems in their words.'}</p></div>
   <div className="mk-setup-actions">
    {part==='competitors'?<button className="button primary xl" disabled={!!m.state?.jobs.competitors?.running&&!kept} onClick={toGroups}>Next: who buys <ArrowRight size={18}/></button>
     :<button className="button primary xl" disabled={!!m.state?.jobs.groups?.running} onClick={onDone}>Open my workspace <ArrowRight size={18}/></button>}
    <button className="button ghost" onClick={part==='groups'?()=>setPart('competitors'):onDone}>{part==='groups'?'Back to competitors':'Skip for now'}</button>
   </div></div>
  {m.error&&<ProblemCard problem={{title:'Couldn’t load your market',fix:'Make sure the Comarketer server is running, then try again.',details:m.error,retry:m.reload}}/>}
  <AnimatePresence mode="wait"><motion.div key={part} initial={{opacity:0,x:part==='groups'?24:-24}} animate={{opacity:1,x:0}} exit={{opacity:0}} transition={{duration:.3,ease}}>
   {part==='competitors'?<CompetitorsEditor m={m} bare/>:<GroupsEditor m={m} bare/>}
  </motion.div></AnimatePresence>
 </div>;
}

// The Company brief page: both, one under the other.
export function MarketView(){
 const m=useMarket();
 if(!m.state&&!m.error)return <p className="muted"><LoaderCircle className="spin" size={14}/> Loading your market…</p>;
 return <div className="mk-view">
  {m.error&&<ProblemCard problem={{title:'Couldn’t load your market',fix:'Make sure the Comarketer server is running, then try again.',details:m.error,retry:m.reload}}/>}
  <CompetitorsEditor m={m}/><GroupsEditor m={m}/>
  {m.state&&!m.busy&&<p className="mk-saved muted"><Check size={13}/>Saved. Every new article uses this.</p>}
 </div>;
}
