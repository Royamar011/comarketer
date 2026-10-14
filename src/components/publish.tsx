import {useEffect,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {CalendarClock,ClipboardCopy,Code2,Download,ExternalLink,FileText,Globe,LoaderCircle,Send,TriangleAlert,X} from 'lucide-react';
import {Burst,ProblemCard,ease,type Notice,type Problem} from './ui';
import {Tick} from './steps';
import {copyFormatted,copyHTML,copyMarkdown,downloadZip} from '../article-data';
import {loadArticle,useWorkspace,whenExact} from '../workspace';
import type {Article} from '../data';
import type {Post} from '../post';

export const platformNames:Record<string,string>={wordpress:'WordPress',webflow:'Webflow',hubspot:'HubSpot',ghost:'Ghost'};
export type Conn={platform:string;label:string;settings:Record<string,any>};
export function useConnections(){
 const ws=useWorkspace(),[list,setList]=useState<Conn[]|null>(null);
 const load=()=>fetch(`/api/connections?domain=${encodeURIComponent(ws.domain)}`).then(r=>r.json()).then(d=>setList(d.connections||[])).catch(()=>setList([]));
 useEffect(()=>{load();},[ws.domain]);
 return {list,reload:load};
}
// What a blog platform's error means for the user, and what to do. The platform's own words go under details.
export function blogProblem(name:string,message:string,o:{retry?:()=>void;settings?:()=>void;connecting?:boolean}={}):Problem{
 const m=message,also=o.settings?{label:'Open Settings',run:o.settings}:undefined;
 const base={details:m,retry:o.retry,also};
 if(/refused|401|403/.test(m))return {...base,title:o.connecting?`${name} turned down this key`:`${name} turned down the key`,fix:'Check the key is correct and allowed to create posts. You may need a new one from your blog’s settings.'};
 if(/could not reach|ENOTFOUND|fetch failed/i.test(m))return {...base,title:`Couldn’t reach ${name}`,fix:'Check the site address is right and the site is online, then try again.'};
 if(/not connected/i.test(m))return {...base,retry:undefined,title:`${name} isn’t connected`,fix:'Connect it in Settings, then send the article again.'};
 if(/pick the blog collection|match its fields/i.test(m))return {...base,retry:undefined,title:'Webflow needs one more step',fix:'Pick your blog collection and match its fields in Settings, then send the article again.'};
 if(/cannot schedule/i.test(m))return {...base,retry:undefined,title:'Webflow can’t schedule posts from here',fix:'Send it as a draft, then set the date in Webflow.'};
 if(/future/i.test(m))return {...base,retry:undefined,title:'That time has already passed',fix:'Pick a date and time at least a few minutes from now.'};
 if(/dropped|server/i.test(m))return {...base,title:'The connection dropped',fix:'We lost touch with the Comarketer server partway through. Check your blog before trying again, in case a copy already arrived.'};
 return {...base,title:o.connecting?`Couldn’t connect ${name}`:`${name} didn’t accept the article`,fix:o.connecting?'Check the details you entered, then try again.':'Nothing was published. Check the details below, then try again.'};
}
export const clipboardProblem:Problem={title:'Your browser blocked copying',fix:'Use Download instead. It has the same HTML, Markdown and images.'};

type Done={id:string;url:string;editUrl:string;status:'draft'|'published'|'scheduled';warnings:string[]};
type Mode='draft'|'publish'|'schedule';
// The earliest time to offer: the next quarter hour, at least ten minutes away, in the browser's time zone.
const soonest=()=>{const d=new Date(Date.now()+10*60000);d.setMinutes(Math.ceil(d.getMinutes()/15)*15,0,0);return new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};

// Publish to a connected blog, or copy and download in the exact format.
// With an article, the server saves where it went (status, links, date), so the library shows it.
export function PublishPanel({article,post,images,ready,onToast,onSettings}:{article?:Article;post:Post;images:string[];ready:boolean;onToast:(t:Notice)=>void;onSettings?:()=>void}){
 const ws=useWorkspace(),{list}=useConnections(),[run,setRun]=useState<{platform:string;mode:Mode;steps:string[];done?:Done;error?:string}|null>(null);
 const [plan,setPlan]=useState<string|null>(null),[at,setAt]=useState(soonest);
 const go=async(platform:string,mode:Mode)=>{
  setPlan(null);setRun({platform,mode,steps:['Preparing the article']});
  const add=(f:(r:NonNullable<typeof run>)=>NonNullable<typeof run>)=>setRun(r=>r&&f(r));
  try{
   const res=await fetch('/api/publish',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({domain:ws.domain,articleId:article?.id,platform,mode,at:mode==='schedule'?new Date(at).toISOString():undefined,post,images:post.images.map((im,i)=>({name:im.name,alt:im.alt,mime:images[i].slice(5,images[i].indexOf(';')),base64:images[i].split(',')[1]}))})});
   const reader=res.body!.getReader(),dec=new TextDecoder();let buf='';
   for(;;){const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop()||'';
    for(const l of lines){if(!l.trim())continue;const e=JSON.parse(l);
     if(e.t==='step')add(r=>({...r,steps:[...r.steps,e.label]}));
     if(e.t==='done'){add(r=>({...r,done:e}));if(article)loadArticle(article.id);}
     if(e.t==='error')add(r=>({...r,error:e.message}));}}
  }catch{add(r=>({...r,error:'The connection to the server dropped. Try again.'}));}
 };
 const copy=async(what:'formatted'|'html'|'md')=>{try{if(what==='formatted')await copyFormatted(post,images);else if(what==='html')await copyHTML(post,images);else await copyMarkdown(post,images);
  onToast(what==='formatted'?'Copied with formatting and images. Paste into Google Docs, WordPress or Notion.':what==='html'?'HTML copied. Images are in the download.':'Markdown copied.');}catch{onToast(clipboardProblem);}};
 return <div className="publish-panel">
  <section><span className="eyebrow">Publish to your blog</span>
   {article?.cms&&<p className="pub-warn"><TriangleAlert size={15}/><span>{article.status==='Published'?'Already live':article.status==='Scheduled'?`Scheduled for ${whenExact(article.scheduledFor)}`:'A draft is already'} on {platformNames[article.cms]}. Sending again adds a second post there. {article.editUrl&&<a href={article.editUrl} target="_blank" rel="noreferrer">Open it in {platformNames[article.cms]}</a>}</span></p>}
   {list===null?<p className="muted">Checking connections…</p>:list.length?list.map(c=><div key={c.platform} className="pub-target">
     <div><strong>{platformNames[c.platform]}</strong><small>{c.label}</small></div>
     <button className="button primary compact" disabled={!ready} onClick={()=>go(c.platform,'draft')}><Send size={14}/>Send as draft</button>
     <button className="button ghost compact" disabled={!ready} onClick={()=>go(c.platform,'publish')}>Publish now</button>
     {c.platform!=='webflow'&&<button className="button ghost compact" disabled={!ready} aria-expanded={plan===c.platform} onClick={()=>setPlan(p=>p===c.platform?null:c.platform)}><CalendarClock size={14}/>Schedule</button>}
     <AnimatePresence>{plan===c.platform&&<motion.form className="pub-schedule" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} transition={{duration:.2,ease}} onSubmit={e=>{e.preventDefault();go(c.platform,'schedule');}}>
      <label className="field compact">Goes live on<input type="datetime-local" required min={soonest()} value={at} onChange={e=>setAt(e.target.value)}/></label>
      <button className="button primary compact" disabled={!at||new Date(at).getTime()<Date.now()+60000}>Schedule on {platformNames[c.platform]}</button>
     </motion.form>}</AnimatePresence>
    </div>)
   :<div className="pub-empty"><Globe size={18}/><div><strong>No blog connected yet</strong><small>WordPress, Webflow, HubSpot or Ghost. Images and SEO fields go across too.</small></div>{onSettings&&<button className="button secondary compact" onClick={onSettings}>Connect</button>}</div>}
  </section>
  <section><span className="eyebrow">Copy or download</span>
   <div className="pub-actions">
    <button disabled={!ready} onClick={()=>copy('formatted')}><ClipboardCopy size={16}/><span><strong>Copy with formatting</strong><small>Headings, tables and images. For Google Docs, WordPress, Notion</small></span></button>
    <button disabled={!ready} onClick={()=>copy('html')}><Code2 size={16}/><span><strong>Copy HTML</strong><small>Clean code for a CMS HTML editor</small></span></button>
    <button disabled={!ready} onClick={()=>copy('md')}><FileText size={16}/><span><strong>Copy Markdown</strong><small>For Ghost, Notion, docs or Git</small></span></button>
    <button disabled={!ready} onClick={()=>{downloadZip(post,images);onToast('Download started: HTML, Markdown, images, schema and SEO fields.');}}><Download size={16}/><span><strong>Download .zip</strong><small>HTML page, Markdown, 4 images, schema, SEO fields</small></span></button>
   </div>
  </section>
  <AnimatePresence>{run&&<motion.div className={`pub-run ${run.error?'has-problem':''}`} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.25,ease}}>
   {!run.error&&<header>{run.done&&<span className="burst-anchor"><Burst count={16} radius={54}/></span>}<strong>{run.done?(run.done.status==='published'?`Published on ${platformNames[run.platform]}`:run.done.status==='scheduled'?`Scheduled on ${platformNames[run.platform]} for ${whenExact(new Date(at).toISOString())}`:`Draft is in ${platformNames[run.platform]}`):run.error?`Stopped before it reached ${platformNames[run.platform]}`:`Sending to ${platformNames[run.platform]}`}</strong>{(run.done||run.error)&&<button className="icon-button" aria-label="Close" onClick={()=>setRun(null)}><X size={16}/></button>}</header>}
   <ul>{run.steps.map((s,i)=>{const end=i===run.steps.length-1,last=end&&!run.done&&!run.error,failed=end&&!!run.error;return <li key={s+i} className={last?'now':failed?'failed':'done'}><span>{last?<LoaderCircle className="spin" size={13}/>:failed?<X size={12} strokeWidth={3}/>:<Tick size={12}/>}</span>{s}</li>;})}</ul>
   {run.error&&<ProblemCard problem={blogProblem(platformNames[run.platform],run.error,{retry:()=>go(run.platform,run.mode),settings:onSettings})} onClose={()=>setRun(null)}/>}
   {run.done&&<>{run.done.warnings.map(w=><p key={w} className="pub-warn"><TriangleAlert size={15}/>{w}</p>)}
    <div className="pub-links"><a className="button primary compact" href={run.done.editUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Open in {platformNames[run.platform]}</a>{run.done.status==='published'&&run.done.url&&<a className="button secondary compact" href={run.done.url} target="_blank" rel="noreferrer">View post</a>}</div></>}
  </motion.div>}</AnimatePresence>
 </div>;
}
