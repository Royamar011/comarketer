import {createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {ArrowRight,BookOpen,Columns2,Lightbulb,ListOrdered,Shuffle,Brain,Check,Copy,Download,ExternalLink,FileText,Globe,ImageIcon,Layers,ListChecks,Sparkles,User,UsersRound,X,PenLine} from 'lucide-react';
import {Keyword,Nudge,OurPick,Ring,Ticker,TypeStream,WorkList,ease,spring,useSteps} from '../components/ui';
import {ArticleBody} from '../components/article';
import {PublishPanel} from '../components/publish';
import {copyFormatted,useArticle} from '../article-data';
import {Tick,stepIcons} from '../components/steps';
import {Making,type MakeKind} from '../components/making';
import {blogTypesFor,suggestType,voicesFor,workflowSteps,type BlogType,type Voice} from '../data';
import {makeSample,slugify,type Sample} from '../sample';
import {saveArticle,useWorkspace,type Workspace} from '../workspace';
type Phase='start'|'type'|'scan'|'angle'|'title'|'research'|'structure'|'voice'|'writing'|'ready';
const order:Phase[]=['start','type','scan','angle','title','research','structure','voice','writing','ready'];
type Ctx={S:Sample;voices:ReturnType<typeof voicesFor>;ws:Workspace;blogTypes:ReturnType<typeof blogTypesFor>};
const StepCtx=createContext<Ctx|null>(null),useCtx=()=>useContext(StepCtx)!;

export function Workflow({initialKeyword,defaultVoice,onExit,onToast}:{initialKeyword:string;defaultVoice:Voice;onExit:()=>void;onToast:(t:string)=>void}){
 const [phase,setPhase]=useState<Phase>(initialKeyword?'type':'start'),[keyword,setKeyword]=useState(initialKeyword),[voice,setVoice]=useState<Voice>(defaultVoice);
 const [btype,setBtype]=useState<BlogType>(suggestType(initialKeyword)),[answers,setAnswers]=useState<Record<string,string>>({}),[angle,setAngle]=useState<string|null>(null),[title,setTitle]=useState<string|null>(null),[outline,setOutline]=useState('framework'),[memory,setMemory]=useState<string[]>([]),[memoryOpen,setMemoryOpen]=useState(false),[reached,setReached]=useState(0);
 const ws=useWorkspace(),S=useMemo(()=>makeSample(keyword,ws.name,ws.domain),[keyword,ws.name,ws.domain]),voices=voicesFor(ws.name),blogTypes=blogTypesFor(keyword,ws.name),ctx={S,voices,ws,blogTypes};
 const made=useRef(new Set<string>()),dir=useRef(1),artId=useRef(`a${Date.now()}`);
 const remember=(items:string[])=>setMemory(m=>[...m,...items.filter(i=>!m.includes(i))]);
 const go=(p:Phase)=>{dir.current=order.indexOf(p)>=order.indexOf(phase)?1:-1;setPhase(p);setReached(r=>Math.max(r,order.indexOf(p)));document.querySelector('.studio-main')?.scrollTo({top:0});window.scrollTo({top:0,behavior:'smooth'});};
 const typeObj=blogTypes.find(t=>t.id===btype)!,idx=order.indexOf(phase),angleObj=S.angles.find(a=>a.id===angle),outlineObj=S.outlines.find(o=>o.id===outline);
 // Finishing a step gets its own moment: a tick draws, then the next step is named.
 const stepNo=phase==='ready'?5:phase==='research'?2:phase==='structure'?3:['voice','writing'].includes(phase)?4:1,prevStep=useRef(stepNo),[banner,setBanner]=useState<number|null>(null);
 useEffect(()=>{if(stepNo>prevStep.current){setBanner(prevStep.current);const t=setTimeout(()=>setBanner(null),2600);prevStep.current=stepNo;return()=>clearTimeout(t);}prevStep.current=stepNo;},[stepNo]);
 // Every blog started here appears in Home and the content library, and shows where it stands.
 useEffect(()=>{if(phase==='start'||phase==='type')return;
  const base={id:artId.current,keyword,title:title||S.K};
  const by:Record<string,object>={scan:{step:1,waiting:'us',next:'Checking the top results'},angle:{step:1,waiting:'you',next:'Pick an idea'},title:{step:1,waiting:'you',next:'Pick a title'},research:{step:2,waiting:'us',next:'Research in progress'},structure:{step:3,waiting:'you',next:'Pick a blog structure'},voice:{step:4,waiting:'you',next:'Choose who is writing'},writing:{step:4,waiting:'us',next:'Draft in progress'},
   ready:{status:'Ready',step:undefined,waiting:undefined,next:undefined,voice,words:1980,quality:96,sources:S.research.length,images:S.images.length,slug:slugify(title||S.K)}};
  saveArticle({...base,status:'In progress',...by[phase]});
 },[phase,title]);
 const steps=[
  {n:1,label:'Plan',phases:['type','scan','angle','title'] as Phase[],picks:[idx>1?typeObj.name:null,angleObj&&idx>3?angleObj.type:null,title&&idx>4?title:null]},
  {n:2,label:'Research',phases:['research'] as Phase[],picks:[idx>5?`${S.research.length} findings, sources saved in full`:null]},
  {n:3,label:'Blog structure',phases:['structure'] as Phase[],picks:[idx>6&&outlineObj?outlineObj.name:null]},
  {n:4,label:'Draft',phases:['voice','writing','ready'] as Phase[],picks:[idx>7?`By ${voices[voice].name.toLowerCase()}`:null,idx>8?'Ready to publish':null]},
 ];
 if(phase==='start')return <Start keyword={keyword} setKeyword={setKeyword} voice={voice} setVoice={setVoice} onStart={()=>{setBtype(suggestType(keyword));go('type');}}/>;
 return <StepCtx.Provider value={ctx}><div className="studio">
  <aside className="studio-rail">
   <div className="rail-kw"><span className="eyebrow">Keyword</span><Keyword size="md">{keyword}</Keyword></div>
   <ol className="rail-steps">{steps.map(s=>{const first=order.indexOf(s.phases[0]),state=s.phases.includes(phase)?'now':idx>order.indexOf(s.phases[s.phases.length-1])?'done':'';return <li key={s.n} className={state}>
    <button disabled={first>reached||phase==='writing'} onClick={()=>go(s.n===1?(reached>=3?'angle':'type'):s.phases[0])}><span className="rail-mark">{state==='done'?<Tick size={13}/>:(()=>{const Icon=stepIcons[s.n-1];return <Icon size={14} strokeWidth={2.2}/>;})()}{state==='now'&&<motion.i className="rail-ring" animate={{scale:[1,1.5],opacity:[.45,0]}} transition={{duration:1.8,repeat:Infinity,ease:'easeOut'}}/>}</span><span>{s.label}</span></button>
    <AnimatePresence>{s.picks.filter(Boolean).map(p=><motion.p key={p} className="rail-pick" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} transition={{duration:.3,ease}}>{p}</motion.p>)}</AnimatePresence>
   </li>;})}</ol>
   <button className={`rail-memory ${memory.length?'has':''}`} onClick={()=>setMemoryOpen(true)}><Brain size={16}/><span>Saved notes</span><motion.b key={memory.length} initial={{scale:1.35}} animate={{scale:1}} transition={spring}>{memory.length}</motion.b></button>
   <p className="rail-note">Search is not connected yet, so top results and research findings are samples.</p>
  </aside>
  <div className="studio-main">
   <AnimatePresence>{banner&&<motion.div className="step-done" role="status" initial={{opacity:0,y:-14,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-10}} transition={{duration:.4,ease}}>
    <span className="step-done-tick"><Tick size={18} delay={.15}/></span><strong>{workflowSteps[banner-1]} done</strong>
    <motion.span className="step-done-next" initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:.45,duration:.35,ease}}><ArrowRight size={15}/>{banner<4?<>Next: {workflowSteps[banner]}</>:'Ready to publish'}</motion.span>
    <motion.i className="step-done-bar" initial={{scaleX:1}} animate={{scaleX:0}} transition={{duration:2.6,ease:'linear'}}/>
   </motion.div>}</AnimatePresence>
   <AnimatePresence mode="wait">
    <motion.div key={phase} custom={dir.current} variants={slide} initial="enter" animate="center" exit="exit">
     {phase==='type'&&<TypeStep keyword={keyword} btype={btype} setBtype={setBtype} answers={answers} setAnswers={setAnswers} onNext={()=>{remember([`Blog type: ${typeObj.name}`]);go('scan');}}/>}
     {phase==='scan'&&<Scan keyword={keyword} onDone={()=>{remember(['Related searches and questions','Top 5 results on Google','What each one covers','3 things they missed']);go('angle');}}/>}
     {phase==='angle'&&<Gen id="angle" kind="ideas" seeds={['Benchmarks','Tested side by side','Retail and Amazon']} made={made}><Angle keyword={keyword} angle={angle} setAngle={setAngle} onNext={()=>{remember([`Plan: ${angleObj?.type}`]);setTitle(null);go('title');}}/></Gen>}
     {phase==='title'&&angle&&<Gen id={`title-${angle}`} kind="titles" made={made}><Title angle={angle} title={title} setTitle={setTitle} onNext={()=>{remember([`Title: ${title}`]);go('research');}}/></Gen>}
     {phase==='research'&&<Research onItem={t=>remember([t])} onNext={()=>go('structure')}/>}
     {phase==='structure'&&<Gen id="structure" kind="structure" made={made}><Structure outline={outline} setOutline={setOutline} onNext={()=>{remember([`Blog structure: ${outlineObj?.name}`]);go('voice');}}/></Gen>}
     {phase==='voice'&&<VoiceStep voice={voice} setVoice={setVoice} onNext={()=>{remember([`Voice: ${voices[voice].name}`]);go('writing');}}/>}
     {phase==='writing'&&<Writing title={title||''} onDone={()=>{remember(['Full draft','4 images with alt text','SEO title, meta and slug','FAQ schema']);go('ready');}}/>}
     {phase==='ready'&&<Ready title={title||''} voice={voice} onToast={onToast} onExit={onExit}/>}
    </motion.div>
   </AnimatePresence>
  </div>
  <AnimatePresence>{memoryOpen&&<Memory items={memory} keyword={keyword} voice={voice} onClose={()=>setMemoryOpen(false)}/>}</AnimatePresence>
 </div></StepCtx.Provider>;
}

// Forward moves slide in from the right, going back slides in from the left.
const slide={enter:(d:number)=>({opacity:0,x:d*28}),center:{opacity:1,x:0,transition:{duration:.4,ease}},exit:(d:number)=>({opacity:0,x:d*-20,transition:{duration:.18}})};

// The first time a set of choices is made, show it being built; afterwards show the choices straight away.
function Gen({id,kind,seeds,made,children}:{id:string;kind:MakeKind;seeds?:string[];made:{current:Set<string>};children:React.ReactNode}){
 const [ready,setReady]=useState(made.current.has(id));
 return <AnimatePresence mode="wait">{ready?<motion.div key="ready" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.3}}>{children}</motion.div>:<Making key="making" kind={kind} seeds={seeds} onDone={()=>{made.current.add(id);setReady(true);}}/>}</AnimatePresence>;
}

function Start({keyword,setKeyword,voice,setVoice,onStart}:{keyword:string;setKeyword:(v:string)=>void;voice:Voice;setVoice:(v:Voice)=>void;onStart:()=>void}){
 return <div className="start">
  <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.45,ease}}>
   <span className="eyebrow">New blog</span>
   <h1>What do you want to write about?</h1>
   <p className="lead">Type the keyword your customers search on Google. You get a blog written to beat the pages already ranking.</p>
  </motion.div>
  <motion.form className="composer" onSubmit={e=>{e.preventDefault();if(keyword.trim())onStart();}} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.08,duration:.45,ease}}>
   <div className="composer-input"><span className="composer-glyph"><Sparkles size={18}/></span><input autoFocus aria-label="Keyword" placeholder="Type the keyword you want to rank for" value={keyword} onChange={e=>setKeyword(e.target.value)}/></div>
   <div className="composer-foot">
    <span className="composer-hint">Next, you pick the idea for your blog.</span>
    <button className="button primary" disabled={!keyword.trim()}>Start <ArrowRight size={17}/></button>
   </div>
  </motion.form>
 </div>;
}

function Head({eyebrow,title,sub,keyword}:{eyebrow:string;title:string;sub?:string;keyword?:string}){
 return <header className="phase-head"><span className="eyebrow">{eyebrow}</span><h1>{title}{keyword&&<> <Keyword size="lg">{keyword}</Keyword></>}</h1>{sub&&<p className="lead">{sub}</p>}</header>;
}

function Scan({keyword,onDone}:{keyword:string;onDone:()=>void}){
 const {S,voices,ws,blogTypes}=useCtx();
 const at=useSteps(S.scanSteps.length,1150,()=>setTimeout(onDone,700)),shown=at<1?0:Math.min(S.serp.length,(at-1)*2+1);
 return <>
  <Head eyebrow="Step 1 · Plan" title="Top results for" keyword={keyword}/>
  <div className="scan">
   <div className="scan-status"><Ring value={at/S.scanSteps.length} size={52}/><div><strong>{at<S.scanSteps.length?S.scanSteps[Math.min(at,S.scanSteps.length-1)]:'Done'}</strong><span className="muted"><Ticker value={shown}/> top results · <Ticker value={at>=1?S.relatedKeywords.length:0}/> related searches</span></div></div>
   <AnimatePresence>{at>=1&&<motion.div className="related" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} transition={{duration:.4,ease}}><span className="eyebrow">Related keywords</span><div>{S.relatedKeywords.map((k,i)=><motion.span key={k} initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{delay:i*.06}}><Keyword size="sm" muted>{k}</Keyword></motion.span>)}</div></motion.div>}</AnimatePresence>
   <ol className="results">{S.serp.slice(0,shown).map(r=><motion.li key={r.pos} layout initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.4,ease}}>
    <span className="result-pos">{r.pos}</span>
    <div className="result-body"><span className="mono">{r.domain}</span><strong>{r.title}</strong>
     {at>=3&&<motion.div className="result-why" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}><span>Why it ranks</span>{r.why.map(w=><b key={w}>{w}</b>)}</motion.div>}
     {at>=3&&<motion.div className="result-tags" initial={{opacity:0}} animate={{opacity:1}}>{r.covers.map(c=><span key={c} className="tag-cover"><Check size={11}/>{c}</span>)}{at>=4&&r.misses.map(c=><motion.span key={c} className="tag-miss" initial={{opacity:0,scale:.92}} animate={{opacity:1,scale:1}} transition={spring}>Missing: {c}</motion.span>)}</motion.div>}
    </div>
    <span className="result-type">{r.type}</span>
   </motion.li>)}</ol>
  </div>
 </>;
}

function Angle({keyword,angle,setAngle,onNext}:{keyword:string;angle:string|null;setAngle:(a:string)=>void;onNext:()=>void}){
 const {S,voices,ws,blogTypes}=useCtx();
 return <>
  <Head eyebrow="Step 1 · Plan" title="Pick an idea for your blog" sub="Each idea covers something the top results missed, so your blog stands out."/>
  <section className="does-well"><span className="eyebrow">What the top results do well</span><div className="does-well-row"><div><strong>Every top result covers</strong><ul>{S.patterns.sections.map(x=><li key={x}><Check size={13}/>{x}</li>)}</ul></div><div><strong>Typical length</strong><p>{S.patterns.length}</p><strong>Common formats</strong><p>{S.patterns.formats.join(', ')}</p></div></div><p className="muted">Your blog covers all of this too, then goes further.</p></section>
  <section className="openings"><span className="eyebrow">What the top results missed</span><ol>{S.gaps.map((g,i)=><motion.li key={g} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:.1+i*.08,ease}}><span className="opening-n">{i+1}</span>{g}</motion.li>)}</ol></section>
  <div className="angles" role="radiogroup" aria-label="Idea">{S.angles.map((a,i)=>{const on=angle===a.id;return <motion.button key={a.id} role="radio" aria-checked={on} className={`angle ${on?'selected':''}`} onClick={()=>setAngle(a.id)} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:.15+i*.08,duration:.45,ease}}>
   <div className="angle-top"><span className="angle-type">{a.type}</span><span className="radio">{on&&<motion.span initial={{scale:0}} animate={{scale:1}} transition={spring}><Check size={13} strokeWidth={3}/></motion.span>}</span></div>{a.recommended&&<OurPick/>}
   <h3>{a.title}</h3>
   <p className="angle-gap">{a.gap}</p>
   <div className="coverage"><div className="coverage-bar">{S.serp.map((_,j)=><i key={j} className={j<a.covered?'on':''}/>)}</div><span>{a.covered===0?'No top result does this':`${a.covered} of ${S.serp.length} top results try this`}</span></div>
   <p className="angle-why">{a.why}</p>
  </motion.button>;})}</div>
  {angle&&S.angles.find(a=>a.id===angle)?.recommended?<Nudge tone="pick">Great pick. No top result covers this for <Keyword size="sm">{keyword}</Keyword>, and it is a natural fit for {ws.name}.</Nudge>:angle?<Nudge>Good choice. You can come back and change it any time before writing.</Nudge>:<Nudge>We suggest the step-by-step idea. None of the top results shows what good looks like.</Nudge>}
  <Next disabled={!angle} label="Next: pick a title" onNext={onNext}/>
 </>;
}

function Title({angle,title,setTitle,onNext}:{angle:string;title:string|null;setTitle:(t:string)=>void;onNext:()=>void}){
 const {S,voices,ws,blogTypes}=useCtx();
 return <>
  <Head eyebrow="Step 1 · Plan" title="Pick a title" sub="Five different styles. Pick the one you like. You can change the words later."/>
  <div className="headlines" role="radiogroup" aria-label="Title">{S.titles(S.angles.find(a=>a.id===angle)!).map((t,i)=>{const on=title===t.text;return <motion.button key={t.text} role="radio" aria-checked={on} className={`headline ${on?'selected':''}`} onClick={()=>setTitle(t.text)} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*.06,duration:.4,ease}}>
   <span className="headline-style">{t.style}</span><strong>{t.text}</strong><span className="headline-meta">{t.recommended&&<OurPick/>}<span className="mono">{t.text.length} chars</span></span><span className="radio">{on&&<motion.span initial={{scale:0}} animate={{scale:1}} transition={spring}><Check size={13} strokeWidth={3}/></motion.span>}</span>
  </motion.button>;})}</div>
  <Next disabled={!title} label="Next: start research" onNext={onNext}/>
 </>;
}

function Research({onItem,onNext}:{onItem:(t:string)=>void;onNext:()=>void}){
 const {S,voices,ws,blogTypes}=useCtx();
 const [open,setOpen]=useState<Sample['research'][number]|null>(null);
 const at=useSteps(S.researchSteps.length,1000),shown=Math.min(S.research.length,at+1),done=at>=S.researchSteps.length;
 useEffect(()=>{if(shown>0)onItem(`${S.research[shown-1].kind}: ${S.research[shown-1].text.slice(0,52)}…`);},[shown]);
 const kinds=[...new Set(S.research.map(r=>r.kind))];
 return <>
  <Head eyebrow="Step 2 · Research" title={done?'Research done':'Research for your blog'} sub="Stats, sources and the questions people really ask, so everything in your blog is true."/>
  <div className="research-wrap">
   <div className="research-status"><Ring value={at/S.researchSteps.length} size={52}/><div><strong>{done?'Every fact has a source':S.researchSteps[Math.min(at,S.researchSteps.length-1)]}</strong><span className="muted"><Ticker value={shown}/> facts · <Ticker value={new Set(S.research.slice(0,shown).map(r=>r.source)).size}/> sources</span></div></div>
   <div className="kind-counts">{kinds.map(k=>{const n=S.research.slice(0,shown).filter(r=>r.kind===k).length;return <span key={k} className={n?'on':''}>{k}<b><Ticker value={n}/></b></span>;})}</div>
   <div className="notebook"><AnimatePresence initial={false}>{S.research.slice(0,shown).map(r=><motion.article key={r.text} layout className={`finding k-${r.kind.split(' ')[0].toLowerCase()}`} initial={{opacity:0,y:-14,scale:.98}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.4,ease}}>
    <span className="finding-kind">{r.kind}</span><p>{r.text}</p><button className="finding-src link" onClick={()=>setOpen(r)}><FileText size={11}/>{r.source} · view saved page</button>{r.note&&<span className="finding-note">{r.note}</span>}
   </motion.article>)}</AnimatePresence></div>
  </div>
  <AnimatePresence>{open&&<SourceViewer item={open} onClose={()=>setOpen(null)}/>}</AnimatePresence>
  {done&&<Next label="Next: pick a blog structure" onNext={onNext}/>}
 </>;
}

function Structure({outline,setOutline,onNext}:{outline:string;setOutline:(o:string)=>void;onNext:()=>void}){
 const {S,voices,ws,blogTypes}=useCtx();
 const o=S.outlines.find(x=>x.id===outline)!;
 return <>
  <Head eyebrow="Step 3 · Blog structure" title="Pick a blog structure" sub="Same research, three ways to lay out your blog."/>
  <div className="structures" role="radiogroup" aria-label="Layout">{S.outlines.map((x,i)=>{const on=outline===x.id;return <motion.button key={x.id} role="radio" aria-checked={on} className={`structure ${on?'selected':''}`} onClick={()=>setOutline(x.id)} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.08,duration:.4,ease}}>
   <div className="thumb-doc" aria-hidden="true"><i className="t-title"/><i className="t-intro"/>{x.sections.map((s,j)=><i key={s} className={`t-h ${j%2?'short':''}`}/>)}</div>
   <div className="structure-copy"><div className="angle-top"><strong>{x.name}</strong>{x.recommended&&<OurPick/>}</div><p>{x.why}</p><span className="mono">{x.sections.length} sections · about {x.words} words</span></div>
  </motion.button>;})}</div>
  <AnimatePresence mode="wait"><motion.section key={o.id} className="outline-preview" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.35,ease}}>
   <span className="eyebrow">Preview · {o.name}</span>
   <p className="outline-intro">Opens with a two-line answer to the search, then:</p>
   <ol>{o.sections.map((s,j)=><motion.li key={s} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:j*.04}}><span className="h2">H2</span>{s}{j===1&&<span className="flag stat">Stat</span>}{j===3&&<span className="flag product">{ws.name} mention</span>}{s.startsWith('FAQ')&&<span className="flag faq">Schema</span>}</motion.li>)}</ol>
  </motion.section></AnimatePresence>
  <Next label="Next: choose the voice" onNext={onNext}/>
 </>;
}

function Writing({title,onDone}:{title:string;onDone:()=>void}){
 const {S,voices,ws,blogTypes}=useCtx();
 const [part,setPart]=useState(0),[streamed,setStreamed]=useState(0),[checking,setChecking]=useState(false),total=S.writeParts.length;
 useEffect(()=>{if(streamed>=S.draftStream.length){let p=S.draftStream.length+1;const t=setInterval(()=>{setPart(p);p++;if(p>total+1){clearInterval(t);setChecking(true);}},650);return()=>clearInterval(t);}setPart(streamed+1);},[streamed]);
 return <>
  <Head eyebrow="Step 4 · Draft" title="Drafting your blog" sub="In your voice, with your facts, easy for Google and AI tools to quote."/>
  <div className="writing">
   <article className="paper live">
    <span className="eyebrow">Draft</span><h2 className="paper-title">{title}</h2>
    {S.draftStream.slice(0,streamed+1).map((b,i)=><div key={i} className={i===0?'answer-first':''}>{b.h&&<h3>{b.h}</h3>}<p>{i===streamed?<TypeStream text={b.p} speed={30} onDone={()=>setStreamed(s=>s+1)}/>:b.p}</p></div>)}
   </article>
   <aside className="writing-side"><Ring value={part/total} size={52}/><WorkList steps={S.writeParts} at={part}/>
    <AnimatePresence>{checking&&<FactCheck onDone={onDone}/>}</AnimatePresence></aside>
  </div>
 </>;
}

// Before the draft is shown, every fact is matched to the saved page it came from.
function FactCheck({onDone}:{onDone:()=>void}){
 const {S,voices,ws,blogTypes}=useCtx();
 const items=S.research.slice(0,4),at=useSteps(items.length,620,()=>setTimeout(onDone,900));
 return <motion.section className="fact-check" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} transition={{duration:.35,ease}}>
  <strong>Checking every fact</strong>
  <div className="fc-list">{items.map((r,i)=><motion.div key={r.text} initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} transition={{delay:i*.08}} className={`fc-row ${i<at?'passed':''}`}>
   <span className="fc-mark">{i<at?<Tick size={12}/>:<i className="spin-dot"/>}</span><div><p>{r.text.length>58?r.text.slice(0,56)+'…':r.text}</p><small>{i<at?`Matches ${r.source}`:'Finding it in the saved page'}</small></div>
  </motion.div>)}</div>
 </motion.section>;
}

function Ready({title,voice,onToast,onExit}:{title:string;voice:Voice;onToast:(t:string)=>void;onExit:()=>void}){
 const {S}=useCtx(),{post,images,ready}=useArticle(S.k,title,voice);
 const [tab,setTab]=useState<'publish'|'images'|'quality'>('publish');
 return <>
  <motion.div className="ready-banner" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{duration:.45,ease}}>
   <span className="ready-check"><svg viewBox="0 0 24 24"><motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:.55,delay:.2}}/></svg></span>
   <div><strong>Ready to publish</strong><p><Ticker value={1980}/> words · <Ticker value={post.images.length}/> images with alt text · <Ticker value={post.faq.length}/> FAQs · <Ticker value={S.research.length}/> sources cited · every fact checked</p></div>
   <button className="button primary" disabled={!ready} onClick={async()=>{try{await copyFormatted(post,images);onToast('Copied with formatting and images. Paste into Google Docs, WordPress or Notion.');}catch{onToast('Your browser blocked the clipboard. Use Download instead.');}}}><Copy size={16}/>Copy article</button>
  </motion.div>
  <div className="ready-layout">
   <ArticleBody post={post} images={images}/>
   <aside className="ready-side">
    <div className="tabs" role="tablist">{([['publish','Publish',Globe],['images','Images',ImageIcon],['quality','Quality',ListChecks]] as const).map(([id,label,Icon])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={15}/>{label}{tab===id&&<motion.i layoutId="ready-tab" className="tab-line"/>}</button>)}</div>
    <AnimatePresence mode="wait"><motion.div key={tab} className="side-body" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.2}}>
     {tab==='publish'&&<>
      <PublishPanel post={post} images={images} ready={ready} onToast={onToast} onSettings={()=>{location.hash='settings';}}/>
      <dl className="seo-facts"><div><dt>SEO title</dt><dd>{post.metaTitle}<small>{post.metaTitle.length} of 60 characters</small></dd></div><div><dt>Meta description</dt><dd>{post.metaDescription}<small>{post.metaDescription.length} characters</small></dd></div><div><dt>Slug</dt><dd className="mono">/{post.slug}</dd></div></dl>
     </>}
     {tab==='images'&&<>{post.images.map((im,i)=><div key={im.name} className="image-row">{images[i]?<img className="thumb-img" src={images[i]} alt=""/>:<span className="thumb"/>}<div><label className="field compact">Alt text<textarea rows={2} defaultValue={im.alt}/></label><small className="muted">{i===post.featured?'Featured image':S.images[i].place}</small></div></div>)}</>}
     {tab==='quality'&&<><ul className="checks">{S.quality.map((c,i)=><motion.li key={c.label} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:i*.05}}><span className="ok"><Check size={12} strokeWidth={3}/></span>{c.label}</motion.li>)}</ul><p className="footnote">Built to be quoted: every section opens with a direct answer, and every stat links to its source.</p></>}
    </motion.div></AnimatePresence>
    <button className="button ghost wide" onClick={onExit}>Back to dashboard</button>
   </aside>
  </div>
 </>;
}

function Next({disabled,label,onNext,icon:Icon=ArrowRight}:{disabled?:boolean;label:string;onNext:()=>void;icon?:typeof ArrowRight}){
 const ref=useRef<HTMLButtonElement>(null);
 return <motion.div className="next" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.2,duration:.35,ease}}><button ref={ref} className="button primary xl" disabled={disabled} onClick={onNext}>{label} <Icon size={18}/></button></motion.div>;
}

function Memory({items,keyword,voice,onClose}:{items:string[];keyword:string;voice:Voice;onClose:()=>void}){
 const {S,voices,ws,blogTypes}=useCtx();
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[]);
 return <><motion.button aria-label="Close saved notes" className="scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
  <motion.aside className="drawer" role="dialog" aria-label="Saved notes" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{duration:.4,ease}}>
   <header><h2><Brain size={18}/>Saved notes</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></header>
   <p className="muted">Everything this blog is based on: your company brief, your choices and every source. Nothing is made up.</p>
   <span className="eyebrow">Always included</span>
   <ul className="memory-list"><li className="pinned"><FileText size={14}/>{ws.name} brief (context.md)</li><li className="pinned"><User size={14}/>{voices[voice].name} voice</li><li className="pinned"><Keyword size="sm">{keyword}</Keyword></li></ul>
   <span className="eyebrow">Saved for this blog · {items.length}</span>
   <ul className="memory-list">{items.map((i,n)=><motion.li key={i} initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} transition={{delay:n*.02}}><Check size={14}/>{i}</motion.li>)}</ul>
  </motion.aside></>;
}

// Asked right before writing, so the voice fits this specific article.
function VoiceStep({voice,setVoice,onNext}:{voice:Voice;setVoice:(v:Voice)=>void;onNext:()=>void}){
 const {S,voices,ws,blogTypes}=useCtx();
 return <>
  <Head eyebrow="Step 4 · Draft" title="Who is writing this one?" sub="Same facts, different voice. Pick the one that suits this article."/>
  <div className="letters" role="radiogroup" aria-label="Writing voice">{(['founder','team'] as Voice[]).map((v,i)=><motion.button key={v} role="radio" aria-checked={voice===v} className={`letter ${voice===v?'selected':''}`} onClick={()=>setVoice(v)} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.08+i*.08,duration:.4,ease}}>
   <div className="letter-head"><strong>{voices[v].name}</strong><span className="radio">{voice===v&&<motion.span initial={{scale:0}} animate={{scale:1}} transition={spring}><Check size={13} strokeWidth={3}/></motion.span>}</span></div>
   <small>{voices[v].who}</small>
   <p className="letter-body">“{voices[v].sample}”</p>
   <span className="letter-byline">{voices[v].byline}</span>
  </motion.button>)}</div>
  <Next label="Write the draft" onNext={onNext} icon={PenLine}/>
 </>;
}

const typeIcons:Record<BlogType,typeof ArrowRight>={'best-of-list':ListOrdered,'how-to-guide':BookOpen,comparison:Columns2,alternatives:Shuffle,tips:Lightbulb};

// Blog type is chosen before any research, so research knows what to look for.
function TypeStep({keyword,btype,setBtype,answers,setAnswers,onNext}:{keyword:string;btype:BlogType;setBtype:(t:BlogType)=>void;answers:Record<string,string>;setAnswers:(a:Record<string,string>)=>void;onNext:()=>void}){
 const {S,voices,ws,blogTypes}=useCtx();
 const suggested=suggestType(keyword),t=blogTypes.find(x=>x.id===btype)!;
 return <>
  <Head eyebrow="Step 1 · Plan" title="What type of blog?" sub="We suggest the type that already wins this search. Pick another if it suits you better."/>
  <div className="types" role="radiogroup" aria-label="Blog type">{blogTypes.map((x,i)=>{const on=btype===x.id;return <motion.button key={x.id} role="radio" aria-checked={on} className={`type-card ${on?'selected':''}`} onClick={()=>setBtype(x.id)} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*.05,duration:.35,ease}}>
   <div className="type-head">{(()=>{const Icon=typeIcons[x.id];return <span className="type-icon"><Icon size={18} strokeWidth={2.2}/></span>;})()}<strong>{x.name}</strong><span className="radio">{on&&<motion.span initial={{scale:0}} animate={{scale:1}} transition={spring}><Check size={13} strokeWidth={3}/></motion.span>}</span></div>
   {x.id===suggested&&<OurPick/>}<p>{x.desc}</p><span className="type-example"><small>Example title</small>{x.example}</span>
  </motion.button>;})}</div>
  {btype===suggested&&<Nudge tone="pick">Most top results for <Keyword size="sm">{keyword}</Keyword> are {t.name.toLowerCase()}s, so readers expect this format.</Nudge>}
  <AnimatePresence mode="wait"><motion.section key={btype} className="type-questions" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.3,ease}}>
   <span className="eyebrow">A few quick choices for this {t.name.toLowerCase()}</span>
   {t.questions.map(q=>{const val=answers[`${btype}.${q.id}`]||q.answer;return <div key={q.id} className="type-q"><strong>{q.q}</strong><div className="seg" role="radiogroup" aria-label={q.q}>{q.options.map(o=><button key={o} role="radio" aria-checked={val===o} className={val===o?'on':''} onClick={()=>setAnswers({...answers,[`${btype}.${q.id}`]:o})}>{o}</button>)}</div></div>;})}
  </motion.section></AnimatePresence>
  <Next label="Next: check the top results" onNext={onNext}/>
 </>;
}

// Every page read during research is saved in full. Each finding points at its exact words.
function SourceViewer({item,onClose}:{item:Sample['research'][number];onClose:()=>void}){
 const {S,voices,ws,blogTypes}=useCtx();
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[]);
 const src=S.sourceText[item.source],quote=item.text,at=src?src.text.indexOf(quote):-1;
 return <><motion.button aria-label="Close saved page" className="scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
  <motion.aside className="drawer" role="dialog" aria-label="Saved page" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{duration:.4,ease}}>
   <header><h2><FileText size={18}/>Saved page</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></header>
   {src?<><div className="source-meta"><strong>{src.title}</strong><span className="mono">{src.url}</span><span className="muted">Saved {src.fetched} · full page kept for this blog</span></div>
    <div className="source-text">{at>=0?<>{src.text.slice(0,at)}<motion.mark initial={{backgroundColor:'rgba(243,239,156,0)'}} animate={{backgroundColor:'rgba(243,239,156,1)'}} transition={{delay:.35,duration:.5}}>{quote}</motion.mark>{src.text.slice(at+quote.length)}</>:src.text}</div>
    <p className="footnote">The highlighted words are the exact quote this fact comes from. The draft can only state what saved pages and your company brief say.</p></>
   :<div className="source-meta"><strong>{item.source}</strong><span className="muted">Saved with this blog. In the live product, the full page text appears here.</span></div>}
  </motion.aside></>;
}
