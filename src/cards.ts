// Article images, drawn as 1600×900 PNGs in the browser. Each one shows exactly what its alt text says.
// When an image model is connected, its pictures replace these; the alt text and placement stay the same.
import type {PostImage} from './post';

const W=1600,H=900;
const c={ivory:'#FFFCF7',ink:'#202018',muted:'#626158',blue:'#2459E0',blueDeep:'#1844B5',blueSoft:'#EEF3FF',line:'#E4E2DA',green:'#1F7A4D',butter:'#F3EF9C'};
const font=(w:number,size:number)=>`${w} ${size}px "DM Sans", "Geist", system-ui, sans-serif`;

function wrap(ctx:CanvasRenderingContext2D,text:string,max:number){
 const words=text.split(/\s+/),lines:string[]=[];let line='';
 for(const w of words){const t=line?line+' '+w:w;if(ctx.measureText(t).width>max&&line){lines.push(line);line=w;}else line=t;}
 if(line)lines.push(line);return lines;
}
function round(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function footer(ctx:CanvasRenderingContext2D,brand:string,light=false){
 ctx.font=font(600,26);ctx.fillStyle=light?'rgba(255,255,255,.85)':c.muted;ctx.textBaseline='alphabetic';ctx.fillText(brand,80,H-64);
}

function cover(ctx:CanvasRenderingContext2D,im:PostImage,brand:string,keyword:string){
 const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,c.blue);g.addColorStop(1,c.blueDeep);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=2;for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
 ctx.fillStyle='#fff';ctx.font=font(700,84);const lines=wrap(ctx,im.heading,1300).slice(0,4);
 const top=(H-lines.length*100)/2-20;lines.forEach((l,i)=>ctx.fillText(l,80,top+i*100+80));
 if(keyword){ctx.font=font(500,28);const w=ctx.measureText(keyword).width+48;round(ctx,80,top+lines.length*100+60,w,56,14);ctx.fillStyle='rgba(255,255,255,.16)';ctx.fill();ctx.fillStyle='#fff';ctx.fillText(keyword,104,top+lines.length*100+98);}
 footer(ctx,brand,true);
}
function heading(ctx:CanvasRenderingContext2D,text:string){ctx.fillStyle=c.ink;ctx.font=font(700,58);wrap(ctx,text,W-160).slice(0,2).forEach((l,i)=>ctx.fillText(l,80,150+i*70));}
function checklist(ctx:CanvasRenderingContext2D,im:PostImage,brand:string){
 ctx.fillStyle=c.ivory;ctx.fillRect(0,0,W,H);heading(ctx,im.heading);
 (im.items||[]).slice(0,5).forEach((item,i)=>{const y=290+i*120;
  round(ctx,80,y-58,W-160,96,20);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle=c.line;ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.arc(140,y-10,24,0,Math.PI*2);ctx.fillStyle=c.green;ctx.fill();
  ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(129,y-10);ctx.lineTo(137,y-2);ctx.lineTo(152,y-19);ctx.stroke();
  ctx.fillStyle=c.ink;ctx.font=font(500,38);ctx.fillText(wrap(ctx,item,W-340)[0],190,y+2);});
 footer(ctx,brand);
}
function steps(ctx:CanvasRenderingContext2D,im:PostImage,brand:string){
 ctx.fillStyle=c.ivory;ctx.fillRect(0,0,W,H);heading(ctx,im.heading);
 const items=(im.items||[]).slice(0,4),gap=(W-160)/items.length,y=430;
 ctx.strokeStyle=c.blue;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(80+gap/2,y);ctx.lineTo(80+gap*(items.length-.5),y);ctx.stroke();
 items.forEach((t,i)=>{const x=80+gap*(i+.5);
  ctx.beginPath();ctx.arc(x,y,54,0,Math.PI*2);ctx.fillStyle=c.blue;ctx.fill();ctx.fillStyle='#fff';ctx.font=font(700,48);ctx.textAlign='center';ctx.fillText(String(i+1),x,y+17);
  ctx.fillStyle=c.ink;ctx.font=font(600,34);wrap(ctx,t,gap-40).slice(0,3).forEach((l,j)=>ctx.fillText(l,x,y+130+j*44));ctx.textAlign='left';});
 footer(ctx,brand);
}
function table(ctx:CanvasRenderingContext2D,im:PostImage,brand:string){
 ctx.fillStyle=c.ivory;ctx.fillRect(0,0,W,H);heading(ctx,im.heading);
 const rows=(im.rows||[]).slice(0,5),cols=rows[0]?.length||1,x0=80,y0=240,w=W-160,rh=104,cw=w/cols;
 round(ctx,x0,y0,w,rh*rows.length,22);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle=c.line;ctx.lineWidth=2;ctx.stroke();
 ctx.save();round(ctx,x0,y0,w,rh,22);ctx.clip();ctx.fillStyle=c.blueSoft;ctx.fillRect(x0,y0,w,rh);ctx.restore();
 rows.forEach((r,i)=>{if(i>0){ctx.strokeStyle=c.line;ctx.beginPath();ctx.moveTo(x0,y0+rh*i);ctx.lineTo(x0+w,y0+rh*i);ctx.stroke();}
  r.forEach((cell,j)=>{ctx.fillStyle=i===0?c.blueDeep:j===0?c.ink:c.muted;ctx.font=font(i===0||j===0?650:500,34);ctx.fillText(wrap(ctx,cell||'—',cw-48)[0],x0+cw*j+28,y0+rh*i+64);});});
 footer(ctx,brand);
}

export async function renderCard(im:PostImage,brand:string,keyword:string):Promise<string>{
 await document.fonts?.ready.catch(()=>{});
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d')!;
 ({cover:()=>cover(ctx,im,brand,keyword),checklist:()=>checklist(ctx,im,brand),steps:()=>steps(ctx,im,brand),table:()=>table(ctx,im,brand)})[im.kind]();
 // The cover is a photo-like gradient, so JPEG keeps it small; diagrams stay PNG for crisp text.
 return im.kind==='cover'?canvas.toDataURL('image/jpeg',.9):canvas.toDataURL('image/png');
}
export const extOf=(dataUrl:string)=>dataUrl.startsWith('data:image/jpeg')?'jpg':'png';
export const dataToBytes=(dataUrl:string)=>Uint8Array.from(atob(dataUrl.split(',')[1]),ch=>ch.charCodeAt(0));
