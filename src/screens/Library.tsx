import {useEffect,useRef,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {ArrowLeft,ArrowRight,Archive,CalendarClock,Check,ChevronDown,Copy,Download,ExternalLink,FileText,LoaderCircle,MoreHorizontal,Pencil,RefreshCw,Search,Send,ShieldCheck,Sparkles,Trash2,Globe,BookOpen} from 'lucide-react';
import {Keyword,ease,spring} from '../components/ui';
import {ArticleBody} from '../components/article';
import {StepTrack} from '../components/steps';
import {voicesFor,workflowSteps,type Article,type Status} from '../data';
import {makeSample} from '../sample';
import {PublishPanel} from '../components/publish';
import {downloadZip,useArticle} from '../article-data';
import {saveArticle} from '../workspace';
import {useWorkspace} from '../workspace';
const filters:('All'|Status)[]=['All','In progress','Ready','Scheduled','Published'];

export function StatusChip({a}:{a:Article}){
 if(a.status==='In progress')return <span className={`status s-progress ${a.waiting==='us'?'working':''}`}>{a.waiting==='us'?<LoaderCircle className="spin" size={12}/>:<i/>}{a.waiting==='us'?'In progress':'Action needed'}</span>;
 return <span className={`status s-${a.status.toLowerCase()}`}><i/>{a.status==='Ready'?'Ready to publish':a.status}</span>;
}
export function StepMeter({a}:{a:Article}){
 return <span className="step-meter" aria-label={`Step ${a.step} of 4: ${workflowSteps[(a.step||1)-1]}`}>{workflowSteps.map((s,i)=><i key={s} className={i<(a.step||0)-1?'done':i===(a.step||0)-1?'now':''}/>)}<b>{workflowSteps[(a.step||1)-1]}</b></span>;
}
const dateOf=(a:Article)=>a.status==='Published'?`Published ${a.publishedAt}`:a.status==='Scheduled'?`Goes live ${a.scheduledFor}`:`Updated ${a.updated}`;

export function Library({onOpen,onNew,onToast}:{onOpen:(id:string)=>void;onNew:()=>void;onToast:(t:string)=>void}){
 const ws=useWorkspace(),articles=ws.articles,voices=voicesFor(ws.name);
 const [filter,setFilter]=useState<'All'|Status>('All'),[q,setQ]=useState(''),[picked,setPicked]=useState<string[]>([]);
 const list=articles.filter(a=>(filter==='All'||a.status===filter)&&(a.title+a.keyword).toLowerCase().includes(q.toLowerCase()));
 const count=(f:'All'|Status)=>f==='All'?articles.length:articles.filter(a=>a.status===f).length;
 const toggle=(id:string)=>setPicked(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
 return <div className="library">
  <div className="lib-bar">
   <div className="lib-tabs" role="tablist">{filters.map(f=><button key={f} role="tab" aria-selected={filter===f} className={filter===f?'on':''} onClick={()=>{setFilter(f);setPicked([]);}}>{f}<b>{count(f)}</b>{filter===f&&<motion.i layoutId="lib-tab" className="lib-tab-line" transition={spring}/>}</button>)}</div>
   <label className="lib-search"><Search size={16}/><input aria-label="Search content" placeholder="Search titles and keywords" value={q} onChange={e=>setQ(e.target.value)}/></label>
  </div>
  <AnimatePresence>{picked.length>0&&<motion.div className="bulk" initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.2}}>
   <strong>{picked.length} selected</strong><button onClick={()=>{onToast(`${picked.length} articles archived.`);setPicked([]);}}><Archive size={15}/>Archive</button><button className="bulk-clear" onClick={()=>setPicked([])}>Clear</button>
  </motion.div>}</AnimatePresence>
  <div className="lib-table" role="table" aria-label="Content">
   <div className="lib-head" role="row"><span role="columnheader"><input type="checkbox" aria-label="Select all" checked={picked.length===list.length&&list.length>0} onChange={e=>setPicked(e.target.checked?list.map(a=>a.id):[])}/></span><span role="columnheader">Title</span><span role="columnheader">Status</span><span role="columnheader">Author</span><span role="columnheader">Words</span><span role="columnheader">Quality</span><span role="columnheader">Date</span><span/></div>
   <AnimatePresence initial={false} mode="popLayout">{list.map((a,i)=><motion.div key={a.id} layout role="row" className={`lib-row ${picked.includes(a.id)?'picked':''}`} initial={{opacity:0,y:6}} animate={{opacity:1,y:0,transition:{delay:i*.03,duration:.3,ease}}} exit={{opacity:0,scale:.98,transition:{duration:.15}}} transition={{layout:{duration:.3,ease}}} onClick={()=>onOpen(a.id)}>
    <span role="cell" onClick={e=>e.stopPropagation()}><input type="checkbox" aria-label={`Select ${a.title}`} checked={picked.includes(a.id)} onChange={()=>toggle(a.id)}/></span>
    <span role="cell" className="lib-title"><strong>{a.title}</strong><Keyword size="sm" muted>{a.keyword}</Keyword>
     <span className="row-actions" onClick={e=>e.stopPropagation()}>{a.status==='In progress'?<button onClick={()=>onOpen(a.id)}>Continue</button>:<><button onClick={()=>onOpen(a.id)}>Open</button>{a.status==='Published'&&<a href="#" onClick={e=>e.preventDefault()}>View live</a>}<button onClick={()=>onToast('Duplicated as a new draft.')}>Duplicate</button></>}</span>
    </span>
    <span role="cell"><StatusChip a={a}/>{a.status==='In progress'&&<StepMeter a={a}/>}</span>
    <span role="cell" className="muted">{a.voice?voices[a.voice].name:'Not chosen yet'}</span>
    <span role="cell" className="num">{a.words?a.words.toLocaleString():<span className="muted">Not yet</span>}</span>
    <span role="cell">{a.quality?<span className={`score ${a.quality>=95?'high':''}`}>{a.quality}</span>:<span className="muted">Not yet</span>}</span>
    <span role="cell" className="muted date">{dateOf(a)}</span>
    <span role="cell" className="chev"><ArrowRight size={16}/></span>
   </motion.div>)}</AnimatePresence>
   {!list.length&&<div className="lib-empty"><BookOpen size={22}/><strong>{q?'No matches':'Nothing here yet'}</strong><p>{q?'Try another word from the title or keyword.':'Articles show up here as soon as you start them.'}</p><button className="button primary" onClick={onNew}>Start an article <ArrowRight size={16}/></button></div>}
  </div>
 </div>;
}

type Tab='publish'|'details'|'seo'|'images'|'sources'|'history';
export function ArticlePage({id,onBack,onContinue,onToast}:{id:string;onBack:()=>void;onContinue:(kw:string)=>void;onToast:(t:string)=>void}){
 const ws=useWorkspace(),voices=voicesFor(ws.name),a=ws.articles.find(x=>x.id===id),S=makeSample(a?.keyword||'',ws.name,ws.domain),images=S.images,research=S.research,qualityChecks=S.quality;
 const art=useArticle(a?.keyword||'',a?.title||'',a?.voice||'team');
 const [tab,setTab]=useState<Tab>(a?.status==='Ready'?'publish':'details'),[editing,setEditing]=useState(false),[menu,setMenu]=useState(false),[publish,setPublish]=useState(false);
 const menuRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{const close=(e:MouseEvent)=>{if(!menuRef.current?.contains(e.target as Node)){setMenu(false);setPublish(false);}};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close);},[]);
 if(!a)return <div className="article-page"><button className="back" onClick={onBack}><ArrowLeft size={16}/>Content library</button><p className="muted">This article is no longer here.</p></div>;
 const url=`${ws.domain}/blog/${a.slug}`;
 if(a.status==='In progress')return <div className="article-page">
  <button className="back" onClick={onBack}><ArrowLeft size={16}/>Content library</button>
  <div className="draft-hero"><div><StatusChip a={a}/><h1>{a.title}</h1><Keyword size="md">{a.keyword}</Keyword></div></div>
  <section className="draft-progress"><StepTrack step={a.step||1} working={a.waiting==='us'} size="lg"/></section>
  <div className="draft-next">{a.waiting==='us'?<><LoaderCircle className="spin" size={18}/><div><strong>{a.next}</strong><p>We will let you know as soon as it is ready.</p></div></>:<><Sparkles size={18}/><div><strong>Next: {a.next}</strong><p>Everything chosen so far is saved. Pick up exactly where you left off.</p></div><button className="button primary" onClick={()=>onContinue(a.keyword)}>Continue <ArrowRight size={16}/></button></>}</div>
  <button className="button ghost danger" onClick={()=>{onToast('Draft deleted.');onBack();}}><Trash2 size={15}/>Delete draft</button>
 </div>;
 return <div className="article-page">
  <button className="back" onClick={onBack}><ArrowLeft size={16}/>Content library</button>
  <header className="ap-head">
   <div className="ap-title"><StatusChip a={a}/><span className="muted">{dateOf(a)}</span></div>
   <div className="ap-actions" ref={menuRef}>
    {editing?<button className="button primary" onClick={()=>{setEditing(false);onToast('Changes saved.');}}><Check size={16}/>Save changes</button>:<button className="button secondary" onClick={()=>setEditing(true)}><Pencil size={15}/>Edit</button>}
    {a.status==='Published'&&<><a className="button secondary" href={a.liveUrl||'#'} target="_blank" rel="noreferrer"><ExternalLink size={15}/>View live</a><button className="button primary" onClick={()=>onToast('Refreshing with the latest research. Your edits stay.')}><RefreshCw size={15}/>Refresh article</button></>}
    {a.status==='Scheduled'&&<><button className="button secondary" onClick={()=>onToast('Pick a new date and time.')}><CalendarClock size={15}/>Change date</button><button className="button primary" onClick={()=>onToast('Published.')}><Send size={15}/>Publish now</button></>}
    {a.status==='Ready'&&<button className="button primary" onClick={()=>setTab('publish')}><Send size={15}/>Publish</button>}
    <button className="icon-button bordered" aria-label="More actions" onClick={()=>setMenu(m=>!m)}><MoreHorizontal size={18}/></button>
    <AnimatePresence>{menu&&<motion.div className="pop right" initial={{opacity:0,y:-6,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-4}} transition={{duration:.18}}>
     <button onClick={()=>{onToast('Duplicated as a new draft.');setMenu(false);}}><Copy size={15}/><span><strong>Duplicate</strong></span></button>
     <button disabled={!art.ready} onClick={()=>{downloadZip(art.post,art.images);onToast('Download started: HTML, Markdown, images, schema and SEO fields.');setMenu(false);}}><Download size={15}/><span><strong>Download</strong><small>HTML, Markdown and images</small></span></button>
     <button onClick={()=>{onContinue(a.keyword);setMenu(false);}}><Sparkles size={15}/><span><strong>New article on a related search</strong></span></button>
     {a.status==='Published'&&<button onClick={()=>{onToast('Unpublished. Moved to Ready.');setMenu(false);}}><Globe size={15}/><span><strong>Unpublish</strong></span></button>}
     <button className="danger" onClick={()=>{onToast('Archived.');onBack();}}><Archive size={15}/><span><strong>Archive</strong></span></button>
    </motion.div>}</AnimatePresence>
   </div>
  </header>
  {editing&&<motion.p className="edit-hint" initial={{opacity:0}} animate={{opacity:1}}><Pencil size={14}/>Click anywhere in the article to edit. Your changes are kept when the article is refreshed.</motion.p>}
  <div className="ap-layout">
   <ArticleBody post={art.post} images={art.images} editable={editing} minutes={Math.round((a.words||1800)/240)}/>
   <aside className="ap-side">
    <div className="ap-tabs" role="tablist">{([['publish','Publish'],['details','Details'],['seo','SEO and GEO'],['images','Images'],['sources','Sources'],['history','History']] as const).map(([t,l])=><button key={t} role="tab" aria-selected={tab===t} className={tab===t?'on':''} onClick={()=>setTab(t)}>{tab===t&&<motion.i layoutId="ap-tab" className="ap-tab-bg" transition={spring}/>}<span>{l}</span></button>)}</div>
    <AnimatePresence mode="wait"><motion.div key={tab} className="ap-body" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.18}}>
     {tab==='publish'&&<PublishPanel post={art.post} images={art.images} ready={art.ready} onToast={onToast} onSettings={()=>{location.hash='settings';}}
      onPublished={r=>saveArticle({id:a.id,cms:r.platform,liveUrl:r.url,editUrl:r.editUrl,...(r.status==='published'?{status:'Published',publishedAt:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}:{})})}/>}
     {tab==='details'&&<dl className="facts">
      <div><dt>Keyword</dt><dd><Keyword size="sm">{a.keyword}</Keyword></dd></div>
      <div><dt>Author</dt><dd>{voices[a.voice||'team'].name}</dd></div>
      <div><dt>Length</dt><dd>{a.words?.toLocaleString()} words · {Math.round((a.words||0)/240)} min read</dd></div>
      <div><dt>Quality</dt><dd><span className={`score ${(a.quality||0)>=95?'high':''}`}>{a.quality}</span> of 100</dd></div>
      <div><dt>Sources and images</dt><dd>{a.sources} sources · {a.images} images</dd></div>
      <div><dt>URL</dt><dd className="mono">{url}</dd></div>
      <div><dt>Created</dt><dd>{a.created}</dd></div>
     </dl>}
     {tab==='seo'&&<>
      <label className="field">SEO title<input defaultValue={a.title.slice(0,60)}/><small>{Math.min(60,a.title.length)} of 60 characters</small></label>
      <label className="field">Meta description<textarea rows={3} defaultValue={S.meta}/></label>
      <label className="field">URL<div className="slug"><span>{ws.domain}/blog/</span><input defaultValue={a.slug}/></div></label>
      <ul className="checks">{qualityChecks.map(c=><li key={c.label}><span className="ok"><Check size={12} strokeWidth={3}/></span>{c.label}</li>)}<li><span className="ok"><ShieldCheck size={12}/></span>Article and FAQ schema included</li></ul>
     </>}
     {tab==='images'&&<>{images.slice(0,a.images).map((im,i)=><div key={im.alt} className="image-row">{art.images[i]?<img className="thumb-img" src={art.images[i]} alt=""/>:<span className="thumb"/>}<div><label className="field compact">Alt text<textarea rows={2} defaultValue={im.alt}/></label><button className="link-btn" onClick={()=>onToast('A new version of this image is on its way.')}><RefreshCw size={13}/>New version</button></div></div>)}</>}
     {tab==='sources'&&<ul className="sources">{research.slice(0,a.sources).map(r=><li key={r.text}><span className="finding-kind">{r.kind}</span><p>{r.text}</p><span className="finding-src"><ExternalLink size={11}/>{r.source}</span></li>)}</ul>}
     {tab==='history'&&<ol className="timeline">{[
      a.status==='Published'&&{t:`Published · ${a.publishedAt}`,d:url},a.status==='Scheduled'&&{t:`Scheduled for ${a.scheduledFor}`,d:'Goes live automatically'},
      {t:'Ready to publish',d:`Quality ${a.quality} · ${a.words?.toLocaleString()} words`},{t:'Blog structure picked',d:'Step by step'},{t:'Research done',d:`${a.sources} sources`},{t:'Plan approved',d:'Step-by-step guide'},{t:`Started · ${a.created}`,d:a.keyword}].filter(Boolean).map((e,i)=>{const x=e as {t:string;d:string};return <li key={x.t}><span className={i===0?'now':''}/><strong>{x.t}</strong><small>{x.d}</small></li>;})}
     </ol>}
    </motion.div></AnimatePresence>
   </aside>
  </div>
 </div>;
}
