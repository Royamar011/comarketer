// context.md is the brief itself. The app renders it; nothing is filtered out of it.
export type Block={t:'h3'|'p'|'quote';text:string}|{t:'ul'|'ol';items:string[]}|{t:'table';rows:string[][]};
export type Section={id:string;title:string;blocks:Block[]};

const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const cells=(l:string)=>l.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());

export function parse(src:string):Section[]{
 const out:Section[]=[];let cur:Section|null=null;
 const lines=src.split('\n');
 for(let i=0;i<lines.length;i++){
  const l=lines[i];
  if(l.startsWith('## ')){cur={id:slug(l.slice(3)),title:l.slice(3).trim(),blocks:[]};out.push(cur);continue;}
  if(!cur||!l.trim()||l.startsWith('# '))continue;
  const add=(b:Block)=>cur!.blocks.push(b);
  if(l.startsWith('### '))add({t:'h3',text:l.slice(4)});
  else if(l.startsWith('> '))add({t:'quote',text:l.slice(2)});
  else if(l.startsWith('|')){const rows:string[][]=[];while(i<lines.length&&lines[i].startsWith('|')){if(!/^\|[\s|:]*-[\s|:-]*\|$/.test(lines[i].trim()))rows.push(cells(lines[i]));i++;}i--;add({t:'table',rows});}
  else if(/^- /.test(l)){const items:string[]=[];while(i<lines.length&&/^- /.test(lines[i])){items.push(lines[i].slice(2));i++;}i--;add({t:'ul',items});}
  else if(/^\d+\. /.test(l)){const items:string[]=[];while(i<lines.length&&/^\d+\. /.test(lines[i])){items.push(lines[i].replace(/^\d+\. /,''));i++;}i--;add({t:'ol',items});}
  else add({t:'p',text:l});
 }
 return out;
}
// Plain first line of a section, for the brief that writes itself during setup.
export const firstLine=(s:Section)=>{const b=s.blocks.find(b=>b.t==='p'||b.t==='ul'||b.t==='table');if(!b)return '';const t=b.t==='p'?b.text:b.t==='ul'?b.items.slice(0,3).join(' · '):b.t==='table'?b.rows.slice(1,4).map(r=>r.filter(Boolean).join(': ')).join(' · '):'';return t.replace(/\*\*/g,'');};
