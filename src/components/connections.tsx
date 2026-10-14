import {useEffect,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {Check,Download,LoaderCircle,Plug,X} from 'lucide-react';
import {ProblemCard,ease} from './ui';
import {blogProblem,platformNames,useConnections,type Conn} from './publish';
import {useWorkspace} from '../workspace';

type Field={id:string;label:string;placeholder:string;secret?:boolean};
const setup:Record<string,{fields:Field[];how:string[]}>={
 wordpress:{fields:[{id:'site',label:'Site address',placeholder:'yourcompany.com'},{id:'username',label:'WordPress username',placeholder:'your-login'},{id:'appPassword',label:'Application password',placeholder:'xxxx xxxx xxxx xxxx xxxx xxxx',secret:true}],
  how:['In WordPress, open Users → Profile.','Under Application Passwords, type “Comarketer” and click Add.','Paste the password here. It only lets Comarketer create and edit posts.']},
 webflow:{fields:[{id:'token',label:'Site API token',placeholder:'Paste the token',secret:true}],
  how:['In Webflow, open Site settings → Apps & integrations → API access.','Generate a token with CMS read and write, and Assets read and write.','Paste it here, then pick your blog collection.']},
 hubspot:{fields:[{id:'token',label:'Private app access token',placeholder:'pat-…',secret:true}],
  how:['In HubSpot, open Settings → Integrations → Private apps → Create.','Give it the “content” and “files” scopes.','Paste the access token here.']},
 ghost:{fields:[{id:'site',label:'Site address',placeholder:'yourblog.com'},{id:'adminKey',label:'Admin API key',placeholder:'id:secret',secret:true}],
  how:['In Ghost, open Settings → Integrations → Add custom integration.','Name it “Comarketer” and copy the Admin API key.','Paste it here with your site address.']},
};
const soon=['Framer','Wix','Shopify'];

// Our fields, matched to a Webflow collection's fields. Pre-matched by name and type; the user confirms once.
const ours:{id:string;label:string;types:string[];hint:RegExp}[]=[
 {id:'body',label:'Post body',types:['RichText'],hint:/body|content|post/i},{id:'summary',label:'Summary',types:['PlainText'],hint:/summary|excerpt|intro/i},
 {id:'metaTitle',label:'SEO title',types:['PlainText'],hint:/seo.?title|meta.?title/i},{id:'metaDescription',label:'Meta description',types:['PlainText'],hint:/meta|description/i},
 {id:'image',label:'Featured image',types:['Image'],hint:/image|thumbnail|cover|hero/i},{id:'date',label:'Publish date',types:['DateTime'],hint:/date|published/i},
 {id:'schema',label:'Schema (JSON-LD)',types:['PlainText'],hint:/schema|json|structured/i},
];

function WebflowMap({domain,onDone}:{domain:string;onDone:()=>void}){
 const [cols,setCols]=useState<any[]|null>(null),[col,setCol]=useState(''),[map,setMap]=useState<Record<string,string>>({}),[err,setErr]=useState('');
 useEffect(()=>{fetch(`/api/connections/webflow-options?domain=${encodeURIComponent(domain)}`).then(r=>r.json()).then(d=>{if(d.error)setErr(d.error);else{setCols(d.collections);const blog=d.collections.find((c:any)=>/blog|post|article/i.test(c.name))||d.collections[0];if(blog)pick(blog,d.collections);}});},[]);
 const pick=(c:any,all=cols)=>{setCol(c.id);const m:Record<string,string>={};for(const o of ours){const f=c.fields.find((f:any)=>o.types.includes(f.type)&&o.hint.test(f.name+' '+f.slug));if(f)m[o.id]=f.slug;}setMap(m);void all;};
 const c=cols?.find(x=>x.id===col);
 const save=async()=>{await fetch('/api/connections/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({domain,platform:'webflow',settings:{collectionId:col,collectionSlug:c.slug,map}})});onDone();};
 if(err)return <ProblemCard problem={blogProblem('Webflow',err,{connecting:true})}/>;
 if(!cols)return <p className="muted"><LoaderCircle className="spin" size={14}/> Reading your collections…</p>;
 return <div className="wf-map">
  <label className="field">Blog collection<select value={col} onChange={e=>pick(cols.find(x=>x.id===e.target.value))}>{cols.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
  {c&&<><p className="muted">Name and slug go to the item name and slug. Match the rest:</p>
   {ours.map(o=><label key={o.id} className="field compact">{o.label}<select value={map[o.id]||''} onChange={e=>setMap({...map,[o.id]:e.target.value})}><option value="">Not used</option>{c.fields.filter((f:any)=>o.types.includes(f.type)).map((f:any)=><option key={f.slug} value={f.slug}>{f.name}</option>)}</select></label>)}
   {!map.schema&&<p className="hint">Tip: add a plain text field called “Schema” and put it in the template’s head code. Webflow adds no article schema on its own.</p>}
   <button className="button primary" disabled={!map.body} onClick={save}>Save field match</button></>}
 </div>;
}

function Connect({platform,existing,onClose,onSaved}:{platform:string;existing?:Conn;onClose:()=>void;onSaved:()=>void}){
 const ws=useWorkspace(),cfg=setup[platform],[vals,setVals]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[conn,setConn]=useState<Conn|undefined>(existing);
 const submit=async()=>{setBusy(true);setErr('');try{const r=await fetch('/api/connections',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({domain:ws.domain,platform,creds:vals})});const d=await r.json();if(!r.ok)throw new Error(d.error);setConn(d);onSaved();}catch(e){setErr((e as Error).message);}setBusy(false);};
 const remove=async()=>{await fetch(`/api/connections?domain=${encodeURIComponent(ws.domain)}&platform=${platform}`,{method:'DELETE'});onSaved();onClose();};
 return <><motion.button aria-label="Close" className="scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
  <motion.aside className="drawer" role="dialog" aria-label={`Connect ${platformNames[platform]}`} initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{duration:.4,ease}}>
   <header><h2><Plug size={18}/>{platformNames[platform]}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></header>
   {conn?<>
    <p className="conn-ok"><Check size={16}/>Connected to <strong>{conn.label}</strong></p>
    {platform==='wordpress'&&<div className="hint">{conn.settings.seo==='none'?'No SEO plugin found. Posts still publish; set SEO fields in WordPress, or install Yoast or Rank Math.':<>Found {conn.settings.seo==='yoast'?'Yoast SEO':'Rank Math'}. To let Comarketer fill in the SEO title and description, install this small plugin once.<a className="button secondary compact" href="/integrations/wordpress/comarketer-seo-fields.php" download><Download size={14}/>Comarketer SEO fields plugin</a></>}</div>}
    {platform==='webflow'&&<WebflowMap domain={ws.domain} onDone={()=>{onSaved();onClose();}}/>}
    {platform==='hubspot'&&(conn.settings.blogs?.length>1)&&<label className="field">Blog<select defaultValue={conn.settings.blogId} onChange={e=>fetch('/api/connections/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({domain:ws.domain,platform,settings:{blogId:e.target.value}})})}>{conn.settings.blogs.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
    <p className="muted">New articles go in as drafts unless you choose Publish now.</p>
    <button className="button ghost danger" onClick={remove}>Disconnect</button>
   </>:<>
    <ol className="how">{cfg.how.map(h=><li key={h}>{h}</li>)}</ol>
    {cfg.fields.map(f=><label key={f.id} className="field">{f.label}<input type={f.secret?'password':'text'} autoComplete="off" placeholder={f.placeholder} value={vals[f.id]||''} onChange={e=>setVals({...vals,[f.id]:e.target.value})}/></label>)}
    {err&&<ProblemCard problem={blogProblem(platformNames[platform],err,{connecting:true})}/>}
    <button className="button primary" disabled={busy||cfg.fields.some(f=>!vals[f.id]?.trim())} onClick={submit}>{busy?<><LoaderCircle className="spin" size={15}/>Checking…</>:'Test and connect'}</button>
    <p className="muted small">Keys are kept on the Comarketer server for this company, never in the browser.</p>
   </>}
  </motion.aside></>;
}

export function Connections(){
 const ws=useWorkspace(),{list,reload}=useConnections(),[open,setOpen]=useState<string|null>(null);
 if(!ws.domain)return <p className="muted">Add your website first, then connect your blog.</p>;
 return <div className="conn-grid">
  {Object.keys(setup).map(p=>{const c=list?.find(x=>x.platform===p);return <button key={p} className={`conn-card ${c?'on':''}`} onClick={()=>setOpen(p)}>
   <strong>{platformNames[p]}</strong><small>{c?c.label:'Not connected'}</small>{c?<span className="chip success"><Check size={12}/>Connected</span>:<span className="chip">Connect</span>}</button>;})}
  {soon.map(p=><div key={p} className="conn-card soon"><strong>{p}</strong><small>Use Copy or Download for now</small><span className="chip">Next</span></div>)}
  <AnimatePresence>{open&&<Connect key={open} platform={open} existing={list?.find(x=>x.platform===open)} onClose={()=>setOpen(null)} onSaved={reload}/>}</AnimatePresence>
 </div>;
}
