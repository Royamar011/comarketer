import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AnimatePresence,animate,motion,useReducedMotion} from 'motion/react';
import {Check,LoaderCircle,Search,Sparkles,TriangleAlert,type LucideIcon} from 'lucide-react';
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

// Messages that report a problem look different, so a failed save is never mistaken for a saved one.
const isProblem=(t:string)=>/^(Could not|That did not|Your browser blocked|Not saved|Something went wrong)/.test(t);
export function Toast({text,onDone}:{text:string|null;onDone:()=>void}){
 useEffect(()=>{if(!text)return;const t=setTimeout(onDone,isProblem(text)?5200:3200);return()=>clearTimeout(t);},[text]);
 const bad=!!text&&isProblem(text);
 return <AnimatePresence>{text&&<motion.div key={text} className={`toast ${bad?'bad':''}`} role={bad?'alert':'status'} initial={{opacity:0,y:18,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10,scale:.98}} transition={{type:'spring',stiffness:380,damping:28}}>
  <motion.span className="toast-icon" initial={{scale:0,rotate:-30}} animate={{scale:1,rotate:0}} transition={{delay:.08,...spring}}>{bad?<TriangleAlert size={16}/>:<Check size={16} strokeWidth={3}/>}</motion.span>{text}
  {!bad&&<motion.i className="toast-timer" initial={{scaleX:1}} animate={{scaleX:0}} transition={{duration:3.2,ease:'linear'}}/>}
 </motion.div>}</AnimatePresence>;
}

// A thin bar across the top: a quick sweep on every page change, and a slow glide while data loads.
export function RouteBar({routeKey,busy}:{routeKey:string;busy:boolean}){
 return <div className="route-bar" aria-hidden="true">
  {busy&&<i className="route-busy"/>}
  <motion.i key={routeKey} className="route-sweep" initial={{scaleX:0,opacity:1}} animate={{scaleX:1,opacity:0}} transition={{scaleX:{duration:.5,ease},opacity:{delay:.42,duration:.3}}}/>
 </div>;
}

// A small burst of brand-coloured dots for moments worth marking: a draft finished, a post sent.
const burstColors=['var(--blue)','var(--butter)','#1F7A4D','var(--blue-line)','#F2A65A'];
export function Burst({count=14,radius=46}:{count?:number;radius?:number}){
 const still=useReducedMotion();
 const dots=useRef(Array.from({length:count},(_,i)=>{const a=(i/count)*Math.PI*2+Math.random()*.4,r=radius*(.7+Math.random()*.5);return {x:Math.cos(a)*r,y:Math.sin(a)*r,s:4+Math.random()*4,c:burstColors[i%burstColors.length],d:Math.random()*.08};})).current;
 if(still)return null;
 return <span className="burst" aria-hidden="true">{dots.map((p,i)=><motion.i key={i} style={{width:p.s,height:p.s,background:p.c}} initial={{x:0,y:0,scale:0,opacity:1}} animate={{x:p.x,y:p.y,scale:[0,1.2,.6],opacity:[1,1,0]}} transition={{duration:.85,delay:p.d,ease:[.15,.8,.3,1]}}/>)}</span>;
}

// Placeholders shaped like what is coming, so the page does not jump when it arrives.
export function Skel({w='100%',h=14,r=7,className=''}:{w?:number|string;h?:number;r?:number;className?:string}){
 return <span className={`skel ${className}`} style={{width:w,height:h,borderRadius:r}} aria-hidden="true"/>;
}
