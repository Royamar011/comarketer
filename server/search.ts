// Web search, behind one small interface so a paid provider (DataForSEO, Serper) can replace it without touching
// research logic. Default: DuckDuckGo's plain HTML results, then Bing's, with no key. Results are what a person sees.
import * as cheerio from 'cheerio';
import {get,sleep} from './research';

export type Hit={title:string;url:string;snippet:string;position:number};
export type Search=(query:string)=>Promise<Hit[]>;

const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
const httpUrl=(u:string)=>{try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:'';}catch{return '';}};

// DuckDuckGo wraps each result in a redirect (/l/?uddg=<the real address>).
export function parseDuckDuckGo(html:string):Hit[]{
 const $=cheerio.load(html),out:Hit[]=[];
 $('.result').each((_,el)=>{const a=$(el).find('a.result__a').first();let href=a.attr('href')||'';
  if(href.includes('uddg='))try{href=decodeURIComponent(new URL(href,'https://duckduckgo.com').searchParams.get('uddg')||'');}catch{href='';}
  const url=httpUrl(href);if(!url||/duckduckgo\.com\/y\.js|[?&]ad_/.test(href))return;
  out.push({title:clean(a.text()),url,snippet:clean($(el).find('.result__snippet').text()),position:out.length+1});});
 return out;
}
export function parseBing(html:string):Hit[]{
 const $=cheerio.load(html),out:Hit[]=[];
 $('li.b_algo').each((_,el)=>{const a=$(el).find('h2 a').first(),url=httpUrl(a.attr('href')||'');if(!url)return;
  out.push({title:clean(a.text()),url,snippet:clean($(el).find('.b_caption p, .b_lineclamp2, .b_lineclamp3').first().text()),position:out.length+1});});
 return out;
}

// Both engines throttle automated searches, so searches run one at a time with a short pause.
let queue:Promise<unknown>=Promise.resolve();
export const webSearch:Search=query=>{
 const run=async()=>{
  const ddg=await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,12000);
  let hits=ddg.ok?parseDuckDuckGo(ddg.text):[];
  if(!hits.length){const bing=await get(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`,12000);hits=bing.ok?parseBing(bing.text):[];}
  await sleep(700);
  return hits.slice(0,10);
 };
 const p=queue.then(run,run);queue=p.catch(()=>{});return p;
};
