// A small ZIP writer (stored, no compression). PNGs are already compressed, so nothing is lost.
const table=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=(d:Uint8Array)=>{let c=0xFFFFFFFF;for(let i=0;i<d.length;i++)c=table[(c^d[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
export function makeZip(files:{name:string;data:Uint8Array|string}[]):Blob{
 const enc=new TextEncoder(),parts:BlobPart[]=[],central:Uint8Array[]=[];let offset=0;
 for(const f of files){
  const name=enc.encode(f.name),data=typeof f.data==='string'?enc.encode(f.data):f.data,crc=crc32(data);
  const head=new DataView(new ArrayBuffer(30));head.setUint32(0,0x04034b50,true);head.setUint16(4,20,true);head.setUint16(6,0x0800,true);head.setUint32(14,crc,true);head.setUint32(18,data.length,true);head.setUint32(22,data.length,true);head.setUint16(26,name.length,true);
  parts.push(head.buffer,name as Uint8Array<ArrayBuffer>,data as Uint8Array<ArrayBuffer>);
  const cd=new DataView(new ArrayBuffer(46));cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);cd.setUint16(6,20,true);cd.setUint16(8,0x0800,true);cd.setUint32(16,crc,true);cd.setUint32(20,data.length,true);cd.setUint32(24,data.length,true);cd.setUint16(28,name.length,true);cd.setUint32(42,offset,true);
  central.push(new Uint8Array(cd.buffer),name);offset+=30+name.length+data.length;
 }
 const size=central.reduce((n,x)=>n+x.length,0),end=new DataView(new ArrayBuffer(22));
 end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,size,true);end.setUint32(16,offset,true);
 return new Blob([...parts,...(central as Uint8Array<ArrayBuffer>[]),end.buffer],{type:'application/zip'});
}
