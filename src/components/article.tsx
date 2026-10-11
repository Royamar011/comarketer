import type {Block,Post} from '../post';

// The finished article as readers will see it. Rendered from the same Post every copy, export and publisher uses.
export function ArticleBody({post,images,editable=false,minutes=8}:{post:Post;images:string[];editable?:boolean;minutes?:number}){
 const Figure=({i}:{i:number})=><figure>{images[i]?<img src={images[i]} alt={post.images[i].alt} width={1600} height={900}/>:<span className="gen-image loading"/>}<figcaption><b>Alt text</b> {post.images[i].alt}</figcaption></figure>;
 const block=(b:Block,i:number)=>{
  switch(b.t){
   case 'p':return <p key={i} className={i===0?'answer-first':''}>{b.text}</p>;
   case 'h2':return <h2 key={i}>{b.text}</h2>;
   case 'h3':return <h3 key={i}>{b.text}</h3>;
   case 'ul':return <ul key={i}>{b.items.map(x=><li key={x}>{x}</li>)}</ul>;
   case 'ol':return <ol key={i}>{b.items.map(x=><li key={x}>{x}</li>)}</ol>;
   case 'table':return <table key={i}><thead><tr>{b.rows[0].map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{b.rows.slice(1).map((r,j)=><tr key={j}>{r.map((c,k)=><td key={k}>{c}</td>)}</tr>)}</tbody></table>;
   case 'image':return <Figure key={i} i={b.img}/>;
  }
 };
 return <article className={`paper article ${editable?'editing':''}`} contentEditable={editable} suppressContentEditableWarning>
  <span className="eyebrow">{post.byline.split(' · ')[0]} · {minutes} min read</span>
  <h1>{post.title}</h1>
  <Figure i={post.featured}/>
  {post.blocks.map(block)}
  {post.faq.length>0&&<section><h2>Frequently asked questions</h2>{post.faq.map(f=><div key={f.q} className="faq-item"><h3>{f.q}</h3><p>{f.a}</p></div>)}</section>}
 </article>;
}
