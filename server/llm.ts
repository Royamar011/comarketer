// The writing model, behind one small interface so the provider can change without touching research logic.
// Default: Claude (ANTHROPIC_API_KEY). Any OpenAI-compatible endpoint also works for testing (LLM_BASE_URL + LLM_API_KEY).
import Anthropic from '@anthropic-ai/sdk';

export type WriteOptions={system:string;user:string;maxTokens:number;onText?:(textSoFar:string)=>void;onWait?:(seconds:number)=>void};
export type WriteResult={text:string;cutShort:boolean};
export type Writer={label:string;inputChars:number;maxOutput:number;write:(o:WriteOptions)=>Promise<WriteResult>};
type Env=Record<string,string|undefined>;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

function claude(env:Env):Writer{
 const client=new Anthropic({apiKey:env.ANTHROPIC_API_KEY}),model=env.LLM_MODEL||'claude-opus-5-5';
 return {label:model,inputChars:Number(env.LLM_INPUT_CHARS)||120_000,maxOutput:Number(env.LLM_MAX_OUTPUT)||16_000,
  async write({system,user,maxTokens,onText}){
   const stream=client.messages.stream({model,max_tokens:maxTokens,system,messages:[{role:'user',content:user}]});
   let text='';
   for await(const e of stream)if(e.type==='content_block_delta'&&e.delta.type==='text_delta'){text+=e.delta.text;onText?.(text);}
   const final=await stream.finalMessage();
   if(final.stop_reason==='refusal')throw new Error('The writing model declined this request.');
   return {text,cutShort:final.stop_reason==='max_tokens'};
  }};
}

// Standard /chat/completions streaming. Used for testing with whatever endpoint and model .env names.
function openAICompatible(env:Env):Writer{
 const base=(env.LLM_BASE_URL||'').replace(/\/$/,''),key=env.LLM_API_KEY||'',model=env.LLM_MODEL||'';
 return {label:model,inputChars:Number(env.LLM_INPUT_CHARS)||12_000,maxOutput:Number(env.LLM_MAX_OUTPUT)||4_000,
  async write({system,user,maxTokens,onText,onWait}){
   for(let attempt=0;attempt<4;attempt++){
    const r=await fetch(`${base}/chat/completions`,{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},
     body:JSON.stringify({model,stream:true,temperature:.2,max_tokens:maxTokens,messages:[{role:'system',content:system},{role:'user',content:user}]})});
    if(r.status===429){const body=await r.text();const wait=Number(r.headers.get('retry-after'));
     if(!wait||wait>120)throw new Error(`The writing model is rate limited. ${JSON.parse(body||'{}')?.error?.message?.slice(0,200)||''}`);
     onWait?.(wait);await sleep(wait*1000);continue;}
    if(!r.ok||!r.body)throw new Error(`The writing model returned ${r.status}. ${(await r.text()).slice(0,200)}`);
    let text='',buf='',finish='';const dec=new TextDecoder();
    for await(const chunk of r.body as unknown as AsyncIterable<Uint8Array>){buf+=dec.decode(chunk,{stream:true});const lines=buf.split('\n');buf=lines.pop()||'';
     for(const l of lines){if(!l.startsWith('data: ')||l.includes('[DONE]'))continue;try{const c=JSON.parse(l.slice(6)).choices?.[0];if(c?.delta?.content){text+=c.delta.content;onText?.(text);}if(c?.finish_reason)finish=c.finish_reason;}catch{}}}
    return {text,cutShort:finish==='length'};
   }
   throw new Error('The writing model is rate limited. Try again in a minute.');
  }};
}

export function makeWriter(env:Env):Writer|null{
 if(env.ANTHROPIC_API_KEY)return claude(env);
 if(env.LLM_BASE_URL&&env.LLM_API_KEY&&env.LLM_MODEL)return openAICompatible(env);
 return null;
}
