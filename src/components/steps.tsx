import {motion} from 'motion/react';
import {ClipboardList,LayoutList,PenLine,Search} from 'lucide-react';
import {workflowSteps} from '../data';
const ease=[.22,.7,.2,1] as const;
export const stepIcons=[ClipboardList,Search,LayoutList,PenLine];

export function Tick({delay=0,size=14}:{delay?:number;size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:.4,delay,ease}}/></svg>;
}

/*
 The four steps as one motion graphic. On arrival the line fills up to the current step,
 finished steps draw their tick, and the current step gets a soft ring (or a spinning arc while we work on it).
 step runs 1 to 4; 5 means every step is finished.
*/
export function StepTrack({step,working=false,size='md'}:{step:number;working?:boolean;size?:'sm'|'md'|'lg'}){
 const n=workflowSteps.length,progress=Math.min(1,(Math.max(1,step)-1)/(n-1));
 return <div className={`track track-${size}`} role="img" aria-label={step>n?'All steps done':`Step ${step} of ${n}: ${workflowSteps[step-1]}`}>
  <span className="track-line"><motion.span initial={{scaleX:0}} animate={{scaleX:progress}} transition={{duration:.8,delay:.15,ease}}/></span>
  {workflowSteps.map((label,i)=>{const Icon=stepIcons[i],state=i<step-1?'done':i===step-1?'now':'todo',d=.15+i*.12;
   return <motion.div key={label} className={`node ${state}`} initial={{opacity:0,scale:.7}} animate={{opacity:1,scale:1}} transition={{delay:d,type:'spring',stiffness:420,damping:24}}>
    <span className="node-dot">
     {state==='done'?<Tick delay={d+.2} size={size==='sm'?13:16}/>:<Icon size={size==='sm'?14:size==='lg'?20:17} strokeWidth={2.2}/>}
     {state==='now'&&!working&&<motion.i className="node-ring" animate={{scale:[1,1.55],opacity:[.45,0]}} transition={{duration:1.8,repeat:Infinity,ease:'easeOut',delay:d+.4}}/>}
     {state==='now'&&working&&<motion.svg className="node-arc" viewBox="0 0 40 40" aria-hidden="true" animate={{rotate:360}} transition={{duration:1.4,repeat:Infinity,ease:'linear'}}><circle cx="20" cy="20" r="18" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="30 84"/></motion.svg>}
    </span>
    <span className="node-label">{label}</span>
   </motion.div>;})}
 </div>;
}
