# Comarketer: blog automation for SaaS companies

Comarketer is **content + marketer**: a marketing teammate that researches, plans and writes publish-ready blog articles for a SaaS company. The first product is blog automation. AI visibility tracking is hidden for now and returns later as a measurement layer on top of the content.

## 1. Positioning

| | |
|---|---|
| Who it is for | SaaS founders and small marketing teams who need consistent, high-quality blog content without an agency. |
| Promise | Type a keyword. Get a researched, differentiated, publish-ready article with images and alt text, in your company's voice. |
| Why it wins | Every article starts from research (what already ranks, what it misses) and from the company's own facts. Output is unique, accurate, and structured so AI answer engines can extract and cite it (GEO). |
| Not this | A prompt box that returns generic AI text. |

Brand moment: the wordmark is presented as **Content + Marketer → Comarketer**. The two words slide together on first launch and on the onboarding screen, and "ntent" folds away so "Co" meets "marketer". It plays once.

## 2. Principles for the experience

1. **One decision per screen.** The user picks from strong options; Comarketer does the thinking. A school student should finish an article without reading help docs.
2. **Show the work.** Research is visible as it happens (real progress, real sources), so users trust the choices they are offered.
3. **Recommend, never force.** Every choice has a highlighted recommendation with a one-line reason. Users can always edit.
4. **Everything is remembered.** Company context and each article's research live in one memory, so later steps never lose detail.
5. **Calm motion.** Motion explains state changes (progress, arrival of results, what changed). No looping decoration.
6. **Ready to publish means ready.** Formatting, headings, links, images, alt text, meta and FAQ schema are done before the user sees "Ready".

## 3. Onboarding (once)

1. **Welcome**: brand merge animation, one line: "Your content marketer, trained on your company."
2. **Add your website**: single field. Nothing else.
3. **Research**: Comarketer reads the site (home, product, pricing, features, integrations, customers, docs, sitemap fallback) and shows the pages as it reads them.
4. **Review context.md**: a readable company brief, grouped into cards. Each fact links to the page it came from. Users approve or edit in place.
5. Land on the dashboard with one clear call to action: **Start an article**. The voice is chosen per article, right before writing.

### context.md (the company memory)

Generated from the website, stored per workspace, versioned, and attached to every article.

- Company: one-line description, category, what makes it different
- Products: each product with its page link, the problem it solves, key features
- Customers: customer types (business type plus qualifier), with evidence
- Proof: stats, customer counts, results, awards, with source links
- Integrations and platforms
- Pricing model and trial (only if public)
- Voice: words the company uses and avoids, tone, spelling (US or UK)
- Internal link map: product, feature, pricing and comparison pages to link from articles
- Facts not to claim (anything not found on the site)

## 4. The article workflow (four steps: Plan, Research, Blog structure, Draft)

User-facing words stay plain. Avoid internal terms such as angle, evidence or memory in the interface.

Each article is one **article memory** (a persistent thread). Every research result, source, choice and edit is appended to it, so the writer always has full context.

### Step 1. Plan (keyword, idea and title)
- Input: one keyword. Optional: voice (default from settings).
- Research shown live: related keywords and questions → the top ranking articles → what each covers → gaps nobody covers well → where the company's product fits.
- Output: **3 blog types**, each different (for example a data-backed guide, a practitioner playbook, a comparison or a teardown). Each card states the gap it fills and why it would stand out. One is recommended.
- After choosing: **5 title options**, each a different style (how-to, number, question, contrarian, outcome-led). One is recommended.

### Step 2. Research
- Gathers: definitions, stats with sources, expert viewpoints, examples, common mistakes, FAQs people ask, and where the company's product genuinely helps.
- Shown as a research notebook: sources (with domain and date), key facts, quotes, and the product tie-ins it will use.
- Every item is saved to the article memory.

### Step 3. Blog structure
- **3 layouts**, each structurally different (for example problem-first narrative, step-by-step framework, question-led FAQ format).
- Each shows: the headings, a short intro idea, where stats and product mentions go, and estimated length.
- One is recommended, with the reason.

### Step 4. Draft → ready to publish
- First, choose who is writing this article: The founder or The team, shown as two sample letters.
- Live writing view: sections appear in order as they are written.
- Then a finished, formatted article with:
  - 3 to 4 images generated with the OpenAI or Gemini image API, each with alt text and placement
  - SEO title, meta description, slug, and FAQ schema (JSON-LD)
  - internal links to product pages from context.md, external citations for every stat
  - a quality panel: originality, fact sources, readability, GEO checks
- Actions: Copy as HTML, Copy as Markdown, Download. CMS publishing (WordPress, Webflow, HubSpot, Ghost) comes next.

## 5. Writing styles

Two styles to begin with. Each is a custom instruction set, not a tone adjective.

| | Founder voice | Team voice |
|---|---|---|
| Point of view | First person singular ("I"). Personal experience, opinions, lessons learned. | First person plural ("we"). Company expertise, process, customer patterns. |
| Structure | Story-led openings, strong takes, short paragraphs. | Clear steps, frameworks, checklists, examples. |
| Proof | Anecdotes plus data. | Data, examples and customer patterns. |
| Avoid | Corporate phrasing, hype. | Vague claims, filler, first-person singular. |

Both share the quality rules: answer the question in the first paragraph, one idea per paragraph, every stat cited, no invented facts, no em dashes, sentence-case headings, plain language.

## 6. GEO quality bar (what "AI-extractable" means)

- Each section opens with a direct, self-contained answer sentence that can be quoted on its own.
- Definitions, steps and comparisons use real lists and tables, not prose walls.
- Entities are explicit: product names, categories, numbers with units and dates.
- An FAQ section answers the related questions found in research, with FAQ schema.
- Every statistic has a linked source. No unsupported superlatives.
- Clear authorship (founder or team) and a last-updated date.

## 7. Dashboard and navigation

| Area | Purpose |
|---|---|
| Home | Start a new article. Then three groups: Needs your decision (one button naming the decision), Ready to publish, and Comarketer is on it. Side panel: live and scheduled articles, totals. |
| Content library | WordPress-style list of every article: status, target search, author voice, words, quality score, date. Filters (All, In progress, Ready, Scheduled, Published), search, bulk export or archive, row actions on hover. |
| Company context | View and edit context.md. Re-research the website. See what changed. |
| Writing styles | Founder and Team voice instructions, sample output, custom rules. |
| Settings | Workspace, image provider, CMS connections, billing. |

Nudges: a small coach line on each step ("We recommend the comparison angle: none of the top 10 compares setup time"), progress dots for the four steps, a "next step" chip on every draft, and gentle empty states that say exactly what to do.

### Article page (from the library)
- Drafts show the four steps, which one is waiting, and a Continue button that picks up where the user left off.
- Finished articles show the article itself, editable in place, with a side panel: Details, SEO and GEO, Images (alt text, new version), Sources, History.
- Actions follow the status. Ready: Publish menu (Copy HTML, Copy Markdown, Schedule, CMS next). Scheduled: Publish now, Change date. Published: View live, Refresh article (new research, edits kept), Unpublish. Always: Edit, Duplicate, Download, New article on a related search, Archive.

## 8. AI pipeline (architecture)

| Stage | Model and tools | Output |
|---|---|---|
| Website research → context.md | Website crawler (public pages, sitemap fallback) plus Claude (`claude-opus-5-5`) with structured output | context.md sections with source links |
| Keyword research and SERP analysis | Claude with server-side `web_search_20260209` and `web_fetch_20260209`. For exact rankings and volumes, add a SERP or keyword API (for example DataForSEO) | Related keywords, top results, coverage map, gaps |
| Angles and titles | Claude, structured output (JSON schema) | 3 blog types, then 5 titles |
| Deep research | Claude with web search and web fetch, citations kept | Research notebook items with URLs |
| Outlines | Claude, structured output | 3 layouts |
| Writing | Claude, streaming, adaptive thinking, high effort | Article in structured Markdown with citations |
| Images | OpenAI or Gemini image API | 3 to 4 images plus alt text |
| Quality checks | Claude pass plus deterministic checks (links, stats have sources, headings, length) | Quality panel |

Implementation notes:
- Each article memory is one ordered message history. context.md and the style instruction sit in the stable system prefix with prompt caching, so every step reuses them cheaply. New research is appended, never rewritten.
- Long writing calls use streaming. Choice steps use structured outputs so the UI renders cards reliably.
- Requests that may be declined by safety classifiers handle the `refusal` stop reason and use server-side fallbacks.
- Nothing is invented: claims about the company must trace to context.md; external stats must trace to a fetched source.

## 9. Data model (first version)

- Workspace: website, context.md (versions), default voice, image provider
- Article: keyword, voice, stage, chosen angle, chosen title, chosen outline, research items, draft, images, meta, quality report, timestamps
- Research item: type (stat, quote, definition, example, FAQ, competitor coverage), text, source URL, fetched date

## 10. Build order

1. Design prototype of every screen and transition (this folder).
2. Website research → context.md (reuse the existing crawler).
3. Step 1 keyword research and angle cards with real web search.
4. Steps 2 and 3, article memory and caching.
5. Writing, images, quality panel, export.
6. CMS publishing.
7. Bring back AI visibility as "Is this article being cited?".

## 11. Open questions

- SERP and search volume provider (DataForSEO, Semrush, Ahrefs) and its cost per article.
- Image provider default (OpenAI or Gemini) and image style presets per brand.
- Which CMS to support first: answered in `CMS_INTEGRATIONS.md` (WordPress, then Webflow, then Framer; HubSpot and Ghost after).
- Pricing unit: per article, or per seat with an article allowance.
