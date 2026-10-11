// One article, many formats. The preview, every copy and export, and every platform publisher render from this,
// so what the user sees is exactly what lands in their CMS. No browser or server APIs here: both sides import it.

export type CardKind='cover'|'checklist'|'table'|'steps';
export type PostImage={name:string;alt:string;kind:CardKind;heading:string;items?:string[];rows?:string[][]};
export type Block=
 {t:'p'|'h2'|'h3';text:string}|
 {t:'ul'|'ol';items:string[]}|
 {t:'table';rows:string[][]}|
 {t:'image';img:number};
export type Post={
 title:string;slug:string;metaTitle:string;metaDescription:string;excerpt:string;keyword:string;
 byline:string;author:{name:string;type:'Person'|'Organization'};company:{name:string;url:string;logo:string};
 datePublished:string;blocks:Block[];faq:{q:string;a:string}[];images:PostImage[];featured:number;
};
export type ImageRef={src:string;alt:string;id?:string|number};

const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const mdEsc=(s:string)=>s.replace(/\|/g,'\\|');

// Clean, semantic HTML. `title:false` for platforms that render the title themselves (all of them do).
export function toHTML(post:Post,img:(i:number)=>ImageRef,o:{title?:boolean;featured?:boolean;tables?:'table'|'list'|'ghost-card'}={}){
 const out:string[]=[];if(o.title!==false)out.push(`<h1>${esc(post.title)}</h1>`);
 // Platforms set the featured image separately; copies and downloads show it under the title.
 if(o.featured){const r=img(post.featured);out.push(`<figure><img src="${esc(r.src)}" alt="${esc(r.alt)}" width="1600" height="900"></figure>`);}
 const table=(rows:string[][])=>{
  if(o.tables==='list')return `<ul>${rows.slice(1).map(r=>`<li><strong>${esc(r[0])}:</strong> ${r.slice(1).map((c,j)=>`${esc(rows[0][j+1]||'')} ${esc(c)}`.trim()).join('; ')}</li>`).join('')}</ul>`;
  const t=`<table><thead><tr>${rows[0].map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return o.tables==='ghost-card'?`<!--kg-card-begin: html-->${t}<!--kg-card-end: html-->`:t;
 };
 for(const b of post.blocks){
  if(b.t==='p'||b.t==='h2'||b.t==='h3')out.push(`<${b.t}>${esc(b.text)}</${b.t}>`);
  else if(b.t==='ul'||b.t==='ol')out.push(`<${b.t}>${b.items.map(i=>`<li>${esc(i)}</li>`).join('')}</${b.t}>`);
  else if(b.t==='table')out.push(table(b.rows));
  else if(b.t==='image'){const r=img(b.img);out.push(`<figure><img src="${esc(r.src)}" alt="${esc(r.alt)}" width="1600" height="900" loading="lazy"></figure>`);}
 }
 if(post.faq.length){out.push(`<h2>Frequently asked questions</h2>`);for(const f of post.faq)out.push(`<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`);}
 return out.join('\n');
}

export function toMarkdown(post:Post,img:(i:number)=>ImageRef){
 const f=img(post.featured),out:string[]=[`# ${post.title}`,`![${f.alt}](${f.src})`];
 for(const b of post.blocks){
  if(b.t==='p')out.push(b.text);else if(b.t==='h2')out.push(`## ${b.text}`);else if(b.t==='h3')out.push(`### ${b.text}`);
  else if(b.t==='ul')out.push(b.items.map(i=>`- ${i}`).join('\n'));else if(b.t==='ol')out.push(b.items.map((i,n)=>`${n+1}. ${i}`).join('\n'));
  else if(b.t==='table')out.push([`| ${b.rows[0].map(mdEsc).join(' | ')} |`,`|${b.rows[0].map(()=>' --- ').join('|')}|`,...b.rows.slice(1).map(r=>`| ${r.map(mdEsc).join(' | ')} |`)].join('\n'));
  else if(b.t==='image'){const r=img(b.img);out.push(`![${r.alt}](${r.src})`);}
 }
 if(post.faq.length){out.push('## Frequently asked questions');for(const f of post.faq)out.push(`### ${f.q}\n\n${f.a}`);}
 return out.join('\n\n')+'\n';
}

// WordPress block editor markup, so the post opens as real blocks rather than one Classic block.
export function toWordPress(post:Post,img:(i:number)=>ImageRef){
 const out:string[]=[];
 const p=(t:string)=>`<!-- wp:paragraph -->\n<p>${esc(t)}</p>\n<!-- /wp:paragraph -->`;
 const h=(t:string,l:2|3)=>`<!-- wp:heading${l===3?' {"level":3}':''} -->\n<h${l} class="wp-block-heading">${esc(t)}</h${l}>\n<!-- /wp:heading -->`;
 for(const b of post.blocks){
  if(b.t==='p')out.push(p(b.text));else if(b.t==='h2')out.push(h(b.text,2));else if(b.t==='h3')out.push(h(b.text,3));
  else if(b.t==='ul'||b.t==='ol')out.push(`<!-- wp:list${b.t==='ol'?' {"ordered":true}':''} -->\n<${b.t} class="wp-block-list">${b.items.map(i=>`<!-- wp:list-item -->\n<li>${esc(i)}</li>\n<!-- /wp:list-item -->`).join('\n')}</${b.t}>\n<!-- /wp:list -->`);
  else if(b.t==='table')out.push(`<!-- wp:table -->\n<figure class="wp-block-table"><table><thead><tr>${b.rows[0].map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.slice(1).map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></figure>\n<!-- /wp:table -->`);
  else if(b.t==='image'){const r=img(b.img);const id=r.id?`{"id":${r.id},"sizeSlug":"large","linkDestination":"none"}`:'{"sizeSlug":"large","linkDestination":"none"}';
   out.push(`<!-- wp:image ${id} -->\n<figure class="wp-block-image size-large"><img src="${esc(r.src)}" alt="${esc(r.alt)}"${r.id?` class="wp-image-${r.id}"`:''}/></figure>\n<!-- /wp:image -->`);}
 }
 if(post.faq.length){out.push(h('Frequently asked questions',2));for(const f of post.faq)out.push(h(f.q,3),p(f.a));}
 return out.join('\n\n');
}

// BlogPosting structured data (Google: headline, image, dates, author with name). FAQPage only when asked:
// Google stopped showing FAQ rich results in May 2026, so it is optional and off by default.
export function toJsonLd(post:Post,url:string,imageUrl:string,o:{faq?:boolean}={}){
 const blog={'@context':'https://schema.org','@type':'BlogPosting',headline:post.title,description:post.metaDescription,image:imageUrl?[imageUrl]:undefined,
  datePublished:post.datePublished,dateModified:post.datePublished,author:{'@type':post.author.type,name:post.author.name},
  publisher:{'@type':'Organization',name:post.company.name,logo:post.company.logo?{'@type':'ImageObject',url:post.company.logo}:undefined},
  mainEntityOfPage:url||undefined,keywords:post.keyword};
 const list:object[]=[blog];
 if(o.faq&&post.faq.length)list.push({'@context':'https://schema.org','@type':'FAQPage',mainEntity:post.faq.map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}}))});
 return list;
}
export const jsonLdScript=(data:object[])=>data.map(d=>`<script type="application/ld+json">${JSON.stringify(d)}</script>`).join('\n');

// A full standalone page, used by the download.
export function toPage(post:Post,img:(i:number)=>ImageRef){
 const featured=img(post.featured);
 return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(post.metaTitle)}</title>
<meta name="description" content="${esc(post.metaDescription)}">
<meta property="og:title" content="${esc(post.metaTitle)}">
<meta property="og:description" content="${esc(post.metaDescription)}">
<meta property="og:image" content="${esc(featured.src)}">
${jsonLdScript(toJsonLd(post,'',featured.src))}
</head>
<body>
<article>
<p>${esc(post.byline)}</p>
${toHTML(post,img,{featured:true})}
</article>
</body>
</html>
`;
}
