import {motion,useReducedMotion} from 'motion/react';
import {LOGO_RATIO,LOGO_VIEWBOX,bar,dot,letters,ring} from './logo-paths';
const ease=[.22,.7,.2,1] as const;

// The logo, all in ink by default (tone="color" puts the dot and mark in cobalt).
// tone="white" for dark backgrounds. Files for use outside the app are in public/brand/.
export function Logo({size=26,tone='ink'}:{size?:number;tone?:'color'|'ink'|'white'}){
 const h=Math.round(size*.82),word=tone==='white'?'#fff':'var(--ink)',accent=tone==='color'?'var(--blue)':word;
 return <svg className="logo" role="img" aria-label="comarketer" viewBox={LOGO_VIEWBOX} height={h} width={Math.round(h*LOGO_RATIO)}>
  <path fill={word} fillRule="evenodd" d={letters.join(' ')}/><path fill={accent} fillRule="evenodd" d={`${dot} ${ring} ${bar}`}/>
 </svg>;
}

/*
 First impression only, played once. The mark builds first: the line draws, the ring drops onto it.
 Then the word rises in letter by letter, and the dot lands last. Nothing loops.
*/
export function BrandIntro(){
 const still=useReducedMotion();
 if(still)return <div className="intro"><Logo size={80}/></div>;
 const word=.55;
 return <div className="intro">
  <svg className="intro-logo" role="img" aria-label="comarketer" viewBox={LOGO_VIEWBOX}>
   <motion.path fill="var(--ink)" fillRule="evenodd" d={bar} style={{transformBox:'fill-box',transformOrigin:'left center'}} initial={{scaleX:0}} animate={{scaleX:1}} transition={{duration:.5,ease}}/>
   <motion.path fill="var(--ink)" fillRule="evenodd" d={ring} style={{transformBox:'fill-box',transformOrigin:'center bottom'}} initial={{y:-260,opacity:0,scaleY:1}} animate={{y:0,opacity:1,scaleY:[1,1,.86,1]}} transition={{y:{delay:.3,type:'spring',stiffness:420,damping:15},opacity:{delay:.3,duration:.15},scaleY:{delay:.3,duration:.6,times:[0,.45,.6,1]}}}/>
   {letters.map((d,i)=><motion.path key={i} fill="var(--ink)" fillRule="evenodd" d={d} initial={{y:90,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:word+i*.055,duration:.55,ease}}/>)}
   <motion.path fill="var(--ink)" fillRule="evenodd" d={dot} style={{transformBox:'fill-box',transformOrigin:'center'}} initial={{y:-200,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:word+letters.length*.055+.15,type:'spring',stiffness:520,damping:14}}/>
  </svg>
 </div>;
}
