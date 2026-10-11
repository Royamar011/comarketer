import {useEffect,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {Check,ClipboardCopy,Code2,Download,ExternalLink,FileText,Globe,LoaderCircle,Send,TriangleAlert,X} from 'lucide-react';
import {ease} from './ui';
import {Tick} from './steps';
import {copyFormatted,copyHTML,copyMarkdown,downloadZip} from '../article-data';
import {useWorkspace} from '../workspace';
import type {Post} from '../post';

export const platformNames:Record<string,string>={wordpress:'WordPress',webflow:'Webflow',hubspot:'HubSpot',ghost:'Ghost'};
export type Conn={platform:string;label:string;settings:Record<string,any>};
export function useConnections(){
 const ws=useWorkspace(),[list,setList]=useState<Conn[]|null>(null);
 const load=()=>fetch(`/api/connections?domain=${encodeURIComponent(ws.domain)}`).then(r=>r.json()).then(d=>setList(d.connections||[])).catch(()=>setList([]));
 useEffect(()=>{load();},[ws.domain]);
 return {list,reload:load};
}
type Done={id:string;url:string;editUrl:string;status:string;warnings:string[]};

// Publish to a connected blog, or copy and download in the exact format.
export function PublishPanel({post,images,ready,onToast,onSettings,onPublished}:{post:Post;images:string[];ready:boolean;onToast:(t:string)=>void;onSettings?:()=>void;onPublished?:(r:Done&{platform:string})=>void}){
 const ws=useWorkspace(),{list}=useConnections(),[run,setRun]=useState<{platform:string;mode:string;steps:string[];done?:Done;error?:string}|null>(null);
 const go=async(platform:string,mode:'draft'|'publish')=>{
  setRun({platform,mode,steps:['Preparing the article']});
  const add=(f:(r:NonNullable<typeof run>)=>NonNullable<typeof run>)=>setRun(r=>r&&f(r));
  try{
   const res=await fetch('/api/publish',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({domain:ws.domain,platform,mode,post,images:post.images.map((im,i)=>({name:im.name,alt:im.alt,mime:images[i].slice(5,images[i].indexOf(';')),base64:images[i].split(',')[1]}))})});
   const reader=res.body!.getReader(),dec=new TextDecoder();let buf='';
   for(;;){const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop()||'';
    for(const l of lines){if(!l.trim())continue;const e=JSON.parse(l);
     if(e.t==='step')add(r=>({...r,steps:[...r.steps,e.label]}));
     if(e.t==='done'){add(r=>({...r,done:e}));onPublished?.({...e,platform});}
     if(e.t==='error')add(r=>({...r,error:e.message}));}}
  }catch{add(r=>({...r,error:'The connection to the server dropped. Try again.'}));}
 };
 const copy=async(what:'formatted'|'html'|'md')=>{try{if(what==='formatted')await copyFormatted(post,images);else if(what==='html')await copyHTML(post,images);else await copyMarkdown(post,images);
  onToast(what==='formatted'?'Copied with formatting and images. Paste into Google Docs, WordPress or Notion.':what==='html'?'HTML copied. Images are in the download.':'Markdown copied.');}catch{onToast('Your browser blocked the clipboard. Use Download instead.');}};
 return <div className="publish-panel">
  <section><span className="eyebrow">Publish to your blog</span>
   {list===null?<p className="muted">Checking connections…</p>:list.length?list.map(c=><div key={c.platform} className="pub-target">
     <div><strong>{platformNames[c.platform]}</strong><small>{c.label}</small></div>
     <button className="button primary compact" disabled={!ready} onClick={()=>go(c.platform,'draft')}><Send size={14}/>Send as draft</button>
     <button className="button ghost compact" disabled={!ready} onClick={()=>go(c.platform,'publish')}>Publish now</button>
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
  <AnimatePresence>{run&&<motion.div className="pub-run" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.25,ease}}>
   <header><strong>{run.done?(run.done.status==='published'?`Published on ${platformNames[run.platform]}`:`Draft is in ${platformNames[run.platform]}`):run.error?'Could not publish':`Sending to ${platformNames[run.platform]}`}</strong>{(run.done||run.error)&&<button className="icon-button" aria-label="Close" onClick={()=>setRun(null)}><X size={16}/></button>}</header>
   <ul>{run.steps.map((s,i)=>{const last=i===run.steps.length-1&&!run.done&&!run.error;return <li key={s+i} className={last?'now':'done'}><span>{last?<LoaderCircle className="spin" size={13}/>:<Tick size={12}/>}</span>{s}</li>;})}</ul>
   {run.error&&<p className="pub-error"><TriangleAlert size={15}/>{run.error}</p>}
   {run.done&&<>{run.done.warnings.map(w=><p key={w} className="pub-warn"><TriangleAlert size={15}/>{w}</p>)}
    <div className="pub-links"><a className="button primary compact" href={run.done.editUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Open in {platformNames[run.platform]}</a>{run.done.status==='published'&&run.done.url&&<a className="button secondary compact" href={run.done.url} target="_blank" rel="noreferrer">View post</a>}</div></>}
  </motion.div>}</AnimatePresence>
 </div>;
}
