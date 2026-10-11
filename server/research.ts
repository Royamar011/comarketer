// Website research → context.md. Runs inside the Vite dev server (see vite.config.ts).
// Follows prompts/context/build-context.md: find pages, score product pages, read and save every page in full,
// then have the model write context.md from page notes only.
import * as cheerio from 'cheerio';
import fs from 'node:fs/promises';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';
import type {Writer} from './llm';

type Send=(event:Record<string,unknown>)=>void;
export type Page={url:string;group:string;type:string;title:string;h1:string;meta:string;canonical:string;headings:string[];points:string[];text:string;jsonld:string[];ctas:string[];score:number;fetched:string};

const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 ComarketerResearch/0.1';
const ROOT=path.resolve('research-store');
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

// Only public websites: block localhost and private ranges.
async function assertPublic(host:string){
 if(!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host))throw new Error('That does not look like a website address.');
 // Lookups can fail for a moment on a flaky connection or VPN, so retry before giving up.
 let address='';
 for(let i=0;i<3&&!address;i++){try{address=(await dns.lookup(host)).address;}catch(e){const code=(e as {code?:string}).code;
  if(i===2)throw new Error(code==='ENOTFOUND'?`We could not find ${host}. Check the spelling and your internet connection, then try again.`:`We could not reach ${host} (${code||'network error'}). Check your internet connection, then try again.`);
  await sleep(1200*(i+1));}}
 const priv=net.isIPv4(address)?/^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address):/^(::1|fc|fd|fe80)/i.test(address);
 if(priv)throw new Error('That address is not a public website.');
}
async function get(url:string,ms=15000):Promise<{ok:boolean;status:number;text:string;url:string}>{
 const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
 try{const r=await fetch(url,{headers:{'user-agent':UA,accept:'text/html,application/xml;q=0.9,*/*;q=0.8'},redirect:'follow',signal:c.signal});
  const text=r.ok?(await r.text()).slice(0,3_000_000):'';return {ok:r.ok,status:r.status,text,url:r.url};}
 catch{return {ok:false,status:0,text:'',url};}finally{clearTimeout(t);}
}

// ---------- Pass 1: find every page ----------
async function findUrls(origin:string,send:Send){
 const robots=await get(origin+'/robots.txt'),disallow:string[]=[];let maps:string[]=[];
 if(robots.ok){let star=false;for(const raw of robots.text.split('\n')){const l=raw.trim();const [k,...v]=l.split(':');const val=v.join(':').trim();
  if(/^user-agent$/i.test(k))star=val==='*';else if(star&&/^disallow$/i.test(k)&&val)disallow.push(val);else if(/^sitemap$/i.test(k)&&val)maps.push(val);}}
 if(!maps.length)maps=[origin+'/sitemap.xml',origin+'/sitemap_index.xml'];
 const urls=new Set<string>();let sitemap='';
 const readMap=async(u:string,depth=0)=>{if(depth>2||u.endsWith('.gz'))return;const r=await get(u);if(!r.ok||!/<(urlset|sitemapindex)/.test(r.text))return;sitemap||=u;
  const locs=[...r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,'&'));
  if(/<sitemapindex/.test(r.text)){for(const child of locs.sort((a,b)=>Number(/post|blog|article/.test(a))-Number(/post|blog|article/.test(b))).slice(0,12))await readMap(child,depth+1);}
  else locs.forEach(l=>urls.add(l));};
 for(const m of maps){await readMap(m);if(urls.size)break;}
 send({t:'sitemap',url:sitemap||null,count:urls.size});
 return {urls:[...urls],sitemap,disallow};
}

const groupOf=(p:string)=>
 /\/(blog|articles?|posts?|news|insights|learn)(\/|$)/.test(p)?'Blog':
 /(privacy|terms|legal|cookie|gdpr|dpa|imprint|sitemap|login|signin|signup|register|cart|checkout|tag\/|author\/|page\/\d|jobs|careers|become-partner|press|events?\/|webinars?)/.test(p)?'Skip':
 /\/(team|people|authors?|speakers?)\/[^/]+/.test(p)?'Skip':
 /integrat/.test(p)?'Integrations':
 /\/(pricing|plans?)(\/|$)/.test(p)?'Pricing':
 /\/(products?|platform|features?|capabilities)(\/|$)/.test(p)?'Product and feature pages':
 /\/(solutions?|industr\w*|use-?cases?|for-[\w-]+)(\/|$)/.test(p)?'Industries and use cases':
 /\/(customers?|case-?stud\w*|success-stor\w*|testimonials?|showcase|reviews?)(\/|$)/.test(p)?'Customers':
 /\/(integrations?|apps?|marketplace|connectors?|partners?)(\/|$)/.test(p)?'Integrations':
 /\/(about|company|team|careers|faqs?|contact|security|trust)(\/|$)/.test(p)?'Company and FAQ':
 /\/(docs?|help|support|guides?|changelog|release-notes|academy)(\/|$)/.test(p)?'Help and docs':
 /(\/|-)(vs|versus|compare|comparison|alternatives?)([/-]|$)/.test(p)?'Comparisons':
 p.split('/').filter(Boolean).length===1?'Other pages':'Skip';

// ---------- Pass 2: read a page ----------
function readPage(html:string,url:string,group:string):Page{
 // group can be corrected below (integration pages found outside an /integrations path).
 const $=cheerio.load(html);
 const jsonld=$('script[type="application/ld+json"]').map((_,e)=>$(e).text()).get().flatMap(t=>[...t.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map(m=>m[1]));
 const ctas=$('a,button').map((_,e)=>$(e).text().trim()).get().filter(t=>/demo|trial|get started|start free|sign up|install|book|try/i.test(t)&&t.length<40).slice(0,6);
 const title=$('title').first().text().trim(),meta=$('meta[name="description"]').attr('content')?.trim()||'',canonical=$('link[rel="canonical"]').attr('href')||url;
 $('script,style,noscript,svg,iframe,nav,footer,header,form').remove();
 const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
 const h1=clean($('h1').first().text());
 const headings=$('h2,h3').map((_,e)=>clean($(e).text())).get().filter(h=>h&&h.length<140);
 const points=$('li').map((_,e)=>clean($(e).text())).get().filter(t=>t.length>12&&t.length<220);
 const text=clean($('main').text()||$('body').text());
 // Integration pages describe another tool, not the company's own product.
 if(/integrat/i.test(title+' '+h1)&&group!=='Home page')group='Integrations';
 return {url,group,type:group,title,h1,meta,canonical,headings:[...new Set(headings)],points:[...new Set(points)],text,jsonld,ctas:[...new Set(ctas)],score:0,fetched:new Date().toISOString()};
}

// Pass 1b: score product pages on unclear sites. 3 or more is a product page.
function scoreProduct(p:Page,navLinks:Set<string>){
 const path=new URL(p.url).pathname;let s=0;
 if(navLinks.has(path))s++;
 if(/software|app\b|platform|tool|module|api|suite|crm|automation/i.test(p.title+' '+p.h1))s++;
 if(p.headings.some(h=>/faq|how it works|features|what you can do|capabilit/i.test(h)))s++;
 if(p.ctas.length)s++;
 if(p.jsonld.some(t=>/SoftwareApplication|Product|WebApplication/.test(t)))s++;
 if(/\/(products?|platform|features?)\//.test(path))s++;
 return s;
}

function companyName(home:Page|undefined,host:string,html:string){
 const og=cheerio.load(html)('meta[property="og:site_name"]').attr('content');
 if(og)return og.trim();
 const parts=(home?.title||'').split(/\s[|–—-]\s|:\s/).map(s=>s.trim()).filter(Boolean);
 const short=parts.filter(s=>s.split(' ').length<=3).sort((a,b)=>a.length-b.length)[0];
 return short||host.replace(/^www\./,'').split('.')[0].replace(/^\w/,c=>c.toUpperCase());
}
function logoOf(html:string,origin:string){
 const $=cheerio.load(html);const href=$('link[rel="apple-touch-icon"]').attr('href')||$('link[rel~="icon"]').attr('href')||'/favicon.ico';
 try{return new URL(href,origin).href;}catch{return origin+'/favicon.ico';}
}

function note(p:Page,budget:number){
 const u=new URL(p.url);
 let s=`### ${p.group}: ${u.pathname}${p.canonical&&p.canonical!==p.url?` (canonical ${new URL(p.canonical,u.origin).pathname})`:''}\nTitle: ${p.title}\nH1: ${p.h1}\nMeta: ${p.meta}\nHeadings: ${p.headings.slice(0,14).join(' | ')}\nPoints: ${p.points.slice(0,18).map(x=>x.slice(0,140)).join('; ')}\n`;
 // Text is often glued together without spaces, so take a window around each price mention instead of whole sentences.
 const money:string[]=[];for(const m of p.text.matchAll(/[$€£₹]\s?\d[\d.,]*|per (user|seat|month|year)|\/mo\b|free (trial|plan|forever)|billed (annually|monthly)/gi)){const i=m.index||0;if(money.length&&i<(money as any).last)continue;money.push(p.text.slice(Math.max(0,i-90),i+110));(money as any).last=i+110;if(money.length>=8)break;}
 if(money.length)s+=`Pricing lines: ${money.join(' ')}\n`;
 const room=Math.max(0,budget-s.length);if(room>200)s+=`Text: ${p.text.slice(0,Math.min(room,900))}\n`;
 return s.slice(0,budget);
}

// ---------- Model ----------
// One call to whichever writer is configured (server/llm.ts). Streams progress, flags output that hit the length limit.
async function draft(writer:Writer,system:string,user:string,send:Send,part:string,maxTokens:number){
 let last=0;
 const run=()=>writer.write({system,user,maxTokens:Math.min(maxTokens,writer.maxOutput),
  onText:t=>{if(Date.now()-last>250){send({t:'md',part,text:t});last=Date.now();}},onWait:seconds=>send({t:'wait',seconds})});
 let {text,cutShort}=await run();
 if(!text.trim())({text,cutShort}=await run());
 if(!text.trim())throw new Error(`The writing model returned no text (${part}). Try again.`);
 if(cutShort){console.warn(`[research] output cut short (${part})`);text=text.replace(/\n[^\n]*$/,'')+'\n\n> **Cut short:** this part reached the length limit. Research again to complete it.\n';}
 send({t:'md',part,text});return text;
}

const RULES=`Rules:
- Use only facts in the page notes. Never use memory. Never invent products, features, customers, prices, numbers or integrations.
- Do not include source links, competitor names, statistics, metrics, ratings or customer counts.
- Use the company's own words for product names and headlines.
- Short, plain sentences. US English. No em dashes. Use "you" sparingly; write about the company in third person.
- If something important is missing or two pages disagree, add a line starting with "> **Please confirm:**" inside that section, asking a plain question.
- Output only the requested markdown sections, each starting with "## ". No preamble, no closing remarks.`;

export async function research(domain:string,writer:Writer,send:Send){
 const host=domain.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'');
 await assertPublic(host);
 // Prefer the address the site redirects to (www or not).
 let first=await get(`https://${host}/`);if(!first.ok&&first.status===0){await sleep(1500);first=await get(`https://${host}/`);}
 if(!first.ok)throw new Error(first.status?`${host} answered with an error (${first.status}). The site may be blocking automated visits.`:`${host} did not respond. Check your internet connection, then try again.`);
 const origin=new URL(first.url).origin;send({t:'start',host,origin});
 const {urls,sitemap,disallow}=await findUrls(origin,send);
 const homeHtml=first.text,$home=cheerio.load(homeHtml);
 // Navigation links: the strongest product-page signal on unclear sites.
 const navLinks=new Set($home('nav a,header a,footer a').map((_,e)=>$home(e).attr('href')).get().map(h=>{try{const u=new URL(h,origin);return u.origin===origin?u.pathname.replace(/\/$/,'')||'/':'';}catch{return '';}}).filter(Boolean));
 let all=urls.filter(u=>{try{return new URL(u).origin===origin;}catch{return false;}});
 if(!all.length)all=[...navLinks].map(p=>origin+p);
 const allowed=(u:string)=>!disallow.some(d=>new URL(u).pathname.startsWith(d));
 const byGroup=new Map<string,string[]>();
 for(const u of all){const p=new URL(u).pathname.replace(/\/$/,'')||'/';if(p==='/'||!allowed(u))continue;if(/^\/[a-z]{2}(-[a-z]{2})?\//i.test(p+'/')&&!/^\/(ai|io|go|my)\//.test(p+'/'))continue;
  const g=groupOf(p.toLowerCase());if(g==='Skip')continue;(byGroup.get(g)||byGroup.set(g,[]).get(g)!).push(u);}
 for(const p of navLinks){const g=groupOf(p.toLowerCase());if(g!=='Skip'&&p!=='/'){const u=origin+p;const list=byGroup.get(g)||byGroup.set(g,[]).get(g)!;if(!list.includes(u))list.unshift(u);}}
 const caps:Record<string,number>={'Product and feature pages':14,'Pricing':2,'Industries and use cases':8,'Customers':4,'Integrations':5,'Company and FAQ':5,'Help and docs':2,'Comparisons':4,'Other pages':10,'Blog':0};
 const order=['Product and feature pages','Other pages','Pricing','Industries and use cases','Integrations','Customers','Company and FAQ','Help and docs','Comparisons'];
 const plan=order.filter(g=>byGroup.has(g)).map(g=>({group:g,urls:byGroup.get(g)!.slice(0,caps[g]),total:byGroup.get(g)!.length}));
 const blogCount=byGroup.get('Blog')?.length||0;
 send({t:'plan',reading:1+plan.reduce((n,g)=>n+g.urls.length,0),groups:[{group:'Home page',total:1},...plan.map(p=>({group:p.group,total:p.total})),...(blogCount?[{group:'Blog',total:blogCount}]:[])]});

 const pages:Page[]=[readPage(homeHtml,origin+'/','Home page')];send({t:'page',url:origin+'/',group:'Home page',n:1});
 for(const g of plan){
  for(let i=0;i<g.urls.length;i+=6){
   const got=await Promise.all(g.urls.slice(i,i+6).map(async u=>{const r=await get(u);return r.ok&&/<html|<body|<h1/i.test(r.text)?readPage(r.text,r.url,g.group):null;}));
   for(const p of got)if(p){pages.push(p);send({t:'page',url:p.url,group:g.group,n:pages.length});}
  }
 }
 // Dedupe by canonical, then score product candidates.
 const seen=new Set<string>(),kept:Page[]=[];
 for(const p of pages){const c=(()=>{try{return new URL(p.canonical,origin).href.replace(/\/$/,'');}catch{return p.url;}})();if(seen.has(c))continue;seen.add(c);kept.push(p);}
 for(const p of kept)if(['Product and feature pages','Other pages'].includes(p.group))p.score=scoreProduct(p,navLinks);
 const products=kept.filter(p=>p.score>=3);

 const name=companyName(kept[0],host,homeHtml),logo=logoOf(homeHtml,origin);
 const blogIndex=[...navLinks].find(p=>/^\/(blog|articles|insights|resources)$/.test(p));
 const dir=path.join(ROOT,host);await fs.mkdir(dir,{recursive:true});
 await fs.writeFile(path.join(dir,'pages.json'),JSON.stringify({host,origin,sitemap,urls:all,pages:kept},null,1));
 send({t:'saved',count:kept.length,urls:all.length});

 // ---------- Pass 8: write context.md from page notes, in two halves on two models ----------
 const template=await fs.readFile(path.resolve('prompts/context/context-template.md'),'utf8').catch(()=> '');
 const facts=`Company: ${name}\nWebsite: ${origin}\nSitemap: ${sitemap||'not found'}\nBlog: ${blogIndex?origin+blogIndex:blogCount?'found in sitemap':'not found'}\nCalls to action seen: ${[...new Set(kept.flatMap(p=>p.ctas))].slice(0,8).join(', ')}\nProduct pages (scored, canonical URLs; integrations with other tools are not products): ${products.map(p=>`${new URL(p.canonical,origin).href} [${p.h1||p.title}]`).join('; ')||'none scored 3+; use the home page and features pages'}`;
 const notesFor=(groups:string[],budget:number)=>{let out='',left=budget;
  for(const p of kept.filter(p=>groups.includes(p.group)).sort((a,b)=>groups.indexOf(a.group)-groups.indexOf(b.group)||b.score-a.score)){if(left<400)break;const per=p.group==='Home page'?2600:p.score>=3?1500:900;const n=note(p,Math.min(per,left));out+=n+'\n';left-=n.length;}
  return out;};
 const sysA=`You write the first half of a company brief (context.md) for a blog writing tool. Follow this template:\n${template.split('## Problems')[0]}\n${RULES}`;
 const userA=`${facts}\n\nWrite exactly these sections: "## At a glance" (two-column table with rows Company, Website, Sitemap, Blog, Category, In one line, Built for, Regions, Main call to action; write "Not found on the site" when unknown), "## What ${name} does", "## Products" (one "### " block per product, first line "**Page:** <canonical URL>" or "**Page:** No dedicated page", then the headline, then every capability as a bullet), "## Who buys" (table: Customer type | What they need, then the roles who buy), "## Industries".\n\nPage notes:\n${notesFor(['Home page','Product and feature pages','Other pages','Industries and use cases','Customers','Company and FAQ'],Math.round(writer.inputChars*.55))}`;
 const sysB=`You write the second half of a company brief (context.md) for a blog writing tool. Follow this template:\n## Problems${template.split('## Problems')[1]||''}\n${RULES}`;
 const titles=kept.filter(p=>['Home page','Product and feature pages','Other pages','Industries and use cases','Pricing'].includes(p.group)).slice(0,14).map(p=>`${p.title} / ${p.h1}`.replace(/\s+/g,' ')).join('\n');
 const userB=`Company: ${name}\nPage titles and H1s (positioning keywords must come from these):\n${titles}\n\nWrite exactly these sections: "## Problems ${name} solves" (one "**For [who]**" line per group of people, each followed by 2 to 4 bullets naming a concrete problem in plain words), "## How it works" (3 to 6 numbered steps from first use to outcome), "## Integrations and setup" (bullets grouped by kind of tool, then one setup bullet), "## Pricing and plans" (plan names, prices, trial and what each includes, using only the Pricing lines and pricing page notes; if prices are not stated, write a Please confirm line), "## Positioning keywords" (one sentence, then 3 to 6 phrases as a numbered list, most important first. Each phrase must appear in a page title or H1 above and describe what the company is or does: a category, product, problem or outcome term a buyer would type into Google, 2 to 4 words. Never the company name, never a feature slogan or generic words like "easy install").\n\nPage notes:\n${notesFor(['Pricing','Integrations','Company and FAQ','Help and docs','Home page','Product and feature pages'],Math.round(writer.inputChars*.45))}`;
 send({t:'writing'});
 const [a,b]=await Promise.all([draft(writer,sysA,userA,send,'a',5000),draft(writer,sysB,userB,send,'b',5000)]);
 // Keep only positioning keywords that really appear in a title or H1 (Pass 4: exact phrases only).
 const hay=titles.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ');
 const checked=b.replace(/(## Positioning keywords[\s\S]*)/,sec=>{const items=[...sec.matchAll(/^\d+\.\s+(.+?)\s*$/gm)].map(m=>m[1].replace(/\*\*/g,''));
  const ok=items.filter(k=>hay.includes(k.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()));
  if(ok.length<2)return sec;const head=sec.split(/\n\s*1\.\s/)[0].trimEnd();return `${head}\n\n${ok.slice(0,6).map((k,i)=>`${i+1}. ${k}`).join('\n')}\n`;});
 const md=`# ${name}\n\n${a.trim()}\n\n${checked.trim()}\n`;
 await fs.writeFile(path.join(dir,'context.md'),md);
 const groups=[{group:'Home page',count:1,pages:['/']},...plan.map(g=>({group:g.group,count:kept.filter(p=>p.group===g.group).length,pages:kept.filter(p=>p.group===g.group).slice(0,4).map(p=>new URL(p.url).pathname)})),...(blogCount?[{group:'Blog (URLs saved)',count:blogCount,pages:byGroup.get('Blog')!.slice(0,3).map(u=>new URL(u).pathname)}]:[])];
 send({t:'done',md,name,logo,domain:host,groups,saved:kept.length+blogCount});

 // ---------- Internal brief: the complete, unfiltered context written by the model ----------
 // Runs after the user's brief is ready, so setup never waits for it. Article steps read this version.
 const status=(v:object)=>fs.writeFile(path.join(dir,'status.json'),JSON.stringify({...v,updated:new Date().toISOString()}));
 const quiet:Send=()=>{};
 void (async()=>{
  await status({full:'writing'});
  // Blog posts: titles and headings only, for the blog audit.
  const posts=(byGroup.get('Blog')||[]).filter(u=>new URL(u).pathname.split('/').filter(Boolean).length>=2).slice(0,30);
  for(let i=0;i<posts.length;i+=6){const got=await Promise.all(posts.slice(i,i+6).map(async u=>{const r=await get(u);return r.ok?readPage(r.text,r.url,'Blog'):null;}));for(const p of got)if(p)kept.push(p);}
  await fs.writeFile(path.join(dir,'pages.json'),JSON.stringify({host,origin,sitemap,urls:all,pages:kept},null,1));
  const full=await fs.readFile(path.resolve('prompts/context/context-full-template.md'),'utf8').catch(()=> '');
  const RULES_FULL=`Rules:
- Use only facts in the page notes. Never use memory. Never invent anything.
- Be complete, not short. Keep every product, feature, number, testimonial, customer name, integration, price and claim the notes contain.
- After every fact, add its source page in square brackets, for example [/pricing].
- Quote testimonials and headlines word for word.
- Mark anything you infer with "(inferred)" and keep it separate from facts.
- Output only the requested markdown sections, each starting with "## ".`;
  const sys=`You write the internal, complete company brief for a blog writing tool. Nobody filters this version: it is the full reference every article is written from. Template:\n${full}\n${RULES_FULL}`;
  const blogTitles=kept.filter(p=>p.group==='Blog').map(p=>`- ${p.title||p.h1} (${new URL(p.url).pathname})`).join('\n');
  const f1=`${facts}\n\nWrite exactly these sections: "## Quick reference" (table: Field | Detail | Source), "## Core idea", "## Products" (one "### " block per product: page, headline, who it is for, every capability, every number stated), "## Full feature list", "## Pain points by persona", "## Buyer personas", "## Target industries and segments" (with page paths), "## Geographies".\n\nPage notes:\n${notesFor(['Home page','Product and feature pages','Other pages','Industries and use cases','Company and FAQ'],Math.round(writer.inputChars*.5))}`;
  const f2=`Company: ${name}\n\nBlog posts found (${blogCount} in the sitemap, titles read for ${posts.length}):\n${blogTitles||'none'}\n\nWrite exactly these sections: "## Proof" (metrics, testimonials word for word with name, title and company, customers named on the site), "## Alternatives and competitors" (tools and old ways of working the site compares itself with, and how it positions against each), "## Voice and messaging" (exact phrases the site repeats, tone, words it avoids, US or UK spelling), "## Positioning keywords" (8 to 15 phrases from titles and headings, grouped as category, product, problem, outcome), "## Pricing" (everything stated), "## The company's blog" (number of posts, types of posts, topics already covered, authors if shown, topics not yet covered), "## What not to get wrong", "## Open questions and conflicts".\n\nPage notes:\n${notesFor(['Customers','Comparisons','Pricing','Home page','Company and FAQ','Integrations'],Math.round(writer.inputChars*.4))}`;
  const [rx,ry]=await Promise.allSettled([draft(writer,sys,f1,quiet,'f1',10000),draft(writer,sys,f2,quiet,'f2',10000)]);
  const missing=(r:PromiseSettledResult<string>,what:string)=>r.status==='fulfilled'?r.value:`> **Not written yet:** ${what} (${(r.reason as Error).message}). Run "Research my website again" to fill it in.`;
  const x=missing(rx,'company, products, features, personas, industries and regions'),y=missing(ry,'proof, competitors, voice, keywords, pricing, blog and open questions');
  const list=(g:string)=>kept.filter(p=>p.group===g).map(p=>`- ${p.title||p.h1||new URL(p.url).pathname}: ${p.url}`).join('\n');
  const urls=['Home page','Product and feature pages','Other pages','Pricing','Industries and use cases','Customers','Integrations','Comparisons','Company and FAQ','Help and docs'].filter(g=>kept.some(p=>p.group===g)).map(g=>`### ${g}\n${list(g)}`).join('\n\n');
  const out=`# ${name} (internal, complete)\n\n> Written by the model from ${kept.length} saved pages on ${new Date().toISOString().slice(0,10)}. Not shown to the user. The user-facing brief is context.md.\n\n${x.trim()}\n\n${y.trim()}\n\n## Important URLs\n${urls}\n\n## Blog posts found\n${list('Blog')||'None read.'}\n\n## Source index\n- Website: ${origin}\n- Sitemap: ${sitemap||'not found'} (${all.length} URLs)\n- Pages saved in full: ${kept.length} (research-store/${host}/pages.json)\n`;
  await fs.writeFile(path.join(dir,'context-full.md'),out);
  await status({full:rx.status==='fulfilled'&&ry.status==='fulfilled'?'ready':'partial'});
 })().catch(e=>status({full:'failed',error:(e as Error).message}));
}

// Both versions of the brief for a researched company. Article steps use the full one.
export async function readBrief(host:string){
 const dir=path.join(ROOT,host.replace(/[^a-z0-9.-]/gi,''));
 const read=(f:string)=>fs.readFile(path.join(dir,f),'utf8').catch(()=>null);
 return {md:await read('context.md'),full:await read('context-full.md'),status:JSON.parse((await read('status.json'))||'{}')};
}
