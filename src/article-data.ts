import {useEffect,useMemo,useState} from 'react';
import {voicesFor,type Voice} from './data';
import {makeSample,samplePost} from './sample';
import {renderCard,dataToBytes,extOf} from './cards';
import {toHTML,toMarkdown,toPage,toJsonLd,type Post} from './post';
import {makeZip} from './zip';
import {useWorkspace} from './workspace';

// The article for a keyword and title, plus its rendered images (data URLs).
export function useArticle(keyword:string,title:string,voice:Voice){
 const ws=useWorkspace();
 const post=useMemo(()=>{const S=makeSample(keyword,ws.name,ws.domain),v=voicesFor(ws.name)[voice||'team'];
  return samplePost(S,{title,byline:`${v.byline} · ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`,author:voice==='founder'?{name:'The founder',type:'Person'}:{name:`${ws.name} team`,type:'Organization'},company:{name:ws.name,url:ws.domain?`https://${ws.domain}`:'',logo:ws.logo}});
 },[keyword,title,voice,ws.name,ws.domain,ws.logo]);
 const [images,setImages]=useState<string[]>([]);
 useEffect(()=>{let live=true;setImages([]);Promise.all(post.images.map(im=>renderCard(im,ws.name,post.keyword))).then(x=>{if(live)setImages(x);});return()=>{live=false;};},[post]);
 return {post,images,ready:images.length===post.images.length};
}

const file=(post:Post,i:number,images:string[])=>`images/${String(i+1).padStart(2,'0')}-${post.images[i].name}.${extOf(images[i]||'')}`;

// Pastes with headings, lists, tables and images intact into Google Docs, WordPress, Notion and most editors.
export async function copyFormatted(post:Post,images:string[]){
 const html=toHTML(post,i=>({src:images[i],alt:post.images[i].alt}),{featured:true});
 const text=toMarkdown(post,i=>({src:file(post,i,images),alt:post.images[i].alt}));
 await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);
}
// Clean HTML for a CMS code editor. Images point at the files in the download.
export const copyHTML=(post:Post,images:string[])=>{return navigator.clipboard.writeText(toHTML(post,i=>({src:file(post,i,images),alt:post.images[i].alt}),{title:false}));};
export const copyMarkdown=(post:Post,images:string[])=>{return navigator.clipboard.writeText(toMarkdown(post,i=>({src:file(post,i,images),alt:post.images[i].alt})));};

export function downloadZip(post:Post,images:string[]){
 const img=(i:number)=>({src:file(post,i,images),alt:post.images[i].alt});
 const meta=`Title: ${post.title}\nSEO title: ${post.metaTitle}\nMeta description: ${post.metaDescription}\nSlug: ${post.slug}\nKeyword: ${post.keyword}\nExcerpt: ${post.excerpt}\n\nImages and alt text:\n${post.images.map((im,i)=>`${file(post,i,images)}: ${im.alt}`).join('\n')}\n`;
 const blob=makeZip([
  {name:`${post.slug}/index.html`,data:toPage(post,img)},
  {name:`${post.slug}/body.html`,data:toHTML(post,img,{title:false})},
  {name:`${post.slug}/body-with-title.html`,data:toHTML(post,img,{featured:true})},
  {name:`${post.slug}/article.md`,data:toMarkdown(post,img)},
  {name:`${post.slug}/schema.json`,data:JSON.stringify(toJsonLd(post,'',''),null,2)},
  {name:`${post.slug}/seo.txt`,data:meta},
  ...images.map((d,i)=>({name:`${post.slug}/${file(post,i,images)}`,data:dataToBytes(d)})),
 ]);
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${post.slug}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
