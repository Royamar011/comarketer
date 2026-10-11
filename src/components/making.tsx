import {motion} from 'motion/react';
import {Sparkles} from 'lucide-react';
import {Ring,ease,useSteps} from './ui';
import {Tick} from './steps';

export type MakeKind='ideas'|'titles'|'structure';
const copy:Record<MakeKind,{title:string;lines:string[]}>={
 ideas:{title:'Building ideas that stand out',lines:['Each idea fills a gap in the top results','Checked against your company brief','Picking the one we recommend']},
 titles:{title:'Writing five titles',lines:['Your keyword in every title','Under 60 characters, so Google shows it in full','Five different styles']},
 structure:{title:'Laying out your blog three ways',lines:['Every section answers a real question','Facts from your research placed in each section','Length matched to the top results']},
};

// Shown while choices are generated: the shape of the result builds up, so the wait shows what is coming.
export function Making({kind,seeds=[],onDone}:{kind:MakeKind;seeds?:string[];onDone:()=>void}){
 const c=copy[kind],at=useSteps(c.lines.length,750,()=>setTimeout(onDone,350));
 return <motion.div className="making" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,y:-8,transition:{duration:.2}}}>
  <header className="phase-head"><span className="eyebrow">Working on it</span><h1>{c.title}</h1></header>
  <div className="making-status"><Ring value={at/c.lines.length} size={44}/>
   <ul>{c.lines.map((l,i)=><li key={l} className={i<at?'done':i===at?'now':''}><span className="mk-dot">{i<at?<Tick size={12}/>:i===at?<motion.i animate={{scale:[1,1.4,1]}} transition={{duration:1.1,repeat:Infinity}}/>:null}</span>{l}</li>)}</ul>
  </div>
  {kind==='ideas'&&<div className="mk-ideas">{[0,1,2].map(i=><motion.div key={i} className="mk-card" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.1+i*.15,duration:.45,ease}}>
   {seeds[i]&&<motion.span className="mk-seed" initial={{opacity:0,y:-18,scale:.9}} animate={{opacity:1,y:0,scale:1}} transition={{delay:.45+i*.3,type:'spring',stiffness:380,damping:24}}><Sparkles size={11}/>{seeds[i]}</motion.span>}
   <Bar w="45%" d={.8+i*.3} h={9}/><Bar w="90%" d={.95+i*.3} h={14} dark/><Bar w="70%" d={1.05+i*.3} h={14} dark/><Bar w="100%" d={1.2+i*.3}/><Bar w="80%" d={1.3+i*.3}/>
  </motion.div>)}</div>}
  {kind==='titles'&&<div className="mk-titles">{[0,1,2,3,4].map(i=><div key={i} className="mk-title"><Bar w={`${58+((i*17)%30)}%`} d={.2+i*.28} h={13} dark/><span className="mk-ruler"><motion.i initial={{scaleX:0}} animate={{scaleX:.62+((i*13)%30)/100}} transition={{delay:.3+i*.28,duration:.6,ease}}/></span></div>)}</div>}
  {kind==='structure'&&<div className="mk-docs">{[0,1,2].map(i=><motion.div key={i} className="thumb-doc" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.12,duration:.4,ease}}>
   <Bar w="70%" d={.2+i*.12} h={12} dark/><Bar w="100%" d={.35+i*.12} h={22} blue/>{[0,1,2,3,4,5].map(j=><Bar key={j} w={j%2?'60%':'86%'} d={.5+i*.12+j*.16}/>)}
  </motion.div>)}</div>}
 </motion.div>;
}
function Bar({w,d,h=8,dark,blue}:{w:string;d:number;h?:number;dark?:boolean;blue?:boolean}){
 return <motion.i className={`mk-bar ${dark?'dark':''} ${blue?'blue':''}`} style={{width:w,height:h}} initial={{scaleX:0,opacity:0}} animate={{scaleX:1,opacity:1}} transition={{delay:d,duration:.45,ease}}/>;
}
