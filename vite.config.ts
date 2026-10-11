import {defineConfig,loadEnv,type Plugin} from 'vite';
import {readBrief,research} from './server/research';
import {makeWriter,type Writer} from './server/llm';
import {publishRoutes} from './server/api';
import {database,type GetStore} from './server/db';
import {dbRoutes} from './server/db/routes';

// /api/research?domain=… streams progress as server-sent events while the website is read and the brief is written.
// API keys stay on this local server; the browser never sees them.
function researchApi(writer:Writer|null,getStore:GetStore):Plugin{
 return {name:'research-api',configureServer(server){
  const use=server.middlewares.use.bind(server.middlewares);
  publishRoutes(use,getStore);
  dbRoutes(use,getStore);
  // Internal: both versions of the brief (context.md for the user, context-full.md for writing).
  server.middlewares.use('/api/brief',async(req,res)=>{
   const host=new URL(req.url||'',`http://${req.headers.host}`).searchParams.get('domain')||'';
   res.setHeader('content-type','application/json');res.end(JSON.stringify(await readBrief(host)));
  });
  server.middlewares.use('/api/research',async(req,res)=>{
   const domain=new URL(req.url||'',`http://${req.headers.host}`).searchParams.get('domain')||'';
   res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache',connection:'keep-alive'});
   let closed=false;req.on('close',()=>{closed=true;});
   const send=(e:Record<string,unknown>)=>{if(closed)throw new Error('closed');res.write(`data: ${JSON.stringify(e)}\n\n`);};
   if(!writer){send({t:'error',message:'No writing model is set up. Add ANTHROPIC_API_KEY to .env (or LLM_BASE_URL, LLM_API_KEY and LLM_MODEL for testing), then restart the dev server.'});return res.end();}
   try{await research(domain,writer,send);}catch(err){if(!closed)send({t:'error',message:(err as Error).message});}
   res.end();
  });
 }};
}

// React is compiled by Vite's built-in esbuild JSX transform; no plugin needed for the design prototype.
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'');
 return {esbuild:{jsx:'automatic'},plugins:[researchApi(makeWriter(env),database(env.DATABASE_URL||''))],server:{fs:{allow:['..','/Users/amarroy/.cache/comarketer-runtime']},watch:{ignored:['**/research-store/**','**/.secrets/**','**/.data/**']}}};
});
