import {motion,useReducedMotion} from 'motion/react';
const ease=[.22,.7,.2,1] as const;

// Wordmark only. The logo mark is not confirmed yet, so no symbol is shown anywhere.
export function Logo({size=26}:{size?:number}){
 return <span className="logo" style={{fontSize:Math.round(size*.8)}}>comarketer<b>.</b></span>;
}

/*
 First impression only. "content" and "marketer" sit apart. The letters of "ntent" fall away one by one,
 "marketer" glides in to meet "co", then the period lands. Nothing changes case, nothing repeats.
*/
const fall=['n','t','e','n','t'];
export function BrandIntro(){
 const still=useReducedMotion();
 if(still)return <div className="intro" aria-label="comarketer"><span className="intro-word">comarketer<b>.</b></span></div>;
 const start=.9;
 return <div className="intro" aria-label="comarketer">
  <span className="intro-word" aria-hidden="true">
   <motion.span initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.6,ease}}>co</motion.span>
   {fall.map((l,i)=><motion.span key={i} className="intro-fall" initial={{opacity:0,y:14,maxWidth:'1em'}} animate={{opacity:[0,1,1,0],y:[14,0,0,22],maxWidth:['1em','1em','1em','0em'],rotate:[0,0,0,i%2?8:-8]}} transition={{duration:start+.55+i*.06,times:[0,.35,.62+i*.03,1],ease}}>{l}</motion.span>)}
   <motion.span className="intro-gap" initial={{width:'.32em'}} animate={{width:'0em'}} transition={{delay:start+.25,duration:.5,ease}}/>
   <motion.span initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.6,delay:.12,ease}}>marketer</motion.span>
   <motion.b initial={{opacity:0,y:-18}} animate={{opacity:1,y:0}} transition={{delay:start+1.1,type:'spring',stiffness:500,damping:16}}>.</motion.b>
  </span>
 </div>;
}
