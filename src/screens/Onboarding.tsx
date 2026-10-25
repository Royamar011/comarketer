import {useEffect,useRef,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {ArrowRight,Check,Lock} from 'lucide-react';
import {BrandIntro,Logo} from '../components/brand';
import {Ring,Ticker,WorkList,ease,spring} from '../components/ui';
import {firstLine,parse} from '../content/context';
import {setCompany} from '../workspace';
import {BriefView} from '../components/brief';
import {MarketSetup} from '../components/market';

export type ObStart='welcome'|'website'|'research';
type Stage=ObStart|'review'|'competitors'|'icps';
const steps:[Stage,string][]=[['website','Website'],['research','Research'],['review','Brief'],['competitors','Competitors'],['icps','ICPs']];
const at=(s:Stage)=>steps.findIndex(x=>x[0]===s);

// Five steps on one thin track. The blue line grows toward the current step, finished steps draw a tick,
// and a small marker glides under the step you are on.
function SetupSteps({now}:{now:number}){
 return <nav className="ob-progress" aria-label="Setup progress">
  <ol>{steps.map(([id,label],i)=>{const state=i<now?'done':i===now?'now':'later';return <li key={id} className={state} aria-current={state==='now'?'step':undefined}>
   <span className="ob-num" aria-hidden="true">{state==='done'?<svg viewBox="0 0 16 16"><motion.path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:.4,delay:.15,ease}}/></svg>:String(i+1).padStart(2,'0')}</span>
   <span className="ob-label">{label}</span>
   {state==='now'&&<motion.i layoutId="ob-marker" className="ob-marker" transition={spring}/>}
  </li>;})}</ol>
  <div className="ob-track" aria-hidden="true"><motion.i className="ob-fill" initial={false} animate={{scaleX:(now+.5)/steps.length}} transition={{type:'spring',stiffness:110,damping:20}}/></div>
  <p className="ob-step-mobile">Step {now+1} of {steps.length} · {steps[now]?.[1]}</p>
 </nav>;
}
// Moving forward, the next page comes in from the right; going back, from the left.
const stageMotion={
 enter:(d:number)=>({opacity:0,x:d*56}),
 center:{opacity:1,x:0,transition:{duration:.55,ease},transitionEnd:{transform:'none'}},
 exit:(d:number)=>({opacity:0,x:d*-36,transition:{duration:.22,ease:'easeIn' as const}}),
};

export function Onboarding({onFinish,onExit,start='welcome',initialDomain=''}:{onFinish:()=>void;onExit?:()=>void;start?:ObStart;initialDomain?:string}){
 const [stage,setRaw]=useState<Stage>(start),[domain,setDomain]=useState(initialDomain),dir=useRef(1);
 const setStage=(s:Stage)=>{dir.current=at(s)>=at(stage)?1:-1;setRaw(s);window.scrollTo({top:0,behavior:'smooth'});};
 return <div className="onboarding">
  {stage!=='welcome'&&<header className="ob-top"><Logo/><SetupSteps now={at(stage)}/>{start!=='welcome'&&onExit?<button className="button ghost compact" onClick={onExit}>Back to workspace</button>:<span className="preview-chip">Design preview</span>}</header>}
  <AnimatePresence mode="wait" custom={dir.current}>
   <motion.main key={stage} className={`ob-stage ob-${stage}`} custom={dir.current} variants={stageMotion} initial="enter" animate="center" exit="exit">

    {stage==='welcome'&&<div className="welcome">
     <BrandIntro/>
     <motion.div className="welcome-copy" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:3.2,duration:.6,ease}}>
      <h1>Articles that rank, get cited, and sound like&nbsp;you.</h1>
      <p>Original, publish-ready articles that win search and AI answers, without briefing a writer.</p>
      <button className="button primary xl" onClick={()=>setStage('website')}>Set up my workspace <ArrowRight size={18}/></button>
      <small>Takes about two minutes</small>
     </motion.div>
    </div>}

    {stage==='website'&&<div className="ob-center">
     <span className="eyebrow">Step 1 of 5</span>
     <h1>Start with your website</h1>
     <p className="lead">It is all we need. Every article will know your products, your customers and what makes you different.</p>
     <form className="domain-bar" onSubmit={e=>{e.preventDefault();if(domain.trim())setStage('research');}}>
      <span className="domain-prefix">https://</span>
      <input autoFocus aria-label="Company website" placeholder="yourcompany.com" value={domain} onChange={e=>setDomain(e.target.value)}/>
      <button className="button primary" disabled={!domain.trim()}>Continue <ArrowRight size={17}/></button>
     </form>
     <p className="reassure"><Lock size={14}/>Nothing to install. No logins.</p>
    </div>}

    {stage==='research'&&<Learning domain={domain} onDone={()=>setStage('review')} onBack={()=>setStage('website')}/>}

    {stage==='review'&&<Brief onConfirm={()=>setStage('competitors')}/>}

    {stage==='competitors'&&<MarketSetup part="competitors" step={4} of={steps.length} onNext={()=>setStage('icps')} onSkip={onFinish}/>}

    {stage==='icps'&&<MarketSetup part="icps" step={5} of={steps.length} onBack={()=>setStage('competitors')} onNext={onFinish}/>}

   </motion.main>
  </AnimatePresence>
 </div>;
}

// What was found streams in on the left as each page is read; the brief writes itself on the right.
type Ev={t:string;[k:string]:any};
// Reads the website for real (server/research.ts) and writes the brief as the model streams it.
function Learning({domain,onDone,onBack}:{domain:string;onDone:()=>void;onBack:()=>void}){
 const host=domain.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'');
 const [run,setRun]=useState(0),[groups,setGroups]=useState<{group:string;total:number}[]>([]),[reading,setReading]=useState(1),[pages,setPages]=useState(0),[now,setNow]=useState<{url:string;group:string}|null>(null);
 const [line,setLine]=useState('Opening the website'),[parts,setParts]=useState({a:'',b:''}),[phase,setPhase]=useState<'read'|'write'|'done'|'error'>('read'),[err,setErr]=useState(''),[meta,setMeta]=useState<{name:string;logo:string}|null>(null);
 useEffect(()=>{
  setGroups([]);setPages(0);setNow(null);setParts({a:'',b:''});setPhase('read');setErr('');setLine('Opening the website');
  let es:EventSource|null=null,finished=false;
  // Started a moment later so a double mount in development never runs the research twice.
  const t=setTimeout(()=>{es=new EventSource(`/api/research?domain=${encodeURIComponent(host)}`);es.onmessage=onMsg;es.onerror=()=>{if(!finished){es?.close();setErr('The research server stopped responding. Make sure the dev server is running.');setPhase('error');}};},60);
  const onMsg=(m:MessageEvent)=>{const e:Ev=JSON.parse(m.data);
   if(e.t==='sitemap')setLine(e.url?`Found the sitemap: ${e.count} pages listed`:'No sitemap, following the site navigation');
   if(e.t==='plan'){setGroups(e.groups);setReading(e.reading);}
   if(e.t==='page'){setPages(e.n);setNow({url:e.url,group:e.group});}
   if(e.t==='saved')setLine(`${e.count} pages saved in full`);
   if(e.t==='writing'){setPhase('write');setLine('Writing your brief from the saved pages');}
   if(e.t==='wait')setLine(`Waiting ${e.seconds}s for the writing model`);
   if(e.t==='md')setParts(p=>({...p,[e.part]:e.text}));
   if(e.t==='done'){finished=true;es?.close();setMeta({name:e.name,logo:e.logo});setPhase('done');setLine('Your brief is ready');
    setCompany({domain:e.domain,name:e.name,logo:e.logo,md:e.md,saved:e.saved,groups:e.groups});setTimeout(onDone,1200);}
   if(e.t==='error'){finished=true;es?.close();setErr(e.message);setPhase('error');}
  };
  return()=>{clearTimeout(t);es?.close();};
 },[run]);
 const sections=parse(`${parts.a}\n${parts.b}`).filter(x=>x.blocks.length),labels=[...groups.map(g=>g.group),'Writing your brief'];
 const groupAt=phase==='read'?Math.max(0,groups.findIndex(g=>g.group===now?.group)):phase==='write'?groups.length:labels.length;
 const progress=phase==='done'?1:phase==='write'?.7+Math.min(.28,(parts.a.length+parts.b.length)/14000*.28):Math.min(.68,.08+pages/Math.max(reading,1)*.6);
 if(phase==='error')return <div className="ob-center learn-error">
  <span className="eyebrow">Step 2 of 5</span><h1>We could not read {host}</h1><p className="lead">{err}</p>
  <div className="err-actions"><button className="button primary" onClick={()=>setRun(r=>r+1)}>Try again</button><button className="button ghost" onClick={onBack}>Use a different website</button></div>
 </div>;
 return <div className="learning">
  <section className="learn-left">
   <span className="eyebrow">Step 2 of 5</span>
   <h1>Your brief for <span className="host">{host}</span></h1>
   <div className="learn-meter"><Ring value={progress}/><div><strong>{phase==='read'?<><Ticker value={pages}/> pages read and saved</>:phase==='write'?'Writing your brief':'Your brief is ready'}</strong><span className="mono reading">{phase==='read'&&now?`Reading ${new URL(now.url).host}${new URL(now.url).pathname}`:line}</span></div></div>
   {groups.length?<WorkList steps={labels} at={groupAt}/>:<div className="doc-placeholder"><span/><span/><span/></div>}
   <div className="found"><span className="eyebrow">Written so far</span>
    <ul><AnimatePresence initial={false}>{sections.slice().reverse().map(x=><motion.li key={x.id} layout initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{duration:.35,ease}}><strong className="found-done"><Check size={15}/>{x.title}</strong></motion.li>)}</AnimatePresence></ul>
   </div>
  </section>
  <section className="doc-sheet" aria-label="Your brief, being written">
   <div className="doc-bar"><span>context.md</span><span className="mono">{sections.length} sections</span></div>
   <div className="doc-body">
    <h2 className="doc-company">{meta?.logo&&<img src={meta.logo} alt="" width={28} height={28}/>}{meta?.name||host}</h2>
    {sections.map((x,i)=><motion.div key={x.id} className="doc-section" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.4,ease}}>
     <h3>{x.title}</h3><p>{firstLine(x).slice(0,170)}{i===sections.length-1&&phase==='write'&&<span className="cursor"/>}</p>
    </motion.div>)}
    {phase!=='done'&&<div className="doc-placeholder"><span/><span/><span/></div>}
   </div>
  </section>
 </div>;
}

function Brief({onConfirm}:{onConfirm:()=>void}){
 return <div className="brief">
  <div className="brief-head"><div><span className="eyebrow">Step 3 of 5</span><h1>Your company brief is ready</h1><p className="lead">Read it once and fix anything that is wrong. Every article is written from it.</p></div><button className="button primary xl" onClick={onConfirm}>Looks right, continue <ArrowRight size={18}/></button></div>
  <BriefView animate/>
 </div>;
}
