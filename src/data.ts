// Shared types and presets. Nothing here is about a specific company: company facts come from the brief (workspace.ts).
import {isThing,tc,year} from './sample';
import type {Post} from './post';

export type Voice='founder'|'team';
export const workflowSteps=['Plan','Research','Blog structure','Draft'];

// Preset blog types. The suggested one is picked from the keyword before any research runs.
export type BlogType='best-of-list'|'how-to-guide'|'comparison'|'alternatives'|'tips';
type Question={id:string;q:string;options:string[];answer:string};
export type BlogTypeInfo={id:BlogType;name:string;example:string;desc:string;questions:Question[]};
const verb=/^(increase|improve|reduce|get|make|build|write|create|run|manage|grow|choose|find|track|collect|set up|start|use|fix|boost|plan|launch|measure|automate|scale|hire|sell|price|test)\b/i;
export function blogTypesFor(keyword:string,name:string):BlogTypeInfo[]{
 const k=keyword.trim().toLowerCase()||'your topic',K=tc(k),thing=isThing(k),own={id:'own',q:`Include ${name} in the list?`,options:['Yes, listed first','Yes, ranked fairly','No'],answer:'Yes, listed first'};
 const plural=thing&&!/s$/.test(k)?`${K}s`:K;
 return [
  {id:'best-of-list',name:'Best-of list',example:thing?`9 Best ${plural} (${year})`:`9 Best Tools for ${K} (${year})`,desc:'Ranks the top tools for a need, with features, pros, cons and pricing.',questions:[{id:'count',q:'How many tools should the list cover?',options:['5','7','9','10'],answer:'9'},own]},
  {id:'how-to-guide',name:'How-to guide',example:thing?`How to Choose a ${K} (${year} Guide)`:verb.test(k)?`How to ${K} (${year} Guide)`:`${K}: The Complete Guide (${year})`,desc:'Walks the reader through a problem step by step, with examples and data.',questions:[{id:'depth',q:'How deep should it go?',options:['Standard (about 2,500 words)','In-depth (about 4,000 words)'],answer:'Standard (about 2,500 words)'},{id:'own',q:`Add a section on how ${name} helps?`,options:['Yes','No'],answer:'Yes'}]},
  {id:'comparison',name:'Comparison',example:`${name} vs [another ${thing?k:'tool'}]: Which Fits You?`,desc:'Puts two options side by side and says who each one suits.',questions:[{id:'pair',q:'What are we comparing?',options:[`${name} vs another tool`,'Two approaches, no brands'],answer:`${name} vs another tool`}]},
  {id:'alternatives',name:'Alternatives',example:`7 Best [tool] Alternatives (${year})`,desc:'For people leaving a tool or method, with better options.',questions:[{id:'count',q:'How many alternatives?',options:['5','7','9'],answer:'7'},own]},
  {id:'tips',name:'Tips',example:thing?`9 Tips to Get More From Your ${K}`:verb.test(k)?`9 Ways to ${K}`:`9 ${K} Tips That Work`,desc:'A list of specific, proven ways to reach a goal.',questions:[{id:'count',q:'How many tips?',options:['7','9','12'],answer:'9'},{id:'own',q:`Mention ${name} where it helps?`,options:['Yes','No'],answer:'Yes'}]},
 ];
}
// What already ranks for queries like this keyword: comparison, alternatives, tips and lists of tools are easy to spot; the rest are guides.
export const suggestType=(kw:string):BlogType=>{
 const k=kw.toLowerCase();
 if(/\b(vs|versus|compare|comparison)\b/.test(k))return 'comparison';
 if(/\b(alternatives?|instead of|replace|replacement)\b/.test(k))return 'alternatives';
 if(/\b(ways|tips|ideas|strategies|hacks)\b/.test(k))return 'tips';
 if(/\b(best|top)\b/.test(k)||isThing(k))return 'best-of-list';
 return 'how-to-guide';
};

export type Status='In progress'|'Ready'|'Scheduled'|'Published';
// Dates are ISO strings. `content` is the finished article, saved once the draft is written and every time it is edited.
// The content library list leaves it out; the article page loads it.
export type Article={id:string;title:string;keyword:string;status:Status;step?:number;waiting?:'you'|'us';next?:string;voice?:Voice;words?:number;quality?:number;sources?:number;images?:number;created:string;updated:string;scheduledFor?:string;publishedAt?:string;archivedAt?:string;slug?:string;cms?:string;externalId?:string;liveUrl?:string;editUrl?:string;plan?:ArticlePlan;content?:Post};
// Everything picked so far, so an article in progress opens exactly where it was left.
export type ArticlePlan={phase:string;btype?:BlogType;answers?:Record<string,string>;angle?:string|null;outline?:string;memory?:string[];reached?:number};

export function voicesFor(name:string){
 return {
  founder:{name:'The founder',who:'First person, opinionated, built on lived experience',byline:'By the founder',sample:'I used to think more content meant more customers. Then I looked at which posts actually brought people in: the ones that answered one question really well. That is the only kind we write now.',rules:['Speaks as “I”','Opens with a story or a strong take','Earns trust with lessons learned, backed by data']},
  team:{name:'The team',who:'Expert, practical, built on what you see across customers',byline:`By the ${name} team`,sample:'Most guides on this topic list ideas and stop there. Here is the step-by-step approach we use with customers, with the numbers we look at along the way.',rules:['Speaks as “we”','Leads with frameworks, steps and checklists','Earns trust with patterns seen across customers']},
 };
}
export const voiceKeys:Voice[]=['founder','team'];
