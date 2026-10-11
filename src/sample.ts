import type {Block,Post,PostImage} from './post';
// Preview content for the article steps, built from the keyword and the company in the brief.
// Search is not connected yet, so competitor pages use .example domains and every finding is marked as a sample.
export const year=new Date().getFullYear();
export const tc=(s:string)=>s.replace(/(^|\s|-)(\w)/g,(m,a,c)=>a+c.toUpperCase());
const plural=(s:string)=>/s$/.test(s)?s:/[^aeiou]y$/.test(s)?s.slice(0,-1)+'ies':s+'s';
// A keyword that names a kind of product ("website feedback tool") rather than a task ("increase signups").
export const isThing=(k:string)=>/\b(tools?|software|apps?|platforms?|systems?|solutions?|services?|trackers?|builders?|generators?|plugins?|crms?|apis?|extensions?|widgets?)$/i.test(k.trim());
const verbs=/^(increase|improve|reduce|get|make|build|write|create|run|manage|grow|choose|find|track|collect|set up|start|use|fix|boost|plan|launch|measure|automate|scale|hire|sell|price|test)\b/i;
export const slugify=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);

export function makeSample(keyword:string,name:string,domain:string){
 const k=keyword.trim().toLowerCase()||'your topic',K=tc(k),thing=isThing(k),task=verbs.test(k);
 const serp=[
  {pos:1,title:`${K}: The Complete Guide (${year})`,domain:'guidehub.example',type:'Guide',covers:['The basics','A short checklist'],why:['Exact match for the search','Updated this year'],misses:['Real examples','Numbers to aim for']},
  {pos:2,title:`7 ${K} Mistakes to Avoid`,domain:'teamblog.example',type:'Listicle',covers:['Common mistakes','Quick fixes'],why:['Answers what people ask','Easy to scan'],misses:['What to do instead, step by step']},
  {pos:3,title:`${K} Best Practices`,domain:'industryjournal.example',type:'Guide',covers:['Best practices','Expert quotes'],why:['Strong site authority','Covers many related questions'],misses:['Advice by company size','How to measure results']},
  {pos:4,title:`What Is ${K}? A Simple Explanation`,domain:'learnbase.example',type:'Explainer',covers:['A simple definition','Why it matters'],why:['Clear answer at the top'],misses:['Anything beyond the definition']},
  {pos:5,title:thing?`Best ${tc(plural(k))} in ${year}`:`Best Tools for ${K} in ${year}`,domain:'reviewsite.example',type:'Listicle',covers:['Tool list','Pricing tiers'],why:['Ranks for tool searches too','Comparison table'],misses:['Any advice beyond buying a tool']},
 ];
 const angles=[
  {id:'playbook',type:'Step-by-step with examples',title:thing?`Choosing a ${k}, step by step, with real examples`:`${K}, step by step, with real examples`,gap:'Adds a worked example and numbers to aim for. No top result shows what good looks like.',why:'The top results list advice but never show it applied.',recommended:true,covered:0},
  {id:'teardown',type:'Tested side by side',title:`${K}: five approaches, tested side by side`,gap:'Compares the common approaches with honest trade-offs.',why:'Practical and opinionated. Works well in the founder voice.',recommended:false,covered:1},
  {id:'segment',type:'For small teams',title:`${K} for small teams with little time`,gap:'The question no top result answers: what to do with a small team.',why:'Speaks directly to readers like your customers.',recommended:false,covered:0},
 ];
 const titles=(a:typeof angles[number])=>[
  {style:'How-to',text:thing?`How to choose a ${k}: a ${year} guide`:task?`How to ${k}: a step-by-step playbook (${year})`:`${K}: a step-by-step playbook (${year})`,recommended:true},
  {style:'Number',text:thing?`9 things to check before you pick a ${k}`:`${K} in 9 steps, with examples`},
  {style:'Question',text:thing?`Which ${k} is right for your team?`:`What does good ${k} look like?`},
  {style:'Contrarian',text:thing?`The feature list is not why teams pick a ${k}`:`Most ${k} advice skips the hard part. Here it is`},
  {style:'Outcome',text:thing?`Pick the right ${k} in one week`:a.id==='segment'?`${K} for small teams, done in a week`:`${K} that moves the numbers`},
 ];
 const quotes={
  stat:`Teams that review their ${k} results every month improve them faster than teams that check once a year.`,
  definition:`A plain definition of ${k}, in one or two sentences, quoted from the page that explains it best.`,
  example:thing?`A five-person team tested three options on one real project for a week, then picked the one everyone kept using.`:`A five-person team applied ${k} in one week, measured the result, and kept only what worked.`,
  mistake:thing?'Choosing on the longest feature list instead of what the team will use.':'Starting with tools before agreeing what success looks like.',
 };
 const sourceText:Record<string,{title:string;url:string;fetched:string;text:string}>={
  'industryjournal.example':{title:serp[2].title,url:`https://industryjournal.example/${slugify(k)}-best-practices`,fetched:'Today, 10:12',text:`Most teams treat ${k} as a one-off project. ${quotes.stat} The difference is a simple routine: one owner, one number to watch, and a short review on the calendar.`},
  'learnbase.example':{title:serp[3].title,url:`https://learnbase.example/what-is-${slugify(k)}`,fetched:'Today, 10:13',text:`${quotes.definition} The rest of this page covers why it matters and where to start.`},
  'teamblog.example':{title:serp[1].title,url:`https://teamblog.example/${slugify(k)}-mistakes`,fetched:'Today, 10:11',text:`The most common mistake: ${quotes.mistake} Here is what worked for us instead. ${quotes.example}`},
 };
 const research=[
  {kind:'Stat',text:quotes.stat,source:'industryjournal.example',note:'Sample. Real research cites the exact figure and date.'},
  {kind:'Definition',text:quotes.definition,source:'learnbase.example',note:'Sample.'},
  {kind:'Question people ask',text:`How do I get started with ${k}?`,source:'Related searches'},
  {kind:'Example',text:quotes.example,source:'teamblog.example',note:'Sample.'},
  {kind:`About ${name}`,text:`Where ${name} helps with ${k}, taken from your company brief.`,source:domain||'Your company brief'},
  {kind:'Mistake',text:quotes.mistake,source:'teamblog.example'},
 ];
 const steps=thing?[`What a good ${k} should do`,'Step 1: List what your team needs','Step 2: Shortlist three options','Step 3: Test with a real project','Step 4: Roll it out to the team','A worked example','FAQ']:['Why this is harder than it looks','Step 1: Agree what good looks like','Step 2: Start small','Step 3: Measure it','Step 4: Make it a habit','A worked example','FAQ'];
 const outlines=[
  {id:'framework',name:'Step by step',why:'Best for “how to” searches. Easy to scan and quote.',recommended:true,words:'2,100',sections:steps},
  {id:'problem',name:'Story first',why:'Opens with what it costs to get this wrong. Strong in the founder voice.',recommended:false,words:'1,800',sections:['The cost of getting it wrong',`What changes when ${k} works`,'How to roll it out','A worked example','FAQ']},
  {id:'faq',name:'Questions and answers',why:'Each heading is a real question. Strong for AI answers.',recommended:false,words:'1,900',sections:[`What is ${k}?`,`Why does ${k} matter?`,`What does good ${k} look like?`,`How do you measure ${k}?`,'Which tools can help?']},
 ];
 const answer=thing?`The best ${k} is the one your team will use every day. List what you need, shortlist three options, test each with a real project, then roll out the winner. This guide walks through each step with a worked example.`:`${K} works when you agree what good looks like, start small, measure one number, and review it on a schedule. This guide walks through each step with a worked example, so you can apply it this week.`;
 const articleSections=[
  thing?{h:steps[0],p:`Most lists of ${k} options compare features. What matters more is whether your team will actually use it every day.`,list:['It fits how your team already works','It connects to the tools you use','People can learn it in an afternoon']}
   :{h:steps[0],p:`Most advice on ${k} lists ideas and stops there. The hard part is choosing where to start and knowing whether it worked.`,list:['No agreed goal','Too many changes at once','Nobody owns the result']},
  thing?{h:steps[1],p:'Write down the three jobs it must do and the tools it must work with. Anything else is a nice-to-have.'}:{h:steps[1],p:'Write down the one result you want and how you will measure it. Keep it to a single sentence everyone on the team can repeat.'},
  thing?{h:steps[2],p:'Pick three options that do all three jobs. More than three makes the decision slower, not better.'}:{h:steps[2],p:'Pick one change you can ship this week. Small changes are easier to measure and easier to undo.'},
  {h:steps[3],p:thing?'Run each option on the same real project for a week, and score it the same way.':'Track one number before and after. Compare like for like, over the same length of time.',table:thing?[['What to score','Option A','Option B'],['Does the three jobs','Yes or no','Yes or no'],['Time to set up','Minutes','Minutes'],['Team verdict','1 to 5','1 to 5']]:[['What to track','Before','After'],['Main result','Baseline','Week 4'],['Effort','Hours per week','Hours per week'],['Owner','Named person','Named person']]},
 ];
 return {
  k,K,
  relatedKeywords:[`${k} guide`,`${k} examples`,`${k} checklist`,`${k} for small teams`,`${k} mistakes`,`${k} best practices`],
  serp,angles,titles,sourceText,research,outlines,articleSections,
  patterns:{sections:['A simple definition','Common mistakes','A short checklist','A list of tools'],length:'2,000 words on average',formats:['Numbered steps','A checklist','A short FAQ']},
  gaps:[`No top result walks through ${k} with a real example from start to finish.`,'None give numbers to aim for or a way to measure results.','Nobody explains what changes for small teams versus larger ones.'],
  scanSteps:['Related keywords','Top results on Google','Why they rank','What they missed',`Where ${name} fits`],
  researchSteps:['Stats with sources','Simple definitions','Questions people ask','Real examples',`Where ${name} helps`],
  writeParts:['Opening answer',...steps.slice(0,4).map(s=>s.replace(/^Step \d: /,'')),'FAQ and schema','Images and alt text','Quality pass'],
  draftStream:[{h:'',p:answer},...articleSections.slice(0,3).map(s=>({h:s.h,p:s.p}))],
  images:[
   {name:'cover',kind:'cover',heading:'',alt:`Cover image with the title of the article on a blue background`,place:'Featured image'},
   {name:'checklist',kind:'checklist',heading:thing?`What a good ${k} should do`:`${K}: what good looks like`,items:articleSections[0].list||[],alt:thing?`Checklist titled “What a good ${k} should do” with ${(articleSections[0].list||[]).length} items ticked`:`Checklist titled “${K}: what good looks like” with ${(articleSections[0].list||[]).length} items ticked`,place:`After “${steps[0]}”`},
   {name:'steps',kind:'steps',heading:'Four steps, in order',items:steps.slice(1,5).map(x=>x.replace(/^Step \d: /,'')),alt:`Diagram of four numbered steps: ${steps.slice(1,5).map(x=>x.replace(/^Step \d: /,'')).join(', ')}`,place:`After “${steps[2]}”`},
   {name:'scorecard',kind:'table',heading:thing?'How to score each option':'What to track',rows:articleSections[3].table,alt:thing?'Table showing how to score each option: does the three jobs, time to set up, team verdict':'Table showing what to track before and after: main result, effort and owner',place:`After “${steps[3]}”`},
  ] as (PostImage&{place:string})[],
  questions:[`What is ${k}?`,`How long does ${k} take?`,`Which tools help with ${k}?`],
  faqAnswer:(q:string)=>/how long/i.test(q)?'Most teams see a first result within four weeks if they start small and measure one number. Plan a short review every week, then decide what to keep.':/tools/i.test(q)?`The right tool is the one your team will use every day. List the three jobs it must do, shortlist three options, and test each one on a real project before you decide.`:`${K} is ${thing?'a type of tool':'the work'} this guide covers step by step. The short version: agree what good looks like, start small, and measure one number.`,
  quality:[{label:'Each section starts with the answer'},{label:'Every stat has a source'},{label:'FAQ with schema'},{label:`Internal links to ${name} pages`},{label:'Alt text on all images'},{label:'Different from the top 10 results'}],
  meta:thing?`How to choose a ${k}: list what you need, shortlist three options, test them on a real project and roll out the winner.`:`${K}, step by step: agree what good looks like, start small, measure one number and review it on a schedule. With a worked example.`,
  answer,
 };
}
export type Sample=ReturnType<typeof makeSample>;

// The preview article as a Post, the single format every view, copy, export and publisher renders from.
export function samplePost(S:Sample,o:{title:string;byline:string;author:{name:string;type:'Person'|'Organization'};company:{name:string;url:string;logo:string}}):Post{
 const blocks:Block[]=[{t:'p',text:S.answer}];
 S.articleSections.forEach((sec,i)=>{
  blocks.push({t:'h2',text:sec.h},{t:'p',text:sec.p});
  if(sec.list)blocks.push({t:'ul',items:sec.list});
  if(sec.table)blocks.push({t:'table',rows:sec.table});
  const at=S.images.findIndex(im=>im.place===`After “${sec.h}”`);if(at>0)blocks.push({t:'image',img:at});
 });
 return {title:o.title,slug:slugify(o.title),metaTitle:o.title.length>60?o.title.slice(0,57).trimEnd()+'…':o.title,metaDescription:S.meta,excerpt:S.answer.split('. ')[0]+'.',keyword:S.k,
  byline:o.byline,author:o.author,company:o.company,datePublished:new Date().toISOString().slice(0,10),blocks,
  faq:S.questions.map(q=>({q,a:S.faqAnswer(q)})),images:S.images.map(im=>({...im,heading:im.kind==='cover'?o.title:im.heading})),featured:0};
}
