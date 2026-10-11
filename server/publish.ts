// Publishing to blog platforms. Every publisher: upload images to the platform, create the post (draft by default),
// put SEO fields where that platform keeps them, then read the post back to confirm it saved.
// Platform notes and sources: CMS_INTEGRATIONS.md.
import crypto from 'node:crypto';
import {toHTML,toJsonLd,toWordPress,jsonLdScript,type Post} from '../src/post';
import type {Connection,Platform} from './connections';

export type InImage={name:string;alt:string;mime:string;base64:string};
export type Progress={step:(label:string)=>void;warn:(text:string)=>void};
export type Result={id:string;url:string;editUrl:string;status:'draft'|'published';warnings:string[]};
type Creds=Record<string,string>;

const site=(u:string)=>{const s=u.trim().replace(/\/+$/,'');return /^https?:\/\//.test(s)?s:`https://${s}`;};
async function call(label:string,url:string,init:RequestInit={}):Promise<any>{
 let r:Response;try{r=await fetch(url,init);}catch{throw new Error(`${label}: could not reach ${new URL(url).host}. Check the address.`);}
 const text=await r.text();let body:any=text;try{body=JSON.parse(text);}catch{}
 if(!r.ok){const msg=body?.message||body?.error?.message||body?.errors?.[0]?.message||body?.msg||text.slice(0,200);
  throw new Error(`${label} (${r.status}): ${r.status===401||r.status===403?'the key was refused. Check it has write access. ':''}${String(msg).slice(0,240)}`);}
 return body;
}
const bytes=(img:InImage)=>Buffer.from(img.base64,'base64');
const blobOf=(img:InImage)=>new Blob([new Uint8Array(bytes(img))],{type:img.mime});
const fileName=(post:Post,i:number,img:InImage)=>`${post.slug}-${String(i+1).padStart(2,'0')}-${post.images[i].name}.${img.mime==='image/jpeg'?'jpg':'png'}`;

// ---------------- WordPress (REST API + Application Password) ----------------
const wpAuth=(c:Creds)=>({authorization:'Basic '+Buffer.from(`${c.username}:${c.appPassword.replace(/\s+/g,'')}`).toString('base64')});
const wordpress={
 async test(c:Creds){
  const base=site(c.site),root=await call('WordPress',`${base}/wp-json/`);
  await call('WordPress',`${base}/wp-json/wp/v2/users/me?context=edit`,{headers:wpAuth(c)});
  const ns:string[]=root.namespaces||[],seo=ns.includes('yoast/v1')?'yoast':ns.includes('rankmath/v1')?'rankmath':'none';
  return {label:root.name||new URL(base).host,settings:{site:base,seo}};
 },
 async publish(conn:Connection,post:Post,images:InImage[],mode:'draft'|'publish',p:Progress):Promise<Result>{
  const c=conn.creds,base=site(c.site),h=wpAuth(c),warnings:string[]=[];
  const media:{id:number;url:string}[]=[];
  for(let i=0;i<images.length;i++){p.step(`Uploading image ${i+1} of ${images.length}`);
   const m=await call('WordPress media',`${base}/wp-json/wp/v2/media`,{method:'POST',headers:{...h,'content-type':images[i].mime,'content-disposition':`attachment; filename="${fileName(post,i,images[i])}"`},body:bytes(images[i])});
   await call('WordPress media',`${base}/wp-json/wp/v2/media/${m.id}`,{method:'POST',headers:{...h,'content-type':'application/json'},body:JSON.stringify({alt_text:images[i].alt})});
   media.push({id:m.id,url:m.source_url});}
  const seo=conn.settings.seo,meta:Record<string,string>=seo==='yoast'?{_yoast_wpseo_title:post.metaTitle,_yoast_wpseo_metadesc:post.metaDescription,_yoast_wpseo_focuskw:post.keyword}
   :seo==='rankmath'?{rank_math_title:post.metaTitle,rank_math_description:post.metaDescription,rank_math_focus_keyword:post.keyword}:{};
  let content=toWordPress(post,i=>({src:media[i].url,alt:post.images[i].alt,id:media[i].id}));
  // SEO plugins already add Article schema; only add ours when there is none.
  if(seo==='none')content+=`\n\n<!-- wp:html -->\n${jsonLdScript(toJsonLd(post,'',media[post.featured]?.url||''))}\n<!-- /wp:html -->`;
  p.step(mode==='publish'?'Publishing the post':'Creating the draft');
  const made=await call('WordPress post',`${base}/wp-json/wp/v2/posts`,{method:'POST',headers:{...h,'content-type':'application/json'},
   body:JSON.stringify({title:post.title,slug:post.slug,content,excerpt:post.excerpt,status:mode==='publish'?'publish':'draft',featured_media:media[post.featured]?.id,meta})});
  p.step('Checking it saved');
  const back=await call('WordPress check',`${base}/wp-json/wp/v2/posts/${made.id}?context=edit`,{headers:h});
  if(back.title?.raw!==post.title)warnings.push('The title came back different. Check it in WordPress.');
  if(seo==='none')warnings.push('No SEO plugin found. Set the SEO title and meta description in WordPress, or install Yoast or Rank Math.');
  else if(Object.keys(meta).some(k=>back.meta?.[k]!==meta[k]))warnings.push(`${seo==='yoast'?'Yoast':'Rank Math'} did not accept the SEO title and description through the API. Install the small plugin in integrations/wordpress once, then publish again.`);
  return {id:String(made.id),url:back.link||made.link,editUrl:`${base}/wp-admin/post.php?post=${made.id}&action=edit`,status:mode==='publish'?'published':'draft',warnings};
 },
};

// ---------------- Webflow (Data API v2 + site token) ----------------
const wf=(c:Creds)=>({authorization:`Bearer ${c.token}`,'accept-version':'2.0.0'});
const WF='https://api.webflow.com/v2';
const webflow={
 async test(c:Creds){const s=await call('Webflow',`${WF}/sites`,{headers:wf(c)});const first=s.sites?.[0];if(!first)throw new Error('Webflow: this token has no site.');
  return {label:first.displayName,settings:{siteId:first.id,domain:first.customDomains?.[0]?.url||`${first.shortName}.webflow.io`}};},
 // Collections and their fields, so the user can map them once.
 async options(c:Creds,siteId:string){
  const cols=await call('Webflow',`${WF}/sites/${siteId}/collections`,{headers:wf(c)});
  return Promise.all((cols.collections||[]).map(async(col:any)=>{const d=await call('Webflow',`${WF}/collections/${col.id}`,{headers:wf(c)});
   return {id:col.id,name:col.displayName,slug:col.slug,fields:(d.fields||[]).map((f:any)=>({slug:f.slug,name:f.displayName,type:f.type,required:f.isRequired}))};}));
 },
 async upload(c:Creds,siteId:string,name:string,img:InImage){
  const data=bytes(img);
  const hash=crypto.createHash('md5').update(data).digest('hex');
  const a=await call('Webflow asset',`${WF}/sites/${siteId}/assets`,{method:'POST',headers:{...wf(c),'content-type':'application/json'},body:JSON.stringify({fileName:name,fileHash:hash})});
  const form=new FormData();for(const [k,v] of Object.entries(a.uploadDetails||{}))form.append(k,String(v));form.append('file',blobOf(img),name);
  const up=await fetch(a.uploadUrl,{method:'POST',body:form});if(!up.ok)throw new Error(`Webflow asset upload (${up.status}).`);
  return a.hostedUrl||a.assetUrl;
 },
 async publish(conn:Connection,post:Post,images:InImage[],mode:'draft'|'publish',p:Progress):Promise<Result>{
  const c=conn.creds,s=conn.settings,m=s.map||{},warnings:string[]=[];
  if(!s.collectionId||!m.body)throw new Error('Webflow: pick the blog collection and match its fields in Settings first.');
  const urls:string[]=[];
  for(let i=0;i<images.length;i++){p.step(`Uploading image ${i+1} of ${images.length}`);urls.push(await webflow.upload(c,s.siteId,fileName(post,i,images[i]),images[i]));}
  // Webflow rich text has no tables, so tables become labelled lists.
  const fieldData:Record<string,unknown>={name:post.title,slug:post.slug,[m.body]:toHTML(post,i=>({src:urls[i],alt:post.images[i].alt}),{title:false,tables:'list'})};
  if(m.summary)fieldData[m.summary]=post.excerpt;if(m.metaTitle)fieldData[m.metaTitle]=post.metaTitle;if(m.metaDescription)fieldData[m.metaDescription]=post.metaDescription;
  if(m.image)fieldData[m.image]={url:urls[post.featured],alt:post.images[post.featured].alt};
  if(m.date)fieldData[m.date]=new Date().toISOString();
  const live=`https://${s.domain}/${s.collectionSlug}/${post.slug}`;
  if(m.schema)fieldData[m.schema]=jsonLdScript(toJsonLd(post,live,urls[post.featured]));else warnings.push('No schema field matched. Add a plain text field for schema in the collection and match it in Settings.');
  if(!m.metaDescription)warnings.push('No meta description field matched, so Webflow will use its default.');
  p.step(mode==='publish'?'Publishing the post':'Creating the draft');
  const made=await call('Webflow item',`${WF}/collections/${s.collectionId}/items${mode==='publish'?'/live':''}`,{method:'POST',headers:{...wf(c),'content-type':'application/json'},body:JSON.stringify({isDraft:mode!=='publish',isArchived:false,fieldData})});
  const id=made.id||made.items?.[0]?.id;
  p.step('Checking it saved');
  const back=await call('Webflow check',`${WF}/collections/${s.collectionId}/items/${id}${mode==='publish'?'/live':''}`,{headers:wf(c)});
  if(!back.fieldData?.[m.body])warnings.push('The body came back empty. Check the field match in Settings.');
  return {id,url:mode==='publish'?live:`https://webflow.com/dashboard/sites/${s.siteId}`,editUrl:`https://webflow.com/dashboard/sites/${s.siteId}`,status:mode==='publish'?'published':'draft',warnings};
 },
};

// ---------------- HubSpot (CMS Blog Posts API + private app token, scope: content) ----------------
const hs=(c:Creds)=>({authorization:`Bearer ${c.token}`});
const HS='https://api.hubapi.com';
const hubspot={
 async test(c:Creds){const b=await call('HubSpot',`${HS}/cms/v3/blog-settings/settings`,{headers:hs(c)});const blogs=b.results||[];if(!blogs.length)throw new Error('HubSpot: no blog found in this account.');
  return {label:blogs[0].name||'HubSpot blog',settings:{blogId:blogs[0].id,blogs:blogs.map((x:any)=>({id:x.id,name:x.name,url:x.absoluteUrl}))}};},
 async publish(conn:Connection,post:Post,images:InImage[],mode:'draft'|'publish',p:Progress):Promise<Result>{
  const c=conn.creds,warnings:string[]=[],urls:string[]=[];
  for(let i=0;i<images.length;i++){p.step(`Uploading image ${i+1} of ${images.length}`);
   const form=new FormData();form.append('file',blobOf(images[i]),fileName(post,i,images[i]));form.append('fileName',fileName(post,i,images[i]));form.append('folderPath','/comarketer');form.append('options',JSON.stringify({access:'PUBLIC_INDEXABLE',overwrite:false}));
   urls.push((await call('HubSpot file',`${HS}/files/v3/files`,{method:'POST',headers:hs(c),body:form})).url);}
  p.step('Creating the draft');
  const made=await call('HubSpot post',`${HS}/cms/v3/blogs/posts`,{method:'POST',headers:{...hs(c),'content-type':'application/json'},body:JSON.stringify({
   name:post.title,contentGroupId:conn.settings.blogId,slug:post.slug,htmlTitle:post.metaTitle,metaDescription:post.metaDescription,postSummary:post.excerpt,
   postBody:toHTML(post,i=>({src:urls[i],alt:post.images[i].alt}),{title:false}),featuredImage:urls[post.featured],featuredImageAltText:post.images[post.featured].alt,useFeaturedImage:true,publishDate:new Date().toISOString()})});
  if(mode==='publish'){p.step('Publishing the post');await call('HubSpot publish',`${HS}/cms/v3/blogs/posts/${made.id}`,{method:'PATCH',headers:{...hs(c),'content-type':'application/json'},body:JSON.stringify({state:'PUBLISHED'})});}
  p.step('Checking it saved');
  const back=await call('HubSpot check',`${HS}/cms/v3/blogs/posts/${made.id}`,{headers:hs(c)});
  if(back.metaDescription!==post.metaDescription)warnings.push('The meta description came back different. Check it in HubSpot.');
  return {id:String(made.id),url:back.url||'',editUrl:back.url||'https://app.hubspot.com',status:mode==='publish'?'published':'draft',warnings};
 },
};

// ---------------- Ghost (Admin API key → short-lived token) ----------------
function ghostToken(adminKey:string){
 const [id,secret]=adminKey.trim().split(':');if(!id||!secret)throw new Error('Ghost: the Admin API key looks like id:secret.');
 const b64=(o:object)=>Buffer.from(JSON.stringify(o)).toString('base64url'),now=Math.floor(Date.now()/1000);
 const unsigned=`${b64({alg:'HS256',typ:'JWT',kid:id})}.${b64({iat:now,exp:now+300,aud:'/admin/'})}`;
 return `${unsigned}.${crypto.createHmac('sha256',Buffer.from(secret,'hex')).update(unsigned).digest('base64url')}`;
}
const gh=(c:Creds)=>({authorization:`Ghost ${ghostToken(c.adminKey)}`,'accept-version':'v5.0'});
const ghost={
 async test(c:Creds){const s=await call('Ghost',`${site(c.site)}/ghost/api/admin/site/`,{headers:gh(c)});return {label:s.site?.title||new URL(site(c.site)).host,settings:{site:site(c.site)}};},
 async publish(conn:Connection,post:Post,images:InImage[],mode:'draft'|'publish',p:Progress):Promise<Result>{
  const c=conn.creds,base=site(c.site),warnings:string[]=[],urls:string[]=[];
  for(let i=0;i<images.length;i++){p.step(`Uploading image ${i+1} of ${images.length}`);
   const form=new FormData();form.append('file',blobOf(images[i]),fileName(post,i,images[i]));form.append('purpose','image');form.append('ref',fileName(post,i,images[i]));
   urls.push((await call('Ghost image',`${base}/ghost/api/admin/images/upload/`,{method:'POST',headers:gh(c),body:form})).images[0].url);}
  p.step(mode==='publish'?'Publishing the post':'Creating the draft');
  // Ghost has no tables in its editor, so each table goes in an HTML card and stays exact. Ghost adds Article schema itself.
  const made=(await call('Ghost post',`${base}/ghost/api/admin/posts/?source=html`,{method:'POST',headers:{...gh(c),'content-type':'application/json'},body:JSON.stringify({posts:[{
   title:post.title,slug:post.slug,html:toHTML(post,i=>({src:urls[i],alt:post.images[i].alt}),{title:false,tables:'ghost-card'}),status:mode==='publish'?'published':'draft',
   custom_excerpt:post.excerpt.slice(0,300),meta_title:post.metaTitle,meta_description:post.metaDescription,feature_image:urls[post.featured],feature_image_alt:post.images[post.featured].alt}]})})).posts[0];
  p.step('Checking it saved');
  const back=(await call('Ghost check',`${base}/ghost/api/admin/posts/${made.id}/?formats=html`,{headers:gh(c)})).posts[0];
  if(!back.html||back.html.length<200)warnings.push('Ghost saved the post with an empty body. Open it in Ghost to check.');
  if(back.meta_description!==post.metaDescription)warnings.push('The meta description did not save. Set it in Ghost under Post settings.');
  return {id:made.id,url:back.url,editUrl:`${base}/ghost/#/editor/post/${made.id}`,status:mode==='publish'?'published':'draft',warnings};
 },
};

export const publishers:Record<Platform,{test:(c:Creds)=>Promise<{label:string;settings:Record<string,any>}>;publish:(conn:Connection,post:Post,images:InImage[],mode:'draft'|'publish',p:Progress)=>Promise<Result>}>={wordpress,webflow,hubspot,ghost};
export const webflowOptions=webflow.options;
