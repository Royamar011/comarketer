import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AnimatePresence,animate,motion,useReducedMotion} from 'motion/react';
import {Check,LoaderCircle,Search,Sparkles,type LucideIcon} from 'lucide-react';
export const ease=[.22,.7,.2,1] as const;
export const spring={type:'spring',stiffness:420,damping:30} as const;

export function Tile({icon:Icon,size='md'}:{icon:LucideIcon;size?:'sm'|'md'|'lg'}){
 return <span className={`tile ${size}`} aria-hidden="true"><Icon strokeWidth={2.2}/></span>;
}

// A search keyword, shown as what it is: a query, not a sentence.
export function Keyword({children,size='md',onClick,muted}:{children:string;size?:'sm'|'md'|'lg';onClick?:()=>void;muted?:boolean}){
 const body=<><Search size={size==='lg'?18:size==='sm'?12:14} strokeWidth={2.4}/><span>{children}</span></>;
 return onClick?<button type="button" className={`kw kw-${size} ${muted?'muted':''}`} onClick={onClick}>{body}</button>:<span className={`kw kw-${size} ${muted?'muted':''}`}>{body}</span>;
}

export function Nudge({children,delay=.3,tone='tip'}:{children:ReactNode;delay?:number;tone?:'tip'|'pick'}){
 return <motion.div className={`nudge ${tone}`} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay,duration:.4,ease}}><Sparkles size={15}/><p>{children}</p></motion.div>;
}
export function OurPick(){return <span className="our-pick"><Sparkles size={12}/>Our pick</span>;}

// Numbers count to their value once, so changes are noticed.
export function Ticker({value}:{value:number}){
 const still=useReducedMotion(),[n,setN]=useState(still?value:0),prev=useRef(0);
 useEffect(()=>{if(still){setN(value);return;}const c=animate(prev.current,value,{duration:.6,ease,onUpdate:v=>setN(Math.round(v))});prev.current=value;return()=>c.stop();},[value,still]);
 return <>{n.toLocaleString('en-US')}</>;
}

// Words appear at reading pace with a cursor, the way a writer produces them.
export function TypeStream({text,speed=28,onDone,cursor=true}:{text:string;speed?:number;onDone?:()=>void;cursor?:boolean}){
 const still=useReducedMotion(),words=text.split(' '),[i,setI]=useState(still?words.length:0);
 useEffect(()=>{if(i>=words.length){onDone?.();return;}const t=setTimeout(()=>setI(x=>x+1),speed);return()=>clearTimeout(t);},[i]);
 return <>{words.slice(0,i).join(' ')}{cursor&&i<words.length&&<span className="cursor"/>}</>;
}

// Advances as work completes. In the design preview, timings are simulated.
export function useSteps(count:number,ms:number,onDone?:()=>void){
 const [at,setAt]=useState(0),done=useRef(onDone);done.current=onDone;
 useEffect(()=>{if(at>=count){done.current?.();return;}const t=setTimeout(()=>setAt(a=>a+1),ms);return()=>clearTimeout(t);},[at,count,ms]);
 return at;
}
export function WorkList({steps,at}:{steps:string[];at:number}){
 return <ol className="work-list">{steps.map((s,i)=><li key={s} className={i<at?'done':i===at?'active':''}>
  <span className="work-mark">{i<at?<motion.span initial={{scale:0}} animate={{scale:1}} transition={spring}><Check size={12} strokeWidth={3}/></motion.span>:i===at?<LoaderCircle className="spin" size={13}/>:null}</span><span>{s}</span>
 </li>)}</ol>;
}
export function Ring({value,size=44}:{value:number;size?:number}){
 const r=size/2-4,c=2*Math.PI*r;
 return <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true"><circle cx={size/2} cy={size/2} r={r} className="ring-bg"/><motion.circle cx={size/2} cy={size/2} r={r} className="ring-fg" strokeDasharray={c} initial={false} animate={{strokeDashoffset:c*(1-Math.min(1,value))}} transition={{duration:.6,ease}}/></svg>;
}

export function Toast({text,onDone}:{text:string|null;onDone:()=>void}){
 useEffect(()=>{if(!text)return;const t=setTimeout(onDone,3200);return()=>clearTimeout(t);},[text]);
 return <AnimatePresence>{text&&<motion.div className="toast" role="status" initial={{opacity:0,y:14,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8}} transition={{duration:.3,ease}}><Check size={16}/>{text}</motion.div>}</AnimatePresence>;
}
