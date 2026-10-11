// Routes for companies and articles. Each one names the company by its domain, like the publishing routes.
import type {Connect} from 'vite';
import {body,json,query} from '../http';
import {HttpError} from './store';
import type {GetStore} from './index';

export function dbRoutes(use:Connect.Server['use'],getStore:GetStore){
 const route=(path:string,fn:(req:Connect.IncomingMessage,res:any)=>Promise<unknown>)=>use(path,async(req,res)=>{
  try{json(res,200,await fn(req,res));}
  catch(e){json(res,(e as {status?:number}).status||(/not available/.test((e as Error).message)?503:500),{error:(e as Error).message});}
 });
 // The company and its articles, newest first, without article content.
 route('/api/workspace',async req=>(await getStore()).workspace(query(req).get('domain')));
 route('/api/companies',async req=>{const c=await body(req);if(typeof c.domain!=='string')throw new HttpError(400,'A company needs a domain.');return {company:await (await getStore()).saveCompany(c)};});
 route('/api/import',async req=>{const {company,articles}=await body(req);if(typeof company?.domain!=='string')throw new HttpError(400,'A company needs a domain.');return (await getStore()).importBrowser(company,articles);});
 // POST /api/articles                  {domain, article, event?}  create or change
 // POST /api/articles/bulk             {domain, ids, action}      archive, restore or delete
 // GET  /api/articles/:id?domain=      one article with its content
 // GET  /api/articles/:id/events?domain=
 // POST /api/articles/:id/duplicate    {domain}
 route('/api/articles',async req=>{
  const s=await getStore(),[id,sub]=(req.url||'').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
  if(req.method==='POST'&&!id){const b=await body(req);return {article:await s.saveArticle(b.domain,b.article||{},b.event)};}
  if(req.method==='POST'&&id==='bulk'){const b=await body(req);return {ids:await s.bulk(b.domain,b.ids,b.action)};}
  if(req.method==='POST'&&sub==='duplicate'){const b=await body(req);return {article:await s.duplicate(b.domain,id)};}
  if(req.method==='GET'&&id&&sub==='events')return {events:await s.events(query(req).get('domain'),id)};
  if(req.method==='GET'&&id&&!sub)return {article:await s.article(query(req).get('domain'),id)};
  throw new HttpError(404,'Not found.');
 });
}
