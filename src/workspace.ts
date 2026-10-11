import {useSyncExternalStore} from 'react';
import type {Article} from './data';

// The current company: its brief (context.md), what research saved, and its articles. Empty until a website is researched.
export type Workspace={domain:string;name:string;logo:string;md:string;saved:number;groups:{group:string;count:number;pages:string[]}[];articles:Article[]};
const empty:Workspace={domain:'',name:'Your company',logo:'',md:'',saved:0,groups:[],articles:[]};
const KEY='comarketer.workspace.v2';
// Earlier versions stored a researched company under the old key; keep it, but never the old sample.
let current:Workspace=(()=>{try{const raw=localStorage.getItem(KEY);if(raw)return {...empty,...JSON.parse(raw)};
 const old=JSON.parse(localStorage.getItem('comarketer.workspace')||'null');if(old&&!old.sample)return {...empty,domain:old.domain,name:old.name,logo:old.logo,md:old.md,saved:old.saved,groups:old.groups};return empty;}catch{return empty;}})();
const subs=new Set<()=>void>();
export function setWorkspace(w:Partial<Workspace>){current={...current,...w};try{localStorage.setItem(KEY,JSON.stringify(current));}catch{}subs.forEach(f=>f());}
export function useWorkspace(){return useSyncExternalStore(f=>{subs.add(f);return()=>subs.delete(f);},()=>current);}
export const getWorkspace=()=>current;
export function saveArticle(a:Partial<Article>&{id:string}){
 const list=current.articles,i=list.findIndex(x=>x.id===a.id),now='just now';
 const next=i<0?[{title:a.keyword||'Untitled',keyword:'',status:'In progress',created:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'}),updated:now,...a} as Article,...list]:list.map(x=>x.id===a.id?{...x,...a,updated:now}:x);
 setWorkspace({articles:next});
}
