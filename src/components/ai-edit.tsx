import {useEffect,useRef,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {ArrowUp,Check,Mic,RotateCcw,Sparkles,Square} from 'lucide-react';
import {ease,useSteps} from './ui';
import {Tick} from './steps';
import type {Section} from '../content/context';

type Rec={start:()=>void;stop:()=>void;onresult:((e:any)=>void)|null;onend:(()=>void)|null;interimResults:boolean;continuous:boolean;lang:string};
const Recognition:(new()=>Rec)|undefined=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;

// Which section a note is about. In the live product the model decides this (prompts/context/update-context.md).
const topics:[RegExp,RegExp][]=[[/pric|plan|trial|credit|subscription/i,/^pricing/],[/product|feature|launch|app\b|module/i,/^products/],[/customer|enterprise|smb|buyer|sell to/i,/^who-buys/],[/industr/i,/^industries/],[/region|countr|office|global/i,/^at-a-glance/],[/keyword|position|category/i,/^positioning/],[/problem|pain/i,/^problems/],[/integrat|crm|api|setup|install/i,/^integrations/]];
export function applyNote(sections:Section[],note:string):{next:Section[];changed:string[]}{
 const want=(topics.find(([r])=>r.test(note))||[,/^what-/])[1] as RegExp,id=(sections.find(s=>want.test(s.id))||sections[1]||sections[0]).id;
 const next=sections.map(s=>{if(s.id!==id)return s;
  const hasQ=s.blocks.some(b=>b.t==='quote'),add={t:'p' as const,text:`**From your note:** ${note.trim()}`};
  return {...s,blocks:hasQ?s.blocks.map(b=>b.t==='quote'?add:b):[...s.blocks,add]};});
 return {next,changed:[id]};
}

const work=['Reading your note','Checking your website again','Updating your brief'];

// Floating bar: say or type what is wrong or missing, and the brief is researched and rewritten.
export function AiEdit({onApply,onUndo,onKeep,pending}:{onApply:(note:string)=>void;onUndo:()=>void;onKeep:()=>void;pending:number}){
 const [text,setText]=useState(''),[stage,setStage]=useState<'idle'|'listening'|'working'>('idle'),[note,setNote]=useState(''),[noVoice,setNoVoice]=useState(false),rec=useRef<Rec|null>(null);
 const send=()=>{if(!text.trim())return;rec.current?.stop();setNote(text.trim());setText('');setStage('working');};
 const listen=()=>{
  if(stage==='listening'){rec.current?.stop();return;}
  if(!Recognition){setNoVoice(true);setTimeout(()=>setNoVoice(false),2600);return;}
  const r=new Recognition();r.interimResults=true;r.continuous=true;r.lang='en-US';const base=text?text+' ':'';
  r.onresult=e=>setText(base+Array.from(e.results).map((x:any)=>x[0].transcript).join(''));r.onend=()=>setStage(s=>s==='listening'?'idle':s);
  rec.current=r;r.start();setStage('listening');
 };
 return <div className="ai-edit-wrap">
  <AnimatePresence>
   {stage==='working'&&<Working key="w" note={note} onDone={()=>{onApply(note);setStage('idle');}}/>}
   {pending>0&&stage==='idle'&&<motion.div key="r" className="ai-review" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:6}} transition={{duration:.3,ease}}>
    <span className="ai-review-tick"><Tick size={14}/></span><strong>{pending} section{pending>1?'s':''} updated</strong><span className="muted">Highlighted in blue</span>
    <button className="button ghost compact" onClick={onUndo}><RotateCcw size={14}/>Undo</button><button className="button primary compact" onClick={onKeep}><Check size={14}/>Keep changes</button>
   </motion.div>}
   {noVoice&&<motion.p key="n" className="ai-hint" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}>Voice input needs Chrome or Edge. You can type instead.</motion.p>}
  </AnimatePresence>
  <motion.form className={`ai-edit ${stage}`} onSubmit={e=>{e.preventDefault();send();}} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.5,duration:.5,ease}}>
   <span className="ai-glyph"><Sparkles size={18}/></span>
   <input aria-label="Tell us what to change" placeholder={stage==='listening'?'Listening…':'Edit with AI: what is wrong or missing?'} value={text} onChange={e=>setText(e.target.value)} disabled={stage==='working'}/>
   {stage==='listening'&&<span className="ai-wave" aria-hidden="true">{[0,1,2,3,4].map(i=><motion.i key={i} animate={{scaleY:[.35,1,.35]}} transition={{duration:.9,repeat:Infinity,delay:i*.12}}/>)}</span>}
   <button type="button" className={`ai-mic ${stage==='listening'?'on':''}`} aria-label={stage==='listening'?'Stop recording':'Speak your change'} onClick={listen} disabled={stage==='working'}>{stage==='listening'?<Square size={14} fill="currentColor"/>:<Mic size={18}/>}</button>
   <button className="ai-send" aria-label="Update my brief" disabled={!text.trim()||stage==='working'}><ArrowUp size={18}/></button>
  </motion.form>
 </div>;
}

function Working({note,onDone}:{note:string;onDone:()=>void}){
 const at=useSteps(work.length,900,()=>setTimeout(onDone,300));
 useEffect(()=>{},[]);
 return <motion.div className="ai-working" initial={{opacity:0,y:12,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8}} transition={{duration:.3,ease}}>
  <p className="ai-note">“{note}”</p>
  <ul>{work.map((w,i)=><li key={w} className={i<at?'done':i===at?'now':''}><span>{i<at?<Tick size={12}/>:i===at?<i className="spin-dot"/>:null}</span>{w}</li>)}</ul>
  <span className="ai-bar"><motion.i initial={{scaleX:0}} animate={{scaleX:at/work.length}} transition={{duration:.5,ease}}/></span>
 </motion.div>;
}
