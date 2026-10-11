// Blog platform connections, per company. Keys stay on this server in .secrets/ (gitignored, readable only by you).
import fs from 'node:fs/promises';
import path from 'node:path';

export type Platform='wordpress'|'webflow'|'hubspot'|'ghost';
export const platformNames:Record<Platform,string>={wordpress:'WordPress',webflow:'Webflow',hubspot:'HubSpot',ghost:'Ghost'};
export type Connection={platform:Platform;creds:Record<string,string>;settings:Record<string,any>;label:string;connectedAt:string};
const FILE=path.resolve('.secrets/connections.json');

async function readAll():Promise<Record<string,Partial<Record<Platform,Connection>>>>{
 try{return JSON.parse(await fs.readFile(FILE,'utf8'));}catch{return {};}
}
async function writeAll(d:object){
 await fs.mkdir(path.dirname(FILE),{recursive:true,mode:0o700});
 await fs.writeFile(FILE,JSON.stringify(d,null,1),{mode:0o600});
}
const key=(domain:string)=>domain.trim().toLowerCase()||'_';

export async function getConnection(domain:string,platform:Platform){return (await readAll())[key(domain)]?.[platform]||null;}
export async function saveConnection(domain:string,c:Connection){const all=await readAll();all[key(domain)]={...all[key(domain)],[c.platform]:c};await writeAll(all);}
export async function removeConnection(domain:string,platform:Platform){const all=await readAll();if(all[key(domain)])delete all[key(domain)]![platform];await writeAll(all);}
// What the browser may see: never the keys.
export async function listConnections(domain:string){
 return Object.values((await readAll())[key(domain)]||{}).map(c=>({platform:c!.platform,label:c!.label,settings:c!.settings,connectedAt:c!.connectedAt}));
}
