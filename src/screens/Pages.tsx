import {useEffect,useState} from 'react';
import {motion} from 'motion/react';
import type React from 'react';
import {ArrowRight,Check,CheckCircle2,ExternalLink,FileText,ImageIcon,Layers,LoaderCircle,Pencil,RefreshCw,Globe,Search} from 'lucide-react';
import {Tile,ease,type Notice} from '../components/ui';
import {StepTrack} from '../components/steps';
import {BriefView} from '../components/brief';
import {Connections} from '../components/connections';
import {useWorkspace,when,whenExact} from '../workspace';
import {voicesFor,workflowSteps,type Article,type Voice} from '../data';
const greeting=()=>{const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening';};

// Examples type themselves into the empty box, so people see what a keyword looks like.
const order:Record<string,number>={you:0,Ready:1,us:2,Scheduled:3,Published:4};
const rank=(a:Article)=>a.status==='In progress'?order[a.waiting||'you']:order[a.status];

// Home has two jobs: start a new blog, and pick up the ones already going.
export function Home({onNew,onOpen,onResume,onLibrary}:{onNew:(keyword:string)=>void;onOpen:(id:string)=>void;onResume:(id:string)=>void;onLibrary:()=>void;firstVisit:boolean}){
 const [kw,setKw]=useState(''),[focus,setFocus]=useState(false),ws=useWorkspace(),articles=ws.articles.filter(a=>!a.archivedAt);
 const blogs=[...articles].sort((a,b)=>rank(a)-rank(b)||b.updated.localeCompare(a.updated)).slice(0,6),yours=articles.filter(a=>a.waiting==='you').length;
 return <div className="home2">
  <motion.section className="ask" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.5,ease}}>
   <h1>{greeting()}</h1>
   <p className="ask-sub">{yours?`${yours} ${yours===1?'blog is':'blogs are'} waiting for you below. Or start a new one.`:'What do you want to write about today?'}</p>
   <form className="ask-box" onSubmit={e=>{e.preventDefault();onNew(kw.trim());}}>
    <label htmlFor="ask-input">What do you want to write about?</label>
    <div className="ask-row">
     <span className="ask-icon"><Search size={20}/></span>
     <div className="ask-field"><input id="ask-input" value={kw} onChange={e=>setKw(e.target.value)} onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} autoComplete="off"/>{!kw&&<span className="ask-ghost" aria-hidden="true">Type the keyword you want to rank for{focus&&<i className="cursor"/>}</span>}</div>
     <button className="button primary xl">Write a blog <ArrowRight size={18}/></button>
    </div>
   </form>
  </motion.section>
  <section className="blogs">
   <div className="blogs-head"><h2>Your blogs</h2><button className="link-btn" onClick={onLibrary}>See all {articles.length}<ArrowRight size={14}/></button></div>
   {blogs.length?<div className="blog-grid">{blogs.map((a,i)=><BlogCard key={a.id} a={a} i={i} onOpen={onOpen} onContinue={onResume}/>)}</div>
    :<div className="empty-blogs"><strong>No blogs yet</strong><p>Type a keyword above. Your first blog shows up here as soon as you start it.</p></div>}
  </section>
 </div>;
}

function BlogCard({a,i,onOpen,onContinue}:{a:Article;i:number;onOpen:(id:string)=>void;onContinue:(id:string)=>void}){
 // Cards lift a little under the pointer and press in when clicked.
 const draft=a.status==='In progress',yours=a.waiting==='you';
 const line=draft?(yours?`Next: ${a.next?.toLowerCase()}`:a.next):a.status==='Ready'?'Ready to publish':a.status==='Scheduled'?`Goes live ${whenExact(a.scheduledFor)}`:`Published ${when(a.publishedAt)}`;
 return <motion.article className={`blog-card ${draft?'is-draft':''} ${yours?'is-yours':''}`} initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{delay:.12+i*.06,duration:.5,ease}} whileHover={{y:-4,transition:{type:'spring',stiffness:400,damping:24}}} whileTap={{scale:.985}} onClick={()=>onOpen(a.id)}>
  <div className={`cover ${draft?'draft':`t${i%4}`}`}>
   {draft?<StepTrack step={a.step||1} working={!yours} size="sm"/>:<span className="cover-art" aria-hidden="true"><i/><i/><i/></span>}
   {yours&&<span className="cover-flag">Action needed</span>}
  </div>
  <div className="blog-body">
   <h3>{a.title}</h3>
   <p className={`blog-line ${yours?'yours':''} ${a.status==='Ready'?'ready':''}`}>{draft&&!yours&&<LoaderCircle className="spin" size={14}/>}{line}</p>
  </div>
  <div className="blog-foot" onClick={e=>e.stopPropagation()}>
   {draft&&yours&&<button className="button primary compact" onClick={()=>onContinue(a.id)}>Continue<ArrowRight size={15}/></button>}
   {a.status==='Ready'&&<button className="button primary compact" onClick={()=>onOpen(a.id)}>Publish<ArrowRight size={15}/></button>}
   {(a.status==='Published'||a.status==='Scheduled')&&<button className="button secondary compact" onClick={()=>onOpen(a.id)}>Open</button>}
   {draft&&!yours&&<span className="blog-wait">We will tell you when it is ready</span>}
  </div>
 </motion.article>;
}

export function Context({onRefresh,onChange}:{onRefresh:()=>void;onChange:()=>void}){
 const [raw,setRaw]=useState(false),ws=useWorkspace();
 return <div>
  {ws.md&&<div className="context-top"><div className="company-line"><img src={ws.logo} alt="" width={44} height={44}/><div><strong>{ws.name}</strong><span className="mono">{ws.domain} · researched from the website</span></div></div>
   <div className="seg" role="tablist"><button role="tab" aria-selected={!raw} className={!raw?'on':''} onClick={()=>setRaw(false)}>Brief</button><button role="tab" aria-selected={raw} className={raw?'on':''} onClick={()=>setRaw(true)}>context.md</button></div>
   <div className="context-actions"><button className="button ghost" onClick={onChange}>Use a different website</button><button className="button secondary" onClick={onRefresh}><RefreshCw size={16}/>Research my website again</button></div></div>}
  {!ws.md?<div className="empty-brief"><Globe size={22}/><strong>No company brief yet</strong><p>Add your website and we read it to build the brief every article is written from.</p><button className="button primary" onClick={onChange}>Add your website <ArrowRight size={16}/></button></div>
   :raw?<pre className="md-raw">{ws.md}</pre>:<BriefView key={ws.md.length+ws.domain}/>}
 </div>;
}

export function Styles({voice,setVoice}:{voice:Voice;setVoice:(v:Voice)=>void}){
 const ws=useWorkspace(),voices=voicesFor(ws.name);
 return <div className="voices">{(Object.keys(voices) as Voice[]).map((v,i)=><motion.section key={v} className={`voice-card ${voice===v?'selected':''}`} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*.08,ease}}>
  <header><div><h2>{voices[v].name}</h2><p className="muted">{voices[v].who}</p></div>{voice===v?<span className="chip info"><Check size={12}/>Default</span>:<button className="button secondary compact" onClick={()=>setVoice(v)}>Make default</button>}</header>
  <p className="letter-body">“{voices[v].sample}”</p><span className="letter-byline">{voices[v].byline}</span>
  <ul className="rules">{[...voices[v].rules,'Answers first, one idea per paragraph, every stat sourced'].map(r=><li key={r}><Check size={14}/>{r}</li>)}</ul>
  <label className="field">House rules<textarea rows={2} placeholder={v==='founder'?'e.g. Mention I started the company after running a hardware brand.':'e.g. Use US spelling. Never call customers “users”.'}/></label>
 </motion.section>)}</div>;
}

export function Settings({onToast,onResearch}:{onToast:(t:Notice)=>void;onResearch:()=>void}){
 const [img,setImg]=useState<'openai'|'gemini'>('openai'),ws=useWorkspace();
 return <div className="settings">
  <section className="setting"><Tile icon={Globe} size="sm"/><div><h3>Website</h3><p className="muted">{ws.domain} · your brief is built from this site.</p></div><button className="button secondary compact" onClick={onResearch}>Research a website</button></section>
  <section className="setting"><Tile icon={ImageIcon} size="sm"/><div><h3>Images</h3><p className="muted">Three to four images per article, each with alt text.</p></div>
   <div className="seg" role="radiogroup" aria-label="Image provider">{([['openai','OpenAI'],['gemini','Gemini']] as const).map(([id,l])=><button key={id} role="radio" aria-checked={img===id} className={img===id?'on':''} onClick={()=>{setImg(id);onToast(`${l} will create your images.`);}}>{l}</button>)}</div></section>
  <section className="setting setting-wide"><Tile icon={Layers} size="sm"/><div><h3>Publishing</h3><p className="muted">Connect your blog once. Articles go in as drafts with images, SEO fields and schema.</p></div><Connections/></section>
  <section className="setting"><Tile icon={FileText} size="sm"/><div><h3>Writing</h3><p className="muted">Every article grounded in your company facts, never made up.</p></div><span className="chip"><CheckCircle2 size={12}/>Claude</span></section>
 </div>;
}
