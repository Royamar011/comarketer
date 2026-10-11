// Small helpers shared by the API routes.
import type {IncomingMessage} from 'node:http';

export async function body(req:IncomingMessage):Promise<any>{
 let size=0;const chunks:Buffer[]=[];
 for await(const c of req){size+=c.length;if(size>30_000_000)throw new Error('Request too large.');chunks.push(c as Buffer);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw Object.assign(new Error('The request was not valid JSON.'),{status:400});}
}
export const json=(res:any,status:number,data:unknown)=>{res.statusCode=status;res.setHeader('content-type','application/json');res.end(JSON.stringify(data));};
export const query=(req:IncomingMessage)=>new URL(req.url||'','http://local').searchParams;
