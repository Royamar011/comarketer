import {useEffect,useRef,useState} from 'react';
import {AnimatePresence,motion,MotionConfig} from 'motion/react';
import {Home as HomeIcon,LibraryBig,Building2,PenLine,Settings as SettingsIcon,Plus,Menu,Check} from 'lucide-react';
import {Logo} from './components/brand';
import {RouteBar,Toast,ease,spring} from './components/ui';
import {Onboarding,type ObStart} from './screens/Onboarding';
import {useWorkspace} from './workspace';
import {Workflow} from './screens/Workflow';
import {Context,Home,Settings,Styles} from './screens/Pages';
import {ArticlePage,Library} from './screens/Library';
import {type Voice} from './data';
type View='onboarding'|'home'|'new'|'library'|'article'|'context'|'styles'|'settings';
const nav=[{id:'home',label:'Home',icon:HomeIcon},{id:'library',label:'Content library',icon:LibraryBig},{id:'context',label:'Company brief',icon:Building2},{id:'styles',label:'Voices',icon:PenLine}] as const;
// Pages in menu order. Going further down the list slides the new page in from the right; going back, from the left.
const place:Record<View,number>={onboarding:-1,home:0,new:.5,library:1,article:1.5,context:2,styles:3,settings:4};
const pageMotion={
 enter:(d:number)=>({opacity:0,x:d*28,filter:'blur(6px)'}),
 // The filter is cleared at the end: any filter left on the page would pin the drawers inside it to the page, not the window.
 center:{opacity:1,x:0,filter:'blur(0px)',transition:{duration:.42,ease},transitionEnd:{filter:'none',transform:'none'}},
 exit:(d:number)=>({opacity:0,x:d*-18,filter:'blur(4px)',transition:{duration:.16,ease:'easeIn' as const}}),
};
const heads:Partial<Record<View,[string,string]>>={library:['Content library','Every article you have, from first draft to published.'],context:['Company brief','The facts that keep every article accurate and on-brand.'],styles:['Voices','Sound like a founder with something to say, or a team that has seen it all.'],settings:['Settings','Images, publishing and writing.']};

// The company logo from its website, or its first letter when there is none or it fails to load.
function WsLogo({logo,name}:{logo:string;name:string}){
 const [bad,setBad]=useState(false);
 return logo&&!bad?<img src={logo} alt="" width={30} height={30} onError={()=>setBad(true)}/>:<span className="ws-initial" aria-hidden="true">{name[0]}</span>;
}

export function App(){
 const ws=useWorkspace();
 const [obStart,setObStart]=useState<ObStart>('welcome'),[view,setView]=useState<View>(()=>(location.hash.slice(1).split('/')[0] as View)||'onboarding'),[voice,setVoice]=useState<Voice>('team'),[keyword,setKeyword]=useState(''),[toast,setToast]=useState<string|null>(null),[menu,setMenu]=useState(false),[firstVisit,setFirstVisit]=useState(false),[runKey,setRunKey]=useState(0),[articleId,setArticleId]=useState(()=>decodeURIComponent(location.hash.split('/')[1]||'')),[resumeId,setResumeId]=useState<string|undefined>();
 // The open article is in the address (#article/<id>), so a reload or a shared link opens the same one.
 useEffect(()=>{const sync=()=>{const [v,id]=location.hash.slice(1).split('/') as [View,string?];if(['onboarding','home','new','library','article','context','styles','settings'].includes(v))setView(v);if(v==='article'&&id)setArticleId(decodeURIComponent(id));};window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
 const from=useRef(view),dir=place[view]>=place[from.current]?1:-1;
 useEffect(()=>{from.current=view;},[view]);
 const go=(v:View,id?:string)=>{location.hash=id?`${v}/${encodeURIComponent(id)}`:v;setView(v);setMenu(false);window.scrollTo({top:0});};
 const startArticle=(kw:string)=>{setKeyword(kw);setResumeId(undefined);setRunKey(k=>k+1);go('new');};
 // An article in progress opens where it was left, as the same article.
 const resumeArticle=(id:string)=>{setResumeId(id);setRunKey(k=>k+1);go('new');};
 const research=(from:ObStart)=>{setObStart(from);go('onboarding');};
 const openArticle=(id:string)=>{setArticleId(id);go('article',id);};
 if(view==='onboarding')return <MotionConfig reducedMotion="user"><Onboarding key={obStart} onExit={()=>{setObStart('welcome');go('context');}} start={obStart} initialDomain={obStart==='research'?ws.domain:''} onFinish={()=>{setFirstVisit(obStart==='welcome');setObStart('welcome');go(obStart==='welcome'?'home':'context');}}/></MotionConfig>;
 return <MotionConfig reducedMotion="user"><div className="shell">
  {menu&&<button className="scrim mobile" aria-label="Close menu" onClick={()=>setMenu(false)}/>}
  <aside className={`sidebar ${menu?'open':''}`}>
   <a className="sidebar-logo" href="#home" onClick={()=>go('home')}><Logo size={24}/></a>
   <div className="workspace"><WsLogo logo={ws.logo} name={ws.name}/><div><strong>{ws.name}</strong><small>{ws.domain}</small></div></div>
   <button className="button primary new-btn" onClick={()=>startArticle('')}><Plus size={17}/>New article</button>
   <nav aria-label="Main">{nav.map(n=>{const on=view===n.id||(n.id==='library'&&view==='article');return <button key={n.id} className={`nav-item ${on?'active':''}`} aria-current={view===n.id?'page':undefined} onClick={()=>go(n.id)}>{on&&<motion.span layoutId="nav-pill" className="nav-pill" transition={spring}/>}<n.icon size={17}/><span>{n.label}</span></button>;})}</nav>
   <div className="sidebar-foot">
    <button className={`nav-item ${view==='settings'?'active':''}`} aria-current={view==='settings'?'page':undefined} onClick={()=>go('settings')}>{view==='settings'&&<motion.span layoutId="nav-pill" className="nav-pill" transition={spring}/>}<SettingsIcon size={17}/><span>Settings</span></button>
    <span className={`sync sync-${ws.sync}`} role="status"><AnimatePresence mode="wait" initial={false}><motion.span key={ws.sync} className="sync-line" initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.18}}>
     {ws.sync==='saved'?<motion.span className="sync-ok" initial={{scale:0}} animate={{scale:1}} transition={spring}><Check size={10} strokeWidth={3.5}/></motion.span>:<i className="sync-dot"/>}
     {ws.sync==='error'?'Not saved. Is the dev server running?':ws.sync==='saving'?'Saving…':ws.sync==='loading'?'Loading…':'All changes saved'}
    </motion.span></AnimatePresence></span>
    <span className="preview-chip">Design preview</span>
   </div>
  </aside>
  <div className="main">
   <header className="mobile-bar"><button className="icon-button" aria-label="Open menu" onClick={()=>setMenu(true)}><Menu size={20}/></button><Logo size={22}/></header>
   <RouteBar routeKey={view==='article'?`article-${articleId}`:view} busy={ws.sync==='loading'}/>
   <main className={`page ${view==='new'?'page-studio':''}`}>
    <AnimatePresence mode="wait" custom={dir}><motion.div key={view==='new'?`new-${runKey}`:view==='article'?`article-${articleId}`:view} custom={dir} variants={pageMotion} initial="enter" animate="center" exit="exit">
     {heads[view]&&<div className="page-head"><motion.h1 initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.06,duration:.4,ease}}>{heads[view]![0]}</motion.h1><motion.p initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.12,duration:.4,ease}}>{heads[view]![1]}</motion.p></div>}
     {view==='home'&&<Home onNew={startArticle} onOpen={openArticle} onResume={resumeArticle} onLibrary={()=>go('library')} firstVisit={firstVisit}/>}
     {view==='new'&&<Workflow initialKeyword={keyword} articleId={resumeId} defaultVoice={voice} onExit={()=>go('home')} onToast={setToast}/>}
     {view==='library'&&<Library onOpen={openArticle} onNew={()=>startArticle('')} onResume={resumeArticle} onToast={setToast}/>}
     {view==='article'&&<ArticlePage id={articleId} onBack={()=>go('library')} onResume={resumeArticle} onNew={startArticle} onToast={setToast}/>}
     {view==='context'&&<Context onRefresh={()=>research('research')} onChange={()=>research('website')}/>}
     {view==='styles'&&<Styles voice={voice} setVoice={v=>{setVoice(v);setToast(`${v==='founder'?'The founder':'The team'} is now your default voice.`);}}/>}
     {view==='settings'&&<Settings onToast={setToast} onResearch={()=>research('website')}/>}
    </motion.div></AnimatePresence>
   </main>
  </div>
  <Toast text={toast} onDone={()=>setToast(null)}/>
 </div></MotionConfig>;
}
