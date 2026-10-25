import {useEffect,useRef} from 'react';
import {animate,motion,useReducedMotion} from 'motion/react';
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
 First impression, played once. "content" and "marketer" sit apart. The letters of "ntent" fall away one by one,
 "marketer" glides in to meet "co" and the period lands. Then the typed word gives way to the real logo:
 the mark's line draws and its ring drops onto it.
*/
const fall=['n','t','e','n','t'];
export function BrandIntro(){
 const still=useReducedMotion();
 if(still)return <div className="intro"><Logo size={80}/></div>;
 const start=.9,swap=start+1.6,word=useRef<HTMLSpanElement>(null),target=useRef<SVGPathElement>(null);
 // Just before the swap, the typed word glides onto the logo's letters (measured, so it fits any screen width).
 useEffect(()=>{if(still)return;const t=setTimeout(()=>{const w=word.current,g=target.current;if(!w||!g)return;
  // Scale from the top-left corner, then line the typed baseline up with the bottom of the logo's letters.
  const a=w.getBoundingClientRect(),b=g.getBoundingClientRect(),k=b.width/a.width,base=w.querySelector('.intro-base')!.getBoundingClientRect().top;
  animate(w,{x:b.left-a.left,y:b.bottom-a.top-(base-a.top)*k,scale:k},{duration:.4,ease});},(swap-.45)*1000);return()=>clearTimeout(t);},[still]);
 return <div className="intro" aria-label="comarketer">
  <motion.span ref={word} className="intro-word" aria-hidden="true" initial={{opacity:1}} animate={{opacity:0}} transition={{delay:swap,duration:.25}}>
   <motion.span initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.6,ease}}>co</motion.span>
   {fall.map((l,i)=><motion.span key={i} className="intro-fall" initial={{opacity:0,y:14,maxWidth:'1em'}} animate={{opacity:[0,1,1,0],y:[14,0,0,22],maxWidth:['1em','1em','1em','0em'],rotate:[0,0,0,i%2?8:-8]}} transition={{duration:start+.55+i*.06,times:[0,.35,.62+i*.03,1],ease}}>{l}</motion.span>)}
   <motion.span className="intro-gap" initial={{width:'.32em'}} animate={{width:'0em'}} transition={{delay:start+.25,duration:.5,ease}}/>
   <motion.span initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.6,delay:.12,ease}}>marketer</motion.span>
   <motion.b initial={{opacity:0,y:-18}} animate={{opacity:1,y:0}} transition={{delay:start+1.1,type:'spring',stiffness:500,damping:16}}>.</motion.b><i className="intro-base"/>
  </motion.span>
  <svg className="intro-logo" role="img" aria-label="comarketer" viewBox={LOGO_VIEWBOX}>
   <motion.g initial={{opacity:0}} animate={{opacity:1}} transition={{delay:swap,duration:.25}}>
    <path ref={target} fill="var(--ink)" fillRule="evenodd" d={`${letters.join(' ')} ${dot}`}/>
   </motion.g>
   <motion.path fill="var(--ink)" fillRule="evenodd" d={bar} style={{transformBox:'fill-box',transformOrigin:'left center'}} initial={{scaleX:0}} animate={{scaleX:1}} transition={{delay:swap+.1,duration:.45,ease}}/>
   <motion.path fill="var(--ink)" fillRule="evenodd" d={ring} style={{transformBox:'fill-box',transformOrigin:'center bottom'}} initial={{y:-260,opacity:0}} animate={{y:0,opacity:1,scaleY:[1,1,.86,1]}} transition={{y:{delay:swap+.35,type:'spring',stiffness:420,damping:15},opacity:{delay:swap+.35,duration:.15},scaleY:{delay:swap+.35,duration:.6,times:[0,.45,.6,1]}}}/>
  </svg>
 </div>;
}
