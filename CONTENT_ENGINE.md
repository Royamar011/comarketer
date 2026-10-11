# Content engine: from the Dyrect skill to a product that works for any SaaS website

Based on `dyrect-content-writer.skill` (SKILL.md and references/brand-reference.md).

## 1. What the skill does today

| Phase | What happens | User decides |
|---|---|---|
| 1. Briefing | 10 questions (topic, content type, own blog or guest post, keyword, list size, tools to include, word count, FAQ, year, stats to highlight), then a keyword cluster: variations, semantic keywords, question keywords | Answers, then confirms the cluster |
| 2. Outlines | Search-intent thinking first (what problem, what stage, what they already know), then 3 genuinely different outlines with 3 to 4 titles each. Strict heading and title rules | Picks or mixes an outline and title |
| 3. Research | Deep research shared in chat: how the topic works, every tool from its real site, ranking content and gaps, real customer language, stats | Confirms "write it" |
| 4. Article | Full article with SEO placement rules, intro formula, style rules, format variety, listicle entry template, how to promote without bragging, FAQ, CTA, then meta, slug, image alts and an SEO checklist | Reviews |

Why it works without hallucination in Claude chat: every earlier phase stays in the conversation, so the writer can only lean on things it has already seen (brand doc + research it wrote out).

## 2. How this works through the API

The API has no memory. A "chat" is just a list of messages we store and send again on every call. So the behaviour is the same as the chat, with three changes that make it better for a product:

**a. Steps, not one long chat.** Each step is its own call. Instead of re-sending the whole transcript (which grows to hundreds of thousands of tokens once web research is included), we send a stable base plus the distilled results of earlier steps:

```
[cached] System: content engine rules            (same for every company)
[cached] context.md for this company              (same for every blog of this company)
[cached] Voice profile: founder or team + house rules
[cached] Content-type playbook: listicle / how-to / comparison / ways-to
[per article] Brief (JSON)        <- produced in Plan, confirmed by user
[per article] Research notes (JSON, every item with source URL and exact quote)
[per article] Chosen blog structure (JSON)
[this call]  Instruction for the current step + required output format
```

The writer still has complete context, exactly as in chat, but only of the facts that matter. It is cheaper (cached base) and faster.

**b. What the model returns is not what the user sees.** Every step returns structured data (JSON schema). The UI renders it:

| Step | Model returns | User sees |
|---|---|---|
| Plan | suggested blog type with prefilled questions; then keyword cluster, intent, top results with what they cover, why they rank and what they miss; then 3 ideas with 5 titles each | Blog type cards, a short confirm screen, result cards, gap list, idea cards, title list |
| Research | list of findings `{type, text, source_url, quote}` | Research notebook cards with sources |
| Blog structure | 3 outlines `{h1, intro_plan, sections:[{h2, h3s, purpose, uses:[finding ids]}]}` | H2/H3 tree per option, with which facts go where |
| Draft | article as structured HTML (h1, h2, h3, p, ul, ol, table, blockquote, figure, FAQ) + meta, slug, alt texts, image prompts, checklist | Formatted article in the canvas; SEO, images and checks in the side panel |

The full transcript (including raw search results) is stored for audit and for "why did it write this", but never shown.

**c. Research is stored in full.** Every page read is saved as complete text in the article's research store. Each finding keeps an exact quote that must match the stored page word for word. The draft call receives the findings plus the full text of the sources they come from, and cites finding ids on every factual sentence. Nothing the writer uses exists only in its memory.

**d. Facts are checked, not trusted.** After the draft, a check pass compares every number and claim against research notes and context.md. Anything without a source is flagged for the user or removed. This is the product version of "research confirmed before writing".

## 3. context.md: the company brief

### Sections (generalised from brand-reference.md)

1. Quick reference: name, legal names, website, category, one-line positioning, ratings (with source), customer count, offices, contact
2. Links in articles: each page with when to link it (product pages, pricing, integrations, case studies, free tools, best blog posts)
3. Core idea: the problem, who has it, how the product solves it, signature analogy if any
4. Products: one block per product with what it does, who it is for, capabilities, key numbers
5. Full feature list grouped by product
6. Pain points by persona
7. Buyer personas (ICPs): role, goal, what they search for
8. Target industries and segments, with links
9. Geographies served
10. Integrations by category
11. Metrics and proof: numbers, testimonials with names and titles, notable clients
12. Alternatives and competitors: named tools and the status quo (spreadsheets, forms), how we position against each, who never to mention
13. Positioning keywords: the exact phrases the company uses about itself, grouped as category, product, problem and outcome, with page counts
13b. The company's blog: type mix, pace, topics and searches already covered, house style, gaps
14. Content assets and free tools
15. How the platform fits together (flow)
16. (Moved out of context.md) What not to get wrong lives in the house rules in Voices
17. Blog defaults: own product placement in listicles, year in titles, CTA link, internal links to prioritise

### How it is built when a user adds their website

Full instructions: `prompts/context/build-context.md`. Everything read is stored in full in the company research store (often 100 to 300 pages); the brief is a short summary that points back to it.

```
1. Crawl     sitemap + homepage links: product, feature, solution, industry, pricing,
             integration, customer, case study, comparison, about, free tool, docs pages
2. External  web search for: review sites (G2, Capterra), app store listings,
             competitors and alternatives, press, founder or company profiles
3. Extract   section by section, every fact keeps its source URL and quote
4. Infer     the AI reasons about ICPs, pain points per persona, positioning
             guardrails and alternatives. These are marked "inferred", never mixed with facts
5. Confirm   user reviews section by section. Only a few direct questions,
             only for things a website cannot tell us (see below)
6. Publish   context.md v1, versioned. Every blog reads it. Refresh re-runs steps 1 to 5 and shows changes
```

Questions only the company can answer (asked as quick choices, prefilled with our best guess):
- Which competitors should never be mentioned or linked?
- Should your product be listed first in "best tools" articles on your own blog?
- Main call to action link (demo, trial, contact)?
- Anything we must never claim or get wrong?

## 4. Will the skill structure work for every website?

Yes, the method generalises. The phases, intent thinking, heading rules, depth standard, format variety, FAQ rules and SEO placement rules are universal. What must change:

1. **Split company facts out of the engine.** Internal links, "Dyrect is not India-only", the Apple analogy, G2 and Shopify ratings, "Dyrect is #1" all move into context.md. The engine never names a company.
2. **Replace the 10 briefing questions with inferred defaults.** Content type from the keyword ("best X" means listicle, "how to" means guide, "X vs Y" means comparison). Word count from the length of the top results. FAQ on, year on, own blog. Tools to include proposed from research, user can untick. This matches the product rule: as few questions as possible.
3. **Blog type first, then research, then structure.** Plan starts with a preset blog type (Best-of list, How-to guide, Comparison, Alternatives, Tips), suggested from the keyword and confirmed by the user, together with type-specific answers such as the number of tools. Only then does the first research pass run: a competitor scan of the top results (what they cover, why they rank, what they miss). Deep research follows, and blog structures are built last, from real findings.
4. **Voice overrides style.** The skill says "second person throughout". The founder voice speaks as "I". Voice rules must sit above general style rules.
5. **Content-type playbooks become modules.** Listicle, how-to, comparison, ways-to, alternatives. Each with its own outline template and entry template. Only the chosen one is loaded.
6. **Promotion policy becomes a setting.** "Promote without bragging" stays universal. "Our product is #1" is a per-company choice.
7. **Images.** `[IMAGE]` placeholders become image briefs (what to show, alt text, placement) for the image model.
8. **Fresh competitor data every time.** Pricing and features of other tools are fetched for each article, never taken from context.md or memory.

## 5. Prompt layers in practice

- **Engine rules** (one prompt, all companies): role, the no-invention rule ("use only facts from the company brief or research notes; if something is missing, say so"), SEO rules, heading rules, intro formula, depth standard, format variety, FAQ rules, banned phrases.
- **Playbook** (one per content type): outline templates, entry templates, comparison table rules.
- **Voice profile** (founder or team, plus the company's house rules).
- **context.md** (per company).
- **Step instruction** (per call): what to produce now, the output schema, and the user's choices so far.

Each layer is written once and tested on several very different SaaS websites before launch, not tuned only on Dyrect.


The actual instruction files live in `prompts/` (engine, blog types, voices, steps, context template). See `prompts/README.md` for how they assemble.
