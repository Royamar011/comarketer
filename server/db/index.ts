// The database. Postgres everywhere: DATABASE_URL (Supabase or any Postgres) when it is set, otherwise an embedded
// Postgres (PGlite) saved in .data/pglite, so running locally needs no setup. Both run the same migrations and queries.
import fs from 'node:fs/promises';
import path from 'node:path';
import {makeStore,type Store} from './store';

export type Q=<T=any>(sql:string,params?:unknown[])=>Promise<T[]>;
type Tx={query:Q;exec:(sql:string)=>Promise<void>};
export type Db={kind:'postgres'|'local';query:Q;tx:<T>(fn:(t:Tx)=>Promise<T>)=>Promise<T>;close:()=>Promise<void>};

async function open(url:string):Promise<Db>{
 if(url){
  const {default:pg}=await import('pg');
  const pool=new pg.Pool({connectionString:url,max:5});
  pool.on('error',()=>{});
  const run=(c:{query:(s:string,p?:unknown[])=>Promise<{rows:any[]}>}):Q=>async(s,p)=>(await c.query(s,p)).rows;
  return {kind:'postgres',query:run(pool),close:()=>pool.end(),
   async tx(fn){const c=await pool.connect();
    try{await c.query('begin');const r=await fn({query:run(c),exec:async s=>{await c.query(s);}});await c.query('commit');return r;}
    catch(e){await c.query('rollback').catch(()=>{});throw e;}finally{c.release();}}};
 }
 const {PGlite}=await import('@electric-sql/pglite');
 const dir=path.resolve('.data/pglite');await fs.mkdir(dir,{recursive:true});
 const db=await PGlite.create(dir);
 return {kind:'local',query:async(s,p)=>(await db.query(s,p)).rows as any[],close:()=>db.close(),
  tx:fn=>db.transaction(t=>fn({query:async(s,p)=>(await t.query(s,p)).rows as any[],exec:async s=>{await t.exec(s);}}))};
}

// Applies server/db/migrations/*.sql in name order, each once. The lock keeps two servers from migrating at the same time.
async function migrate(db:Db){
 const dir=path.resolve('server/db/migrations'),files=(await fs.readdir(dir)).filter(f=>f.endsWith('.sql')).sort();
 await db.tx(async t=>{
  await t.query('select pg_advisory_xact_lock(4711)');
  await t.exec('create table if not exists schema_migrations(name text primary key,applied_at timestamptz not null default now())');
  const done=new Set((await t.query<{name:string}>('select name from schema_migrations')).map(r=>r.name));
  for(const f of files)if(!done.has(f)){await t.exec(await fs.readFile(path.join(dir,f),'utf8'));await t.query('insert into schema_migrations(name) values($1)',[f]);}
 });
}

// Opened on first use. If it fails (a wrong DATABASE_URL, say), the next request tries again.
export function database(url:string){
 let ready:Promise<Store>|null=null;
 return ()=>ready??=open(url).then(async db=>{await migrate(db);return makeStore(db);}).catch(e=>{ready=null;throw new Error(`The database is not available: ${(e as Error).message}`);});
}
export type GetStore=ReturnType<typeof database>;
