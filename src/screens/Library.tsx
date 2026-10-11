import {useEffect,useMemo,useRef,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {ArrowLeft,ArrowRight,Archive,ArchiveRestore,Check,Copy,Download,ExternalLink,LoaderCircle,MoreHorizontal,Pencil,Search,Send,ShieldCheck,Sparkles,Trash2,Globe,BookOpen,X} from 'lucide-react';
import {Keyword,ease,spring} from '../components/ui';
import {ArticleBody,readEdits} from '../components/article';
import {StepTrack} from '../components/steps';
import {voicesFor,workflowSteps,type Article,type Status} from '../data';
import {makeSample,slugify} from '../sample';
import {PublishPanel,platformNames} from '../components/publish';
import {countWords,downloadZip,useArticle} from '../article-data';
import {archiveArticles,deleteArticles,duplicateArticle,loadArticle,restoreArticles,saveArticle,useArticleEvents,useWorkspace,when,whenExact} from '../workspace';
type Filter='All'|Status|'Archived';
const filters:Filter[]=['All','In progress','Ready','Scheduled','Published','Archived'];

export function StatusChip({a}:{a:Article}){
 if(a.archivedAt)return <span className="status s-archived"><i/>Archived</span>;
 if(a.status==='In progress')return <span className={`status s-progress ${a.waiting==='us'?'working':''}`}>{a.waiting==='us'?<LoaderCircle className="spin" size={12}/>:<i/>}{a.waiting==='us'?'In progress':'Action needed'}</span>;
 return <span className={`status s-${a.status.toLowerCase()}`}><i/>{a.status==='Ready'?'Ready to publish':a.status}</span>;
}
export function StepMeter({a}:{a:Article}){
 return <span className="step-meter" aria-label={`Step ${a.step} of 4: ${workflowSteps[(a.step||1)-1]}`}>{workflowSteps.map((s,i)=><i key={s} className={i<(a.step||0)-1?'done':i===(a.step||0)-1?'now':''}/>)}<b>{workflowSteps[(a.step||1)-1]}</b></span>;
}
export const dateOf=(a:Article)=>a.archivedAt?`Archived ${when(a.archivedAt)}`:a.status==='Published'?`Published ${when(a.publishedAt)}`:a.status==='Scheduled'?`Goes live ${whenExact(a.scheduledFor)}`
 :a.status==='Ready'&&a.cms?`Draft in ${platformNames[a.cms]||a.cms}`:`Updated ${when(a.updated)}`;
const byNewest=(a:Article,b:Article)=>b.updated.localeCompare(a.updated);

// A destructive button asks once more, in place, instead of a pop-up.
function ConfirmButton({label,confirm,onConfirm,className='button ghost danger'}:{label:string;confirm:string;onConfirm:()=>void;className?:string}){
 const [armed,setArmed]=useState(false);
 useEffect(()=>{if(!armed)return;const t=setTimeout(()=>setArmed(false),4000);return()=>clearTimeout(t);},[armed]);
 return <button className={className} onClick={()=>armed?onConfirm():setArmed(true)}><Trash2 size={15}/>{armed?confirm:label}</button>;
}

export function Library({onOpen,onNew,onResume,onToast}:{onOpen:(id:string)=>void;onNew:()=>void;onResume:(id:string)=>void;onToast:(t:string)=>void}){
 const ws=useWorkspace(),voices=voicesFor(ws.name);
 const [filter,setFilter]=useState<Filter>('All'),[q,setQ]=useState(''),[picked,setPicked]=useState<string[]>([]);
 const live=useMemo(()=>ws.articles.filter(a=>!a.archivedAt).sort(byNewest),[ws.articles]),archived=useMemo(()=>ws.articles.filter(a=>a.archivedAt).sort(byNewest),[ws.articles]);
 const words=q.trim().toLowerCase().split(/\s+/).filter(Boolean);
 const list=(filter==='Archived'?archived:live).filter(a=>(filter==='All'||filter==='Archived'||a.status===filter)&&words.every(w=>`${a.title} ${a.keyword} ${a.slug||''}`.toLowerCase().includes(w)));
 const count=(f:Filter)=>f==='All'?live.length:f==='Archived'?archived.length:live.filter(a=>a.status===f).length;
 const toggle=(id:string)=>setPicked(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
 // Selections only count for rows on screen.
 const shown=picked.filter(id=>list.some(a=>a.id===id));
 const n=(k:number)=>`${k} ${k===1?'article':'articles'}`;
 const act=async(run:(ids:string[])=>Promise<boolean>,done:string)=>{const ids=shown;setPicked([]);onToast((await run(ids))?done:'That did not save. Check the dev server is running, then try again.');};
 const duplicate=async(id:string)=>{const a=await duplicateArticle(id);onToast(a?'Duplicated. The copy is at the top of the list.':'Could not duplicate. Try again.');};
 return <div className="library">
  {ws.sync==='error'&&<p className="sync-warn">Changes could not be saved to the database. Check the dev server is running. They are kept on this page until it reconnects.</p>}
  <div className="lib-bar">
   <div className="lib-tabs" role="tablist">{filters.filter(f=>f!=='Archived'||archived.length||filter==='Archived').map(f=><button key={f} role="tab" aria-selected={filter===f} className={filter===f?'on':''} onClick={()=>{setFilter(f);setPicked([]);}}>{f}<b>{count(f)}</b>{filter===f&&<motion.i layoutId="lib-tab" className="lib-tab-line" transition={spring}/>}</button>)}</div>
   <label className="lib-search"><Search size={16}/><input aria-label="Search content" placeholder="Search titles and keywords" value={q} onChange={e=>setQ(e.target.value)}/>{q&&<button className="icon-button" aria-label="Clear search" onClick={()=>setQ('')}><X size={14}/></button>}</label>
  </div>
  <AnimatePresence>{shown.length>0&&<motion.div className="bulk" initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.2}}>
   <strong>{shown.length} selected</strong>
   {filter==='Archived'?<><button onClick={()=>act(restoreArticles,`${n(shown.length)} restored.`)}><ArchiveRestore size={15}/>Restore</button><ConfirmButton className="" label="Delete forever" confirm={`Delete ${n(shown.length)}?`} onConfirm={()=>act(deleteArticles,`${n(shown.length)} deleted.`)}/></>
    :<button onClick={()=>act(archiveArticles,`${n(shown.length)} archived. Find them under Archived.`)}><Archive size={15}/>Archive</button>}
   <button className="bulk-clear" onClick={()=>setPicked([])}>Clear</button>
  </motion.div>}</AnimatePresence>
  <div className="lib-table" role="table" aria-label="Content">
   <div className="lib-head" role="row"><span role="columnheader"><input type="checkbox" aria-label="Select all" checked={shown.length===list.length&&list.length>0} onChange={e=>setPicked(e.target.checked?list.map(a=>a.id):[])}/></span><span role="columnheader">Title</span><span role="columnheader">Status</span><span role="columnheader">Author</span><span role="columnheader">Words</span><span role="columnheader">Quality</span><span role="columnheader">Date</span><span/></div>
   <AnimatePresence initial={false} mode="popLayout">{list.map((a,i)=><motion.div key={a.id} layout role="row" className={`lib-row ${picked.includes(a.id)?'picked':''}`} initial={{opacity:0,y:6}} animate={{opacity:1,y:0,transition:{delay:Math.min(i,12)*.03,duration:.3,ease}}} exit={{opacity:0,scale:.98,transition:{duration:.15}}} transition={{layout:{duration:.3,ease}}} onClick={()=>onOpen(a.id)}>
    <span role="cell" onClick={e=>e.stopPropagation()}><input type="checkbox" aria-label={`Select ${a.title}`} checked={picked.includes(a.id)} onChange={()=>toggle(a.id)}/></span>
    <span role="cell" className="lib-title"><strong>{a.title}</strong><Keyword size="sm" muted>{a.keyword}</Keyword>
     <span className="row-actions" onClick={e=>e.stopPropagation()}>{a.archivedAt?<button onClick={async()=>onToast((await restoreArticles([a.id]))?'Restored.':'Could not restore. Try again.')}>Restore</button>
      :a.status==='In progress'?<button onClick={()=>onResume(a.id)}>Continue</button>
      :<><button onClick={()=>onOpen(a.id)}>Open</button>{a.status==='Published'&&a.liveUrl&&<a href={a.liveUrl} target="_blank" rel="noreferrer">View live</a>}<button onClick={()=>duplicate(a.id)}>Duplicate</button></>}</span>
    </span>
    <span role="cell"><StatusChip a={a}/>{a.status==='In progress'&&!a.archivedAt&&<StepMeter a={a}/>}</span>
    <span role="cell" className="muted">{a.voice?voices[a.voice].name:'Not chosen yet'}</span>
    <span role="cell" className="num">{a.words?a.words.toLocaleString():<span className="muted">Not yet</span>}</span>
    <span role="cell">{a.quality?<span className={`score ${a.quality>=95?'high':''}`}>{a.quality}</span>:<span className="muted">Not yet</span>}</span>
    <span role="cell" className="muted date">{dateOf(a)}</span>
    <span role="cell" className="chev"><ArrowRight size={16}/></span>
   </motion.div>)}</AnimatePresence>
   {!list.length&&<div className="lib-empty"><BookOpen size={22}/>
    {ws.sync==='loading'&&!ws.articles.length?<><strong>Loading your articles</strong><p>One moment.</p></>
     :q?<><strong>No matches</strong><p>Try another word from the title or keyword.</p><button className="button secondary" onClick={()=>setQ('')}>Clear search</button></>
     :filter==='Archived'?<><strong>Nothing archived</strong><p>Archived articles are kept here until you restore or delete them.</p></>
     :filter!=='All'?<><strong>No {filter.toLowerCase()} articles</strong><p>They show up here as soon as one is.</p></>
     :<><strong>Nothing here yet</strong><p>Articles show up here as soon as you start them.</p><button className="button primary" onClick={onNew}>Start an article <ArrowRight size={16}/></button></>}
   </div>}
  </div>
 </div>;
}

type Tab='publish'|'details'|'seo'|'images'|'sources'|'history';
export function ArticlePage({id,onBack,onResume,onNew,onToast}:{id:string;onBack:()=>void;onResume:(id:string)=>void;onNew:(kw:string)=>void;onToast:(t:string)=>void}){
 const ws=useWorkspace(),voices=voicesFor(ws.name),a=ws.articles.find(x=>x.id===id);
 const [loaded,setLoaded]=useState<boolean|null>(null);
 useEffect(()=>{let live=true;setLoaded(null);loadArticle(id).then(ok=>{if(live)setLoaded(ok);});return()=>{live=false;};},[id]);
 if(!a)return <div className="article-page"><button className="back" onClick={onBack}><ArrowLeft size={16}/>Content library</button><p className="muted">{loaded===null?'Loading…':'This article is no longer here.'}</p></div>;
 if(a.status==='In progress'&&!a.archivedAt)return <DraftPage a={a} onBack={onBack} onResume={onResume} onToast={onToast}/>;
 // Content arrives with the full article. Until then, show nothing rather than a stand-in that then changes.
 if(loaded===null&&!a.content)return <div className="article-page"><button className="back" onClick={onBack}><ArrowLeft size={16}/>Content library</button><p className="muted"><LoaderCircle className="spin" size={14}/> Opening the article…</p></div>;
 return <FinishedPage key={a.id} a={a} voices={voices} onBack={onBack} onNew={onNew} onToast={onToast}/>;
}

function DraftPage({a,onBack,onResume,onToast}:{a:Article;onBack:()=>void;onResume:(id:string)=>void;onToast:(t:string)=>void}){
 return <div className="article-page">
  <button className="back" onClick={onBack}><ArrowLeft size={16}/>Content library</button>
  <div className="draft-hero"><div><StatusChip a={a}/><h1>{a.title}</h1><Keyword size="md">{a.keyword}</Keyword></div></div>
  <section className="draft-progress"><StepTrack step={a.step||1} working={a.waiting==='us'} size="lg"/></section>
  <div className="draft-next"><Sparkles size={18}/><div><strong>Next: {a.next||'Pick up where you left off'}</strong><p>Everything chosen so far is saved. Pick up exactly where you left off.</p></div><button className="button primary" onClick={()=>onResume(a.id)}>Continue <ArrowRight size={16}/></button></div>
  <ConfirmButton label="Delete draft" confirm="Click again to delete it for good" onConfirm={async()=>{const ok=await deleteArticles([a.id]);onToast(ok?'Draft deleted.':'Could not delete. Try again.');if(ok)onBack();}}/>
 </div>;
}

function FinishedPage({a,voices,onBack,onNew,onToast}:{a:Article;voices:ReturnType<typeof voicesFor>;onBack:()=>void;onNew:(kw:string)=>void;onToast:(t:string)=>void}){
 const ws=useWorkspace(),S=useMemo(()=>makeSample(a.keyword,ws.name,ws.domain),[a.keyword,ws.name,ws.domain]);
 const art=useArticle(a.keyword,a.title,a.voice||'team',a.content),post=art.post;
 const [tab,setTab]=useState<Tab>(a.status==='Ready'&&!a.archivedAt?'publish':'details'),[editing,setEditing]=useState(false),[menu,setMenu]=useState(false),[version,setVersion]=useState(0);
 const menuRef=useRef<HTMLDivElement>(null),bodyRef=useRef<HTMLElement>(null);
 useEffect(()=>{const close=(e:MouseEvent)=>{if(!menuRef.current?.contains(e.target as Node))setMenu(false);};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close);},[]);
 const url=`${ws.domain}/blog/${post.slug}`,words=a.words||countWords(post);
 // Saves the whole article, so later edits, copies, downloads and publishing all use the edited version.
 const saveContent=(next:typeof post,label:string,extra:Partial<Article>={})=>saveArticle({id:a.id,content:next,title:next.title,slug:next.slug,words:countWords(next),...extra},{label}).then(ok=>{onToast(ok?'Changes saved.':'Could not save. Your changes are still on this page; try again.');return ok;});
 const saveEdits=async()=>{if(!bodyRef.current)return;const next=readEdits(bodyRef.current,post);setEditing(false);setVersion(v=>v+1);await saveContent(next,'Edited');};
 const cancelEdits=()=>{setEditing(false);setVersion(v=>v+1);};
 const doMenu=(f:()=>void)=>()=>{setMenu(false);f();};
 return <div className="article-page">
  <button className="back" onClick={onBack}><ArrowLeft size={16}/>Content library</button>
  <header className="ap-head">
   <div className="ap-title"><StatusChip a={a}/><span className="muted">{dateOf(a)}</span></div>
   <div className="ap-actions" ref={menuRef}>
    {editing?<><button className="button ghost" onClick={cancelEdits}>Cancel</button><button className="button primary" onClick={saveEdits}><Check size={16}/>Save changes</button></>
     :!a.archivedAt&&<button className="button secondary" onClick={()=>setEditing(true)}><Pencil size={15}/>Edit</button>}
    {a.archivedAt?<button className="button primary" onClick={async()=>onToast((await restoreArticles([a.id]))?'Restored.':'Could not restore. Try again.')}><ArchiveRestore size={15}/>Restore</button>
     :a.status==='Published'?a.liveUrl&&<a className="button secondary" href={a.liveUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/>View live</a>
     :a.status==='Scheduled'?a.editUrl&&<a className="button secondary" href={a.editUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open in {platformNames[a.cms||'']||'your blog'}</a>
     :!editing&&<button className="button primary" onClick={()=>setTab('publish')}><Send size={15}/>Publish</button>}
    <button className="icon-button bordered" aria-label="More actions" aria-expanded={menu} onClick={()=>setMenu(m=>!m)}><MoreHorizontal size={18}/></button>
    <AnimatePresence>{menu&&<motion.div className="pop right" initial={{opacity:0,y:-6,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-4}} transition={{duration:.18}}>
     <button onClick={doMenu(async()=>{const c=await duplicateArticle(a.id);onToast(c?'Duplicated. The copy is in the content library.':'Could not duplicate. Try again.');})}><Copy size={15}/><span><strong>Duplicate</strong><small>A copy to rework, not linked to your blog</small></span></button>
     <button disabled={!art.ready} onClick={doMenu(()=>{downloadZip(post,art.images);onToast('Download started: HTML, Markdown, images, schema and SEO fields.');})}><Download size={15}/><span><strong>Download</strong><small>HTML, Markdown and images</small></span></button>
     <button onClick={doMenu(()=>onNew(a.keyword))}><Sparkles size={15}/><span><strong>New article on a related search</strong></span></button>
     {(a.status==='Published'||a.status==='Scheduled')&&<button onClick={doMenu(async()=>{const ok=await saveArticle({id:a.id,status:'Ready',scheduledFor:undefined,publishedAt:undefined,liveUrl:undefined});onToast(ok?`Moved back to Ready. The post stays on ${platformNames[a.cms||'']||'your blog'} until you remove it there.`:'Could not save. Try again.');})}><Globe size={15}/><span><strong>Move back to Ready</strong><small>Does not remove it from your blog</small></span></button>}
     {!a.archivedAt&&<button className="danger" onClick={doMenu(async()=>{const ok=await archiveArticles([a.id]);onToast(ok?'Archived. Find it under Archived in the content library.':'Could not archive. Try again.');if(ok)onBack();})}><Archive size={15}/><span><strong>Archive</strong></span></button>}
    </motion.div>}</AnimatePresence>
   </div>
  </header>
  {a.archivedAt&&<div className="draft-next"><Archive size={18}/><div><strong>This article is archived</strong><p>It is hidden from Home and the content library. Restore it to work on it again.</p></div>
   <ConfirmButton label="Delete forever" confirm="Click again to delete it for good" onConfirm={async()=>{const ok=await deleteArticles([a.id]);onToast(ok?'Deleted.':'Could not delete. Try again.');if(ok)onBack();}}/></div>}
  {editing&&<motion.p className="edit-hint" initial={{opacity:0}} animate={{opacity:1}}><Pencil size={14}/>Click anywhere in the article to edit. Save keeps your changes for copying, downloading and publishing.</motion.p>}
  <div className="ap-layout">
   <ArticleBody key={version} bodyRef={bodyRef} post={post} images={art.images} editable={editing} minutes={Math.max(1,Math.round(words/240))}/>
   <aside className="ap-side">
    <div className="ap-tabs" role="tablist">{([['publish','Publish'],['details','Details'],['seo','SEO and GEO'],['images','Images'],['sources','Sources'],['history','History']] as const).map(([t,l])=><button key={t} role="tab" aria-selected={tab===t} className={tab===t?'on':''} onClick={()=>setTab(t)}>{tab===t&&<motion.i layoutId="ap-tab" className="ap-tab-bg" transition={spring}/>}<span>{l}</span></button>)}</div>
    <AnimatePresence mode="wait"><motion.div key={tab} className="ap-body" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.18}}>
     {tab==='publish'&&(editing?<p className="muted">Save or cancel your edits first, so what you publish is what you see.</p>
      :<PublishPanel article={a} post={post} images={art.images} ready={art.ready} onToast={onToast} onSettings={()=>{location.hash='settings';}}/>)}
     {tab==='details'&&<dl className="facts">
      <div><dt>Keyword</dt><dd><Keyword size="sm">{a.keyword}</Keyword></dd></div>
      <div><dt>Author</dt><dd>{voices[a.voice||'team'].name}</dd></div>
      <div><dt>Length</dt><dd>{words.toLocaleString()} words · {Math.max(1,Math.round(words/240))} min read</dd></div>
      <div><dt>Quality</dt><dd>{a.quality?<><span className={`score ${a.quality>=95?'high':''}`}>{a.quality}</span> of 100</>:'Not checked yet'}</dd></div>
      <div><dt>Sources and images</dt><dd>{a.sources??S.research.length} sources · {post.images.length} images</dd></div>
      <div><dt>{a.status==='Published'?'Live at':'URL'}</dt><dd className="mono">{a.status==='Published'&&a.liveUrl?<a href={a.liveUrl} target="_blank" rel="noreferrer">{a.liveUrl}</a>:url}</dd></div>
      {a.cms&&<div><dt>Blog</dt><dd>{platformNames[a.cms]||a.cms}{a.editUrl&&<> · <a href={a.editUrl} target="_blank" rel="noreferrer">Open</a></>}</dd></div>}
      <div><dt>Created</dt><dd>{when(a.created)}</dd></div>
      <div><dt>Last change</dt><dd>{when(a.updated)}</dd></div>
     </dl>}
     {tab==='seo'&&<SeoTab key={post.slug+post.metaTitle+post.metaDescription} post={post} domain={ws.domain} checks={S.quality} onSave={(t,d,s)=>saveContent({...post,metaTitle:t,metaDescription:d,slug:s},'SEO fields changed')}/>}
     {tab==='images'&&<>{post.images.map((im,i)=><div key={im.name} className="image-row">{art.images[i]?<img className="thumb-img" src={art.images[i]} alt=""/>:<span className="thumb"/>}<div>
      <label className="field compact">Alt text<textarea rows={2} defaultValue={im.alt} onBlur={e=>{const alt=e.target.value.trim();if(alt&&alt!==im.alt)saveContent({...post,images:post.images.map((x,j)=>j===i?{...x,alt}:x)},'Alt text changed');}}/></label>
      <small className="muted">{i===post.featured?'Featured image':S.images[i]?.place||''}</small></div></div>)}<p className="footnote">Alt text saves when you click away.</p></>}
     {tab==='sources'&&<ul className="sources">{S.research.slice(0,a.sources??S.research.length).map(r=><li key={r.text}><span className="finding-kind">{r.kind}</span><p>{r.text}</p><span className="finding-src"><ExternalLink size={11}/>{r.source}</span></li>)}</ul>}
     {tab==='history'&&<History id={a.id} version={a.updated}/>}
    </motion.div></AnimatePresence>
   </aside>
  </div>
 </div>;
}

function SeoTab({post,domain,checks,onSave}:{post:ReturnType<typeof useArticle>['post'];domain:string;checks:{label:string}[];onSave:(title:string,description:string,slug:string)=>void}){
 const [t,setT]=useState(post.metaTitle),[d,setD]=useState(post.metaDescription),[s,setS]=useState(post.slug);
 const slug=slugify(s),changed=t.trim()!==post.metaTitle||d.trim()!==post.metaDescription||slug!==post.slug;
 return <form onSubmit={e=>{e.preventDefault();if(t.trim()&&slug)onSave(t.trim(),d.trim(),slug);}}>
  <label className="field">SEO title<input value={t} onChange={e=>setT(e.target.value)} maxLength={120}/><small className={t.length>60?'over':''}>{t.length} of 60 characters{t.length>60?'. Google may cut the rest.':''}</small></label>
  <label className="field">Meta description<textarea rows={3} value={d} onChange={e=>setD(e.target.value)} maxLength={320}/><small className={d.length>160?'over':''}>{d.length} of 160 characters</small></label>
  <label className="field">URL<div className="slug"><span>{domain}/blog/</span><input value={s} onChange={e=>setS(e.target.value)} onBlur={()=>setS(slugify(s))}/></div></label>
  {changed&&<div className="seo-save"><button type="button" className="button ghost compact" onClick={()=>{setT(post.metaTitle);setD(post.metaDescription);setS(post.slug);}}>Undo</button><button className="button primary compact" disabled={!t.trim()||!slug}><Check size={14}/>Save SEO fields</button></div>}
  <ul className="checks">{checks.map(c=><li key={c.label}><span className="ok"><Check size={12} strokeWidth={3}/></span>{c.label}</li>)}<li><span className="ok"><ShieldCheck size={12}/></span>Article and FAQ schema included</li></ul>
 </form>;
}

const isoLike=/^\d{4}-\d\d-\d\dT/;
function History({id,version}:{id:string;version:string}){
 const events=useArticleEvents(id,version);
 if(!events)return <p className="muted"><LoaderCircle className="spin" size={14}/> Loading…</p>;
 if(!events.length)return <p className="muted">Nothing recorded yet. Changes show up here as they happen.</p>;
 return <ol className="timeline">{events.map((e,i)=><li key={i}><span className={i===0?'now':''}/><strong>{e.label}</strong><small>{isoLike.test(e.detail)?whenExact(e.detail):e.detail}{e.detail?' · ':''}{when(e.at)}</small></li>)}</ol>;
}
