// The company's market: who it competes with, and the groups of buyers in that market.
// Competitors: several independent signals (searches from different angles, "best X" and alternatives lists, the
// company's own comparison pages, the model's general knowledge), each candidate's homepage read, then the model
// decides which ones a buyer would really compare. Buyer groups: the company's pages and its competitors' pages read
// side by side, so the writer understands the whole market. A group is marked "You serve this" only when a quote from
// the company's own site proves it; every quote is checked against the saved page it claims to come from.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import {ROOT,get,groupOf,logoOf,note,readPage,type Page} from './research';
import type {Search} from './search';
import type {Writer} from './llm';

export type Source={kind:'search'|'list'|'your-site'|'ai'|'you';query?:string;url?:string};
export type Competitor={domain:string;name:string;logo:string;what:string;why:string;match:'direct'|'adjacent';confidence:'high'|'medium'|'low';sources:Source[];added:'auto'|'you';status:'kept'|'extra'|'removed';reachable?:boolean};
export type Evidence={from:string;page:string;quote:string};
export type BuyerGroup={id:string;name:string;who:string;companyType:string;size:string;roles:string[];pains:string[];triggers:string[];searches:string[];compares:string[];objections:string[];knowledge:'new'|'familiar'|'expert';served:'yours'|'market';companies:string[];evidence:Evidence[];confidence:'high'|'medium'|'low';added:'auto'|'you';status:'kept'|'removed'};
export type Market={competitors:Competitor[];groups:BuyerGroup[]};
export type Job={kind:'competitors'|'groups';running:boolean;lines:string[];done:number;total:number;error?:string;finished?:string};
export type MarketStore={getMarket:(domain:string)=>Promise<Market>;saveMarket:(domain:string,m:Partial<Market>)=>Promise<Market>};

// ---------- Domains ----------
const twoPart=/\.(co|com|org|net|ac|gov|edu|ne|or)\.[a-z]{2}$/;
export function rootDomain(input:string){
 let h='';try{h=new URL(/^https?:\/\//.test(input.trim())?input.trim():`https://${input.trim()}`).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}
 if(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(h))return '';
 return h.split('.').slice(twoPart.test(h)?-3:-2).join('.');
}
// Places that list or write about software, and big platforms. Read for names, never suggested as competitors.
const notVendors=new Set(['g2.com','capterra.com','getapp.com','softwareadvice.com','trustradius.com','gartner.com','saasworthy.com','sourceforge.net','producthunt.com','alternativeto.net','slashdot.org','crozdesk.com','financesonline.com','selecthub.com','softwaresuggest.com','goodfirms.co','trustpilot.com','sitejabber.com',
 'youtube.com','reddit.com','quora.com','linkedin.com','facebook.com','x.com','twitter.com','instagram.com','tiktok.com','pinterest.com','medium.com','substack.com','wikipedia.org','github.com','stackoverflow.com',
 'forbes.com','techradar.com','zdnet.com','pcmag.com','businessinsider.com','nerdwallet.com','investopedia.com','techcrunch.com','theverge.com','entrepreneur.com','inc.com','fastcompany.com','cnbc.com','nytimes.com','wsj.com','bloomberg.com','tomsguide.com','cnet.com','pcworld.com','zapier.com',
 'crunchbase.com','tracxn.com','cbinsights.com','owler.com','similarweb.com','zoominfo.com','ycombinator.com','glassdoor.com','indeed.com','wellfound.com','apollo.io','rocketreach.co','pitchbook.com','builtwith.com','semrush.com','ahrefs.com',
 'google.com','apple.com','microsoft.com','amazon.com','shopify.com','wordpress.org','wordpress.com','wix.com','squarespace.com','bing.com','duckduckgo.com','yahoo.com']);
const listLike=/\b(best|top \d*|alternatives?|competitors?|vs\.?|versus|compared?|comparison|review)\b/i;

// ---------- Small helpers ----------
const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
const norm=(s:string)=>s.toLowerCase().replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[^a-z0-9]+/g,' ').trim();
function json<T>(text:string):T|null{const s=text.indexOf('{'),e=text.lastIndexOf('}');if(s<0||e<=s)return null;try{return JSON.parse(text.slice(s,e+1)) as T;}catch{return null;}}
async function pool<T,R>(items:T[],n:number,fn:(x:T)=>Promise<R>){const out:R[]=new Array(items.length);let i=0;await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(i<items.length){const k=i++;out[k]=await fn(items[k]);}}));return out;}
const section=(md:string,title:RegExp)=>{const m=md.split(/\n(?=## )/).find(s=>title.test(s.split('\n')[0]));return m?m.replace(/^## [^\n]*\n/,'').trim():'';};

// What research saved for this company: every page read, and the brief.
type Site={host:string;origin:string;name:string;pages:Page[];md:string};
async function loadSite(host:string):Promise<Site>{
 const dir=path.join(ROOT,host.replace(/[^a-z0-9.-]/gi,''));
 const saved=JSON.parse(await fs.readFile(path.join(dir,'pages.json'),'utf8').catch(()=>'null'));
 if(!saved)throw new Error('Research this website first.');
 const md=await fs.readFile(path.join(dir,'context.md'),'utf8').catch(()=>'');
 return {host,origin:saved.origin,name:(md.match(/^# (.+)$/m)?.[1]||host).trim(),pages:saved.pages||[],md};
}
// Category and search phrases the brief found in the site's own titles and headings.
export function phrasesFrom(md:string){
 const glance=section(md,/At a glance/i);
 const category=clean(glance.split('\n').find(l=>/^\|\s*Category\s*\|/i.test(l))?.split('|')[2]||'').replace(/\*\*/g,'');
 const keywords=[...section(md,/Positioning keywords/i).matchAll(/^\d+\.\s+(.+)$/gm)].map(m=>clean(m[1].replace(/\*\*/g,'')));
 return {category:/not found/i.test(category)?'':category,keywords};
}
const summaryOf=(s:Site)=>[section(s.md,/At a glance/i),section(s.md,/^## What /i),section(s.md,/Who buys/i),section(s.md,/Problems/i)].filter(Boolean).join('\n\n').slice(0,3500)||s.pages[0]?.text.slice(0,2500)||'';

// ---------- Competitors ----------
export function competitorQueries(name:string,category:string,keywords:string[]){
 const terms=[...new Set([category,...keywords].map(k=>k.toLowerCase().trim()).filter(k=>k&&k.length<60))].slice(0,3);
 return [
  ...terms.map(q=>({q,kind:'category' as const})),
  ...terms.slice(0,2).map(t=>({q:`best ${t}`,kind:'list' as const})),
  {q:`${name} alternatives`,kind:'brand' as const},{q:`${name} competitors`,kind:'brand' as const},{q:`${name} vs`,kind:'brand' as const},
 ];
}
type Cand={domain:string;score:number;sources:Source[]};

// Brand names the company compares itself with on its own site ("Acme vs Rival", "Rival alternative").
export function namesFromComparisonPages(pages:Page[],own:string){
 const out=new Set<string>(),me=norm(own);
 for(const p of pages.filter(p=>p.group==='Comparisons'))for(const t of [p.h1,p.title]){
  const m=t.split(/\s[|–—-]\s/)[0].match(/^(.+?)\s+(?:vs\.?|versus)\s+(.+)$/i);
  if(m)for(const side of [m[1],m[2]]){const n=clean(side.replace(/[:?!].*$/,''));if(n&&norm(n)!==me&&n.split(' ').length<=3)out.add(n);}
  const a=t.match(/^(?:the\s+)?(?:best\s+)?(.+?)\s+alternatives?\b/i);if(a){const n=clean(a[1]);if(n&&norm(n)!==me&&n.split(' ').length<=3)out.add(n);}
 }
 return [...out].slice(0,8);
}
// Other companies a list or comparison article links to, in its main text.
export function linkedDomains(html:string,pageDomain:string){
 const $=cheerio.load(html);$('nav,header,footer,aside,script,style,form').remove();
 const seen:string[]=[];
 $('main a[href], article a[href], body a[href]').each((_,e)=>{const d=rootDomain($(e).attr('href')||'');if(d&&d!==pageDomain&&!notVendors.has(d)&&!seen.includes(d))seen.push(d);});
 return seen.length>45?[]:seen;
}
async function homepage(domain:string){
 const r=await get(`https://${domain}/`,12000);
 if(!r.ok||!/<html|<body|<h1/i.test(r.text))return null;
 const p=readPage(r.text,r.url,'Home page'),$=cheerio.load(r.text);
 const name=clean($('meta[property="og:site_name"]').attr('content')||p.title.split(/\s[|–—-]\s|:\s/)[0]||domain);
 return {page:p,name:name.length>40?domain:name,logo:logoOf(r.text,new URL(r.url).origin),meta:p.meta,h1:p.h1,headings:p.headings.slice(0,8)};
}

export async function findCompetitors(host:string,deps:{search:Search;writer:Writer;store:MarketStore;progress:(line:string,done?:number,total?:number)=>void}){
 const {search,writer,store,progress}=deps,site=await loadSite(host),own=rootDomain(site.origin)||rootDomain(host);
 const {category,keywords}=phrasesFrom(site.md),cands=new Map<string,Cand>();
 const add=(d:string,points:number,src:Source)=>{if(!d||d===own||notVendors.has(d))return;const c=cands.get(d)||cands.set(d,{domain:d,score:0,sources:[]}).get(d)!;c.score+=points;if(c.sources.length<6)c.sources.push(src);};

 // 1. Searches from several angles. Vendors ranking for the category are the market; lists name the rest.
 const queries=competitorQueries(site.name,category,keywords),lists:{url:string;query:string}[]=[];
 let hits=0;
 for(const [i,{q,kind}] of queries.entries()){
  progress(`Searching for “${q}”`,i,queries.length);
  const results=await search(q).catch(()=>[]);hits+=results.length;
  for(const h of results){const d=rootDomain(h.url),path=new URL(h.url).pathname;
   const isList=notVendors.has(d)||listLike.test(h.title)||/\/(blog|articles?|resources|learn)\//.test(path);
   if(isList){if(lists.length<8&&!lists.some(l=>l.url===h.url)&&d!==own)lists.push({url:h.url,query:q});
    // A competitor's own "vs" or alternatives page about this company is a strong sign it competes.
    if(kind==='brand'&&!notVendors.has(d)&&/vs|alternative|compare/i.test(path+h.title))add(d,4,{kind:'search',query:q,url:h.url});continue;}
   add(d,kind==='category'?(h.position<=3?3:2):2,{kind:'search',query:q,url:h.url});}
 }
 // 2. Read the lists and comparison articles the searches found.
 progress(`Reading ${lists.length} lists of tools`,queries.length,queries.length);
 await pool(lists.slice(0,6),3,async l=>{const r=await get(l.url,12000);if(!r.ok)return;for(const d of linkedDomains(r.text,rootDomain(l.url)).slice(0,30))add(d,1,{kind:'list',url:l.url,query:l.query});});
 // 3. Companies the site itself compares with: the strongest signal there is.
 const named=namesFromComparisonPages(site.pages,site.name);
 for(const n of named.slice(0,4)){const r=(await search(`${n} ${category||keywords[0]||''}`.trim()).catch(()=>[])).find(h=>!notVendors.has(rootDomain(h.url))&&rootDomain(h.url)!==own);
  if(r)add(rootDomain(r.url),6,{kind:'your-site',query:n});}
 // 4. The model's general knowledge fills gaps when search is thin. Weighted low; checked like everything else.
 const known=json<{domains:string[]}>((await writer.write({maxTokens:600,system:'You name software companies. Output only JSON: {"domains":["example.com"]}. Root domains only. Leave the list empty if unsure.',
  user:`Name up to 8 companies whose product a buyer would compare with this company before buying. Only companies you are confident exist.\n\nCompany: ${site.name} (${own})\n${summaryOf(site).slice(0,1800)}`}).catch(()=>({text:''}))).text);
 for(const d of known?.domains||[])add(rootDomain(d),hits?1:2,{kind:'ai'});

 // 5. Read every strong candidate's homepage, then let the model decide which are real competitors.
 const top=[...cands.values()].sort((a,b)=>b.score-a.score).slice(0,16);
 if(!top.length)throw new Error('No competitors found. Search may be blocked on this network. Add competitors yourself below.');
 progress(`Checking ${top.length} websites`,0,top.length);
 let checked=0;
 const homes=await pool(top,4,async c=>{const h=await homepage(c.domain).catch(()=>null);progress(`Checking ${top.length} websites`,++checked,top.length);return h?{...c,...h}:null;});
 const live=homes.filter(Boolean) as (Cand&NonNullable<Awaited<ReturnType<typeof homepage>>>)[];
 progress('Picking the closest matches');
 const list=live.map(c=>`- ${c.domain} | ${c.name} | title: ${c.page.title} | h1: ${c.h1} | meta: ${c.meta} | headings: ${c.headings.join('; ')}`.slice(0,700)).join('\n');
 const verdict=json<{candidates:{domain:string;match:'direct'|'adjacent'|'not';name:string;what:string;why:string}[]}>((await writer.write({maxTokens:3000,
  system:`You decide which companies compete with a given company, using only the homepage notes provided. Output only JSON:
{"candidates":[{"domain":"","match":"direct|adjacent|not","name":"","what":"","why":""}]}
- direct: sells a product a buyer would choose instead of this company: same kind of product, same kind of buyer.
- adjacent: overlaps in product or buyer and is sometimes compared, but solves a different main job or targets a different buyer.
- not: directories, review sites, media, agencies, marketplaces, suppliers, the company's own customers or partners, or unrelated.
- name: the brand name as written on its homepage. what: one plain sentence on what it sells, from its notes. why: one plain sentence on why a buyer would compare them, or why not.`,
  user:`Company: ${site.name} (${own})\n${summaryOf(site)}\n\nCandidates (domain | name | homepage notes):\n${list}`}).catch(()=>({text:''}))).text);
 const byDomain=new Map((verdict?.candidates||[]).map(v=>[rootDomain(v.domain),v]));
 const found:Competitor[]=live.flatMap(c=>{const v=byDomain.get(c.domain);if(!v||v.match==='not')return [];
  const onlyAi=c.sources.every(s=>s.kind==='ai');
  const confidence=onlyAi?'low':v.match==='direct'&&c.score>=6?'high':v.match==='direct'||c.score>=4?'medium':'low';
  return [{domain:c.domain,name:clean(v.name||c.name),logo:c.logo,what:clean(v.what||c.meta),why:clean(v.why||''),match:v.match,confidence,sources:c.sources,added:'auto' as const,status:'kept' as const,reachable:true}];});
 const rank=(c:Competitor)=>(c.match==='direct'?100:0)+(c.confidence==='high'?20:c.confidence==='medium'?10:0)+(top.find(t=>t.domain===c.domain)?.score||0);
 found.sort((a,b)=>rank(b)-rank(a));found.forEach((c,i)=>{if(i>=7)c.status='extra';});

 // Keep what the user already decided: their own additions, and anything they removed stays removed.
 const before=(await store.getMarket(host)).competitors,prev=new Map(before.map(c=>[c.domain,c]));
 const decided=before.filter(c=>c.added==='you'||c.status==='removed');
 const fresh=found.filter(c=>!decided.some(d=>d.domain===c.domain)).map(c=>prev.get(c.domain)?.status==='kept'?{...c,status:'kept' as const}:c);
 const merged=[...decided,...fresh];
 return store.saveMarket(host,{competitors:merged});
}

// A competitor the user adds by name or address: read its homepage so the chip shows who it is.
export async function checkCompetitor(input:string):Promise<Competitor>{
 const domain=rootDomain(input);if(!domain)throw Object.assign(new Error('That does not look like a website address.'),{status:400});
 const h=await homepage(domain).catch(()=>null);
 return {domain,name:h?.name||domain.split('.')[0].replace(/^\w/,c=>c.toUpperCase()),logo:h?.logo||'',what:clean(h?.meta||h?.h1||''),why:'',match:'direct',confidence:'high',sources:[{kind:'you'}],added:'you',status:'kept',reachable:!!h};
}

// ---------- Buyer groups ----------
// The company's own pages that say who it sells to, and the same kinds of pages from each competitor.
async function competitorPages(domain:string){
 const r=await get(`https://${domain}/`,12000);if(!r.ok)return [];
 const origin=new URL(r.url).origin,$=cheerio.load(r.text),home=readPage(r.text,r.url,'Home page');
 const links=[...new Set($('nav a,header a,footer a,a').map((_,e)=>{try{const u=new URL($(e).attr('href')||'',origin);return u.origin===origin?u.pathname.replace(/\/$/,''):'';}catch{return '';}}).get().filter(Boolean))];
 const want:Record<string,number>={'Industries and use cases':3,'Customers':1,'Pricing':1,'Product and feature pages':1};
 const pick=links.filter(p=>{const g=groupOf(p.toLowerCase());if(!(g in want)||want[g]<=0)return false;want[g]--;return true;});
 const more=await pool(pick,3,async p=>{const x=await get(origin+p,12000);return x.ok?readPage(x.text,x.url,groupOf(p.toLowerCase())):null;});
 return [home,...more.filter(Boolean) as Page[]];
}
const notesOf=(pages:Page[],budget:number)=>{let out='',left=budget;for(const p of pages){if(left<300)break;const n=note(p,Math.min(1400,left));out+=n+'\n';left-=n.length;}return out;};

// A quote counts only if its words appear, in order, on a saved page from the source it names.
export function verifyQuote(quote:string,pages:Page[]){
 const q=norm(quote);if(q.split(' ').length<3)return null;
 return pages.find(p=>norm([p.title,p.h1,p.meta,...p.headings,...p.points,p.text].join(' ')).includes(q))||null;
}

export async function findBuyerGroups(host:string,deps:{writer:Writer;store:MarketStore;progress:(line:string,done?:number,total?:number)=>void}){
 const {writer,store,progress}=deps,site=await loadSite(host),own=rootDomain(site.origin)||rootDomain(host);
 const market=await store.getMarket(host),rivals=market.competitors.filter(c=>c.status==='kept').slice(0,6);
 const mine=site.pages.filter(p=>['Home page','Industries and use cases','Customers','Pricing','Product and feature pages','Company and FAQ'].includes(p.group)).sort((a,b)=>b.score-a.score);
 const sources=new Map<string,Page[]>([['you',mine]]);
 let n=0;
 await pool(rivals,3,async c=>{const pages=await competitorPages(c.domain).catch(()=>[]);if(pages.length)sources.set(c.domain,pages);progress('Reading competitors’ websites',++n,rivals.length);});
 progress('Building ICPs');
 const budget=writer.inputChars,each=Math.round(budget*.6/Math.max(1,sources.size-1));
 const notes=[`=== YOU: ${site.name} (${own}) ===\n${notesOf(mine,Math.round(budget*.4))}`,...[...sources.entries()].filter(([k])=>k!=='you').map(([d,p])=>`=== ${d} (${rivals.find(r=>r.domain===d)?.name||d}) ===\n${notesOf(p,each)}`)].join('\n');
 const out=json<{groups:Omit<BuyerGroup,'id'|'served'|'companies'|'confidence'|'added'|'status'>[]}>((await writer.write({maxTokens:Math.min(9000,writer.maxOutput),
  system:`You map the groups of buyers in a market, for a blog writer who must write for one group at a time. Use only the page notes. Output only JSON:
{"groups":[{"name":"","who":"","companyType":"","size":"","roles":[],"pains":[],"triggers":[],"searches":[],"compares":[],"objections":[],"knowledge":"new|familiar|expert","evidence":[{"from":"you or a domain","page":"/path","quote":""}]}]}
Rules:
- 4 to 8 groups across the whole market, including groups only competitors serve. Each group is specific: a kind of company with a qualifier ("Shopify brands selling electronics"), or a role with a goal ("Support leads cutting ticket volume"). Never just "businesses" or "teams".
- who: one sentence. companyType and size: as the pages show them. roles: job titles who use or buy.
- pains: the problems they have, in the words customers or pages use. triggers: what makes them start looking for a product. searches: phrases they would type into Google (your best inference, 3 to 6). compares: what they weigh it against, including spreadsheets or doing nothing. objections: what makes them hesitate.
- knowledge: how much they already know about this kind of product.
- evidence: 1 to 4 quotes copied word for word from the notes (8 to 25 words each), with "from" set to "you" for the company's own pages or the competitor's domain, and the page path. Only quotes that show this group is targeted.
- Write plainly. No marketing language. No em dashes.`,
  user:`Company: ${site.name} (${own})\n${summaryOf(site).slice(0,2000)}\n\nPage notes, grouped by company:\n${notes}`}).catch(e=>{throw new Error(`The writing model could not finish: ${(e as Error).message}`);})).text);
 if(!out?.groups?.length)throw new Error('The writing model did not return buyer groups. Try again.');

 // Check every quote against the page it names. "You serve this" needs proof from the company's own site.
 const list=(v:unknown)=>Array.isArray(v)?v.map(x=>clean(String(x))).filter(Boolean).slice(0,8):[];
 const found:BuyerGroup[]=out.groups.slice(0,8).map((g,i)=>{
  const evidence=(Array.isArray(g.evidence)?g.evidence:[]).flatMap(e=>{const from=e.from==='you'||rootDomain(e.from)===own?'you':rootDomain(e.from);const page=verifyQuote(e.quote||'',sources.get(from)||[]);
   return page?[{from,page:new URL(page.url).pathname||'/',quote:clean(e.quote)}]:[];});
  const companies=[...new Set(evidence.map(e=>e.from))];
  return {id:`g${Date.now().toString(36)}${i}`,name:clean(g.name||'Buyers'),who:clean(g.who||''),companyType:clean(g.companyType||''),size:clean(g.size||''),roles:list(g.roles),pains:list(g.pains),triggers:list(g.triggers),searches:list(g.searches),compares:list(g.compares),objections:list(g.objections),
   knowledge:['new','familiar','expert'].includes(g.knowledge)?g.knowledge:'familiar',served:companies.includes('you')?'yours':'market',companies,evidence,
   confidence:evidence.length>=3||companies.length>=2?'high':evidence.length?'medium':'low',added:'auto',status:'kept'};});
 found.sort((a,b)=>(a.served===b.served?0:a.served==='yours'?-1:1)||(['high','medium','low'].indexOf(a.confidence)-['high','medium','low'].indexOf(b.confidence)));
 return store.saveMarket(host,{groups:[...market.groups.filter(g=>g.added==='you'),...found]});
}

// ---------- For the writer ----------
// Written next to context-full.md, so every writing call sees the confirmed market.
export function marketMd(name:string,m:Market){
 const comp=m.competitors.filter(c=>c.status==='kept'),groups=m.groups.filter(g=>g.status==='kept');
 const line=(label:string,v:string[])=>v.length?`- ${label}: ${v.join('; ')}\n`:'';
 return `## Competitors (confirmed by the user)
${comp.map(c=>`- ${c.name||c.domain} (${c.domain})${c.match==='adjacent'?' [adjacent]':''}${c.what?`: ${c.what}`:''}${c.why?` ${c.why}`:''}`).join('\n')||'- None confirmed yet.'}

## Ideal customer profiles
> Rule: only profiles marked "Your ICP" may be described as who ${name} is for. "Adjacent segment" profiles describe the wider market: use them for shared pain points, words and comparisons, never to claim ${name} targets them.

${groups.map(g=>`### ${g.name} [${g.served==='yours'?'Your ICP':'Adjacent segment'}]
${g.who}
${line('Company type',[g.companyType,g.size].filter(Boolean))}${line('Decision makers',g.roles)}${line('Pain points',g.pains)}${line('Buying triggers',g.triggers)}${line('Search terms',g.searches)}${line('Alternatives considered',g.compares)}${line('Objections',g.objections)}- Awareness: ${{new:'problem aware',familiar:'solution aware',expert:'product aware'}[g.knowledge]}
${g.evidence.map(e=>`- Evidence [${e.from==='you'?name:e.from} ${e.page}]: "${e.quote}"`).join('\n')}`).join('\n\n')||'None confirmed yet.'}
`;
}
export async function writeMarketMd(host:string,name:string,m:Market){
 const dir=path.join(ROOT,host.replace(/[^a-z0-9.-]/gi,''));await fs.mkdir(dir,{recursive:true});
 await fs.writeFile(path.join(dir,'market.md'),marketMd(name,m));
}
