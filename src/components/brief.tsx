import {Fragment,useEffect,useState,type ReactNode} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {Check,Database,Pencil,TriangleAlert,X} from 'lucide-react';
import {ease} from './ui';
import {useWorkspace} from '../workspace';
import {parse,type Block,type Section} from '../content/context';
import {AiEdit,applyNote} from './ai-edit';

// **bold** only; everything else is plain text.
const inline=(t:string):ReactNode=>t.split(/(\*\*[^*]+\*\*)/).map((p,i)=>p.startsWith('**')?<strong key={i}>{p.slice(2,-2)}</strong>:<Fragment key={i}>{p}</Fragment>);

function Render({b}:{b:Block}){
 switch(b.t){
  case 'h3':return <h3>{inline(b.text)}</h3>;
  case 'p':return <p>{inline(b.text)}</p>;
  case 'quote':return <div className="confirm-note"><TriangleAlert size={16}/><p>{inline(b.text.replace(/^\*\*Please confirm:\*\*\s*/,''))}</p></div>;
  case 'ul':return <ul>{b.items.map((x,i)=><li key={i}>{inline(x)}</li>)}</ul>;
  case 'ol':return <ol>{b.items.map((x,i)=><li key={i}>{inline(x)}</li>)}</ol>;
  case 'table':{const [head,...body]=b.rows,blank=head.every(c=>!c);
   return <div className="md-table"><table>{!blank&&<thead><tr>{head.map((c,i)=><th key={i}>{c}</th>)}</tr></thead>}<tbody>{(blank?body:body).map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{inline(c)}</td>)}</tr>)}</tbody></table></div>;}
 }
}

function SavedDrawer({onClose}:{onClose:()=>void}){
 const ws=useWorkspace();
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[]);
 return <><motion.button aria-label="Close saved research" className="scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
  <motion.aside className="drawer" role="dialog" aria-label="Saved research" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{duration:.4,ease}}>
   <header><h2><Database size={18}/>Saved research</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></header>
   <p className="muted">{ws.saved} pages kept in full. Articles look up details here, such as a case study result or exact feature wording, so nothing is written from memory.</p>
   {ws.groups.map(g=><section key={g.group} className="saved-group"><div className="saved-head"><strong>{g.group}</strong><span className="mono">{g.count}</span></div>
    <ul>{g.pages.map(p=><li key={p} className="mono">{p.startsWith('/')?ws.domain+p:p}</li>)}{g.count>g.pages.length&&<li className="muted">and {g.count-g.pages.length} more</li>}</ul></section>)}
  </motion.aside></>;
}

// The full context.md, sectioned and readable. Reviewed once, edited in place.
export function BriefView({animate=false}:{animate?:boolean}){
 const ws=useWorkspace(),briefSections=parse(ws.md);
 const [sections,setSections]=useState<Section[]>(briefSections),[prev,setPrev]=useState<Section[]|null>(null),[changed,setChanged]=useState<string[]>([]),[active,setActive]=useState(briefSections[0].id),[saved,setSaved]=useState(false),[editing,setEditing]=useState<string|null>(null),[justSaved,setJustSaved]=useState<string|null>(null);
 useEffect(()=>{if(!justSaved)return;const t=setTimeout(()=>setJustSaved(null),2000);return()=>clearTimeout(t);},[justSaved]);
 return <div className="brief-layout">
  <nav className="brief-nav" aria-label="Brief sections">
   {sections.map(s=><a key={s.id} href={`#sec-${s.id}`} className={active===s.id?'on':''} onClick={()=>setActive(s.id)}>{s.title}{s.blocks.some(b=>b.t==='quote')&&<i className="dot-warn" aria-label="Needs your answer"/>}</a>)}
   <button className="saved-link" onClick={()=>setSaved(true)}><Database size={14}/>{ws.saved} pages saved</button>
  </nav>
  <div className="brief-col">
  <article className="brief-doc md-doc">
   <div className="doc-title"><img src={ws.logo} alt="" width={30} height={30} onError={e=>(e.currentTarget.style.visibility='hidden')}/><h1>{ws.name}</h1><span className="mono">context.md</span></div>
   {sections.map((s,i)=><motion.section key={s.id} id={`sec-${s.id}`} className={changed.includes(s.id)?'changed':''} initial={animate?{opacity:0,y:10}:false} animate={{opacity:1,y:0}} transition={{delay:i*.04,duration:.4,ease}} onMouseEnter={()=>setActive(s.id)}>
    <header><h2>{s.title}{changed.includes(s.id)&&<motion.span className="upd-tag" initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}}>Updated from your note</motion.span>}</h2>
     <AnimatePresence mode="wait">{justSaved===s.id?<motion.span key="saved" className="saved-flash" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}><Check size={14}/>Saved. New articles use this.</motion.span>
      :<motion.button key="edit" className={`edit-btn ${editing===s.id?'on':''}`} initial={{opacity:0}} animate={{opacity:1}} onClick={()=>{if(editing===s.id){setEditing(null);setJustSaved(s.id);}else setEditing(s.id);}}>{editing===s.id?<><Check size={14}/>Done</>:<><Pencil size={14}/>Edit</>}</motion.button>}</AnimatePresence></header>
    <div className="sec-body" contentEditable={editing===s.id} suppressContentEditableWarning>{s.blocks.map((b,j)=><Render key={j} b={b}/>)}</div>
   </motion.section>)}
  </article>
  <AiEdit pending={changed.length} onApply={note=>{const r=applyNote(sections,note);setPrev(sections);setSections(r.next);setChanged(r.changed);setTimeout(()=>document.getElementById(`sec-${r.changed[0]}`)?.scrollIntoView({behavior:'smooth',block:'center'}),80);}}
   onUndo={()=>{if(prev)setSections(prev);setPrev(null);setChanged([]);}} onKeep={()=>{setPrev(null);setChanged([]);}}/>
  </div>
  <AnimatePresence>{saved&&<SavedDrawer onClose={()=>setSaved(false)}/>}</AnimatePresence>
 </div>;
}
