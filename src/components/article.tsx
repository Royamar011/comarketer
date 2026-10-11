import type {Block,Post} from '../post';

// The finished article as readers will see it. Rendered from the same Post every copy, export and publisher uses.
export function ArticleBody({post,images,editable=false,minutes=8,bodyRef}:{post:Post;images:string[];editable?:boolean;minutes?:number;bodyRef?:React.Ref<HTMLElement>}){
 const Figure=({i,featured}:{i:number;featured?:boolean})=><figure data-img={i} data-featured={featured||undefined} contentEditable={false}>{images[i]?<img src={images[i]} alt={post.images[i].alt} width={1600} height={900}/>:<span className="gen-image loading"/>}<figcaption><b>Alt text</b> {post.images[i].alt}</figcaption></figure>;
 const block=(b:Block,i:number)=>{
  switch(b.t){
   case 'p':return <p key={i} className={i===0?'answer-first':''}>{b.text}</p>;
   case 'h2':return <h2 key={i}>{b.text}</h2>;
   case 'h3':return <h3 key={i}>{b.text}</h3>;
   case 'ul':return <ul key={i}>{b.items.map((x,j)=><li key={j}>{x}</li>)}</ul>;
   case 'ol':return <ol key={i}>{b.items.map((x,j)=><li key={j}>{x}</li>)}</ol>;
   case 'table':return <table key={i}><thead><tr>{b.rows[0].map((c,k)=><th key={k}>{c}</th>)}</tr></thead><tbody>{b.rows.slice(1).map((r,j)=><tr key={j}>{r.map((c,k)=><td key={k}>{c}</td>)}</tr>)}</tbody></table>;
   case 'image':return <Figure key={i} i={b.img}/>;
  }
 };
 return <article ref={bodyRef} className={`paper article ${editable?'editing':''}`} contentEditable={editable} suppressContentEditableWarning>
  <span className="eyebrow" contentEditable={false}>{post.byline.split(' · ')[0]} · {minutes} min read</span>
  <h1>{post.title}</h1>
  <Figure i={post.featured} featured/>
  {post.blocks.map(block)}
  {post.faq.length>0&&<section data-faq><h2 contentEditable={false}>Frequently asked questions</h2>{post.faq.map((f,i)=><div key={i} className="faq-item"><h3>{f.q}</h3><p>{f.a}</p></div>)}</section>}
 </article>;
}

// Reads an edited article back into a Post. Goes by element type, so paragraphs the editor adds or removes are kept
// in order. Images stay where they were unless their figure is deleted.
export function readEdits(el:HTMLElement,post:Post):Post{
 const text=(n:Element|null)=>(n?.textContent||'').replace(/\s+/g,' ').trim();
 const blocks:Block[]=[];let title=post.title,faq=post.faq;
 for(const n of Array.from(el.children)){
  const tag=n.tagName.toLowerCase();
  if(tag==='h1'){title=text(n)||post.title;continue;}
  if(tag==='figure'){if(!n.hasAttribute('data-featured')&&n.getAttribute('data-img'))blocks.push({t:'image',img:Number(n.getAttribute('data-img'))});continue;}
  if(tag==='section'&&n.hasAttribute('data-faq')){faq=Array.from(n.querySelectorAll('.faq-item')).map(f=>({q:text(f.querySelector('h3')),a:text(f.querySelector('p'))})).filter(f=>f.q&&f.a);continue;}
  if(tag==='ul'||tag==='ol'){const items=Array.from(n.querySelectorAll('li')).map(text).filter(Boolean);if(items.length)blocks.push({t:tag,items});continue;}
  if(tag==='table'){const rows=Array.from(n.querySelectorAll('tr')).map(r=>Array.from(r.children).map(text));if(rows.length>1)blocks.push({t:'table',rows});continue;}
  if(tag==='h2'||tag==='h3'||tag==='p'||tag==='div'){const t=text(n);if(t)blocks.push({t:tag==='div'?'p':tag,text:t});}
 }
 return {...post,title,blocks,faq,images:title===post.title?post.images:post.images.map(im=>im.kind==='cover'?{...im,heading:title}:im)};
}
