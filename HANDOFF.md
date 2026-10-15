# Comarketer: handoff

Last updated: October 15, 2026. Repo: `Royamar011/comarketer` (private). Read `CLAUDE.md` for working rules.

## 1. What we are building

**Comarketer is blog automation for SaaS companies.** A founder or small marketing team adds their website once. Comarketer learns the company, then researches, plans, writes and publishes blog articles that are built to rank on Google and get quoted by AI answer engines. Every month it checks each published article and keeps it up to date.

The name is **content + marketer**: a marketing teammate, not a prompt box.

| | |
|---|---|
| Who it is for | SaaS founders and small marketing teams without a content agency |
| Promise | Type a keyword. Get a researched, publish-ready article with images and SEO, in your voice, sent to your blog. It stays current every month |
| Why it wins | Every article starts from research (what ranks, why, what it misses) and from the company's own facts. Nothing is written from memory, every fact traces to a saved source |
| Not this | Generic AI text, or a tool that needs a long brief |

## 2. Product rules (agreed with the owner)

1. **Plain, value-focused copy.** Say what the user gets, not how the system works. No internal words such as angle, evidence or memory. Never "your turn".
2. **As few inputs as possible.** Recommend, never force. Every choice has a suggested option with a one-line reason.
3. **Nothing hardcoded about any company.** Company facts come only from that company's brief.
4. **Hallucination-free writing.** Research is stored in full. Each fact keeps an exact quote that must match its saved page. The draft cites facts; a fact check runs before the user sees the draft.
5. **Two briefs.** The user reviews a clean `context.md`. Writing uses `context-full.md`, the complete unfiltered version with sources.
6. **Drafts by default.** Publishing never goes live unless the user chooses it. Keys stay on the server.
7. **Calm, clear motion.** Loading states show what is being made; transitions explain what changed.
8. **Model-agnostic code.** Claude is the writing model. Groq was only for testing. No provider-specific logic in research or writing code.

## 3. The user journey

### Onboarding (once, about 2 minutes)
1. **Website.** One field.
2. **Research.** Reads robots.txt, the sitemap and the key pages (products, pricing, industries, customers, integrations, comparisons, docs), saves every page in full, and scores which pages are product pages. The screen shows live progress and the brief writing itself.
3. **Your brief.** The full `context.md`, sectioned like a document. The user reads it once, edits in place or uses the floating **Edit with AI** bar (type or speak a change).

### Writing an article: four steps
| Step | What happens | User decides |
|---|---|---|
| **Plan** | Suggest a blog type from the keyword (Best-of list, How-to guide, Comparison, Alternatives, Tips) with a few quick questions. Then scan the top results: what each covers, why it ranks, what it misses. Then 3 ideas built on the gaps, then 5 titles | Blog type and answers, idea, title |
| **Research** | Findings (stats, definitions, questions people ask, examples, mistakes, where the company helps), each tied to an exact quote on a saved page | Nothing, or open any saved page |
| **Blog structure** | 3 outlines; each section lists the facts it will use | One outline |
| **Draft** | Choose the voice (founder or team), then the article streams in, then every fact is checked against its saved page | Voice |

Then **Ready to publish**: the formatted article with 4 images and alt text, SEO title, meta description, slug, FAQ, and the Publish panel.

### Other screens
- **Home:** "What do you want to write about?" plus the user's blogs with their current step.
- **Content library:** every article with status filters, search and an article page (Publish, Details, SEO and GEO, Images, Sources, History).
- **Company brief:** the brief, Research my website again, Use a different website, Saved research.
- **Voices:** founder and team voice, with house rules.
- **Settings:** website, image provider, blog connections.

## 4. How the AI works

Each step is its own model call, not one long chat. Every call gets the same stacked context:

```
1. Engine rules              prompts/engine.md (same for every company)
2. Company brief             context-full.md (cached)
3. Voice                     prompts/voices/founder.md or team.md
4. Blog type playbook        prompts/blog-types/<type>.md
5. Article research store    findings with quotes + full saved pages
6. Step instruction          prompts/steps/01 … 07 (output schema per step)
```

- **Company research store:** every website page in full, written by `server/research.ts` (instructions: `prompts/context/build-context.md`).
- **Article research store:** every page read for an article, in full; findings must quote it word for word (`prompts/steps/04-research.md`).
- **Brief updates:** "Edit with AI" re-researches only what the note affects and updates both briefs (`prompts/context/update-context.md`).

## 5. What is real today

| Part | State | Where |
|---|---|---|
| Website research → `context.md` + `context-full.md` | **Real** | `server/research.ts` |
| Writing model interface (Claude, or any OpenAI-compatible endpoint for testing) | **Real** | `server/llm.ts` |
| All writing instructions | **Written** | `prompts/` |
| Article steps (top results, ideas, titles, research, structure, draft) | **Preview content** built from keyword + company. Needs a search API and wiring to Claude | `src/sample.ts`, `src/screens/Workflow.tsx` |
| One article format → HTML, Markdown, WordPress blocks, JSON-LD | **Real** | `src/post.ts` |
| Article images (cover, checklist, steps, table) with matching alt text | **Real** (drawn, not AI-generated) | `src/cards.ts` |
| Copy with formatting, Copy HTML, Copy Markdown, Download .zip | **Real** | `src/article-data.ts` |
| Publishing to WordPress, Webflow, HubSpot, Ghost | **Real**, tested against stand-in APIs, not yet a live account | `server/publish.ts` |
| Edit with AI on the brief | **UI only**; the model call is specified, not wired | `src/components/ai-edit.tsx` |
| Database and real content library (archive, restore, delete, duplicate, bulk actions, history, scheduling) | **Built on branch `claude/brave-faraday-b79dyz`, not merged into `main` yet** (see section 8) | `server/db/`, `src/screens/Library.tsx` |
| Monthly auto-update | **To build** (section 7) | |

## 6. Architecture

- **Stack:** Vite 7, React 19, TypeScript, motion, lucide icons, cheerio (page reading), Anthropic SDK.
- **Server:** API routes run inside the Vite dev server (`vite.config.ts` → `server/api.ts`). This must move to a real backend before launch.
- **Routes:** `/api/research` (streams progress), `/api/brief`, `/api/connections`, `/api/connections/settings`, `/api/connections/webflow-options`, `/api/publish` (streams progress).
- **Storage on `main`:**
  - Company and articles: browser `localStorage` (`src/workspace.ts`).
  - Research: `research-store/<domain>/`.
  - Platform keys: `.secrets/connections.json`.
- **Storage on the database branch:**
  - Companies, articles (with content) and article history are in Postgres. That's embedded PGlite in `.data/` by default (no setup), or any Postgres via `DATABASE_URL` (Supabase recommended).
  - Research files, `context-full.md` and platform keys are still on disk.
- **Env:** `ANTHROPIC_API_KEY` (or `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` for testing). See `.env.example`.

## 7. New: monthly blog auto-update (to build)

### Why
Articles decay. Top results change, new questions appear, stats and prices go stale, links break, the company launches new features. Google and AI answer engines favour pages that stay accurate and current. Comarketer keeps every published article fresh without the user remembering to.

### What it does, every month, for each published article
1. **Check the search again.** Re-scan the top results for the article's keyword: new competitors, new sections they all cover, new gaps, new questions people ask.
2. **Check the company again.** Re-read the sitemap and changed pages (compare page hashes in the research store). New products, features, pricing or integrations update `context-full.md` first.
3. **Check the article itself.**
   - Is every cited source still live?
   - Does each quote still match its page?
   - Is any stat older than 12 months?
   - Is the year in the title out of date?
   - Are there broken or redirected internal links, or newer posts of the company's own worth linking to?
4. **Check performance (optional).** If Google Search Console is connected: clicks, impressions, average position, and searches the article shows up for but doesn't answer.
5. **Decide how much to change:**

| Result | When | What happens |
|---|---|---|
| No change | Nothing material moved | Logged, nothing published |
| Small fix | Broken link, old year, outdated stat with a fresh source, new internal link | Can be applied automatically if the user allows it |
| Content update | New section the top results now all cover, new FAQ questions, changed product facts | Prepared for review |
| Rework | Rankings dropped and the search intent shifted | Suggested as a new plan for the user to approve; never automatic |

6. **Prepare the update.**
   - A section-by-section change set, each change with a one-line reason and its source.
   - New facts follow the same rule as new articles: quoted from a saved page.
   - `dateModified` and the visible "Updated on" date are refreshed.
7. **Review and publish.**
   - The user sees "Updates ready" with before and after per section, and can approve all, approve some, or skip.
   - Approved changes update the **same post** on the connected platform (stored post ID), keeping the slug and URL.
8. **Record it.** Every refresh run and every published version is kept in the article's History tab, with one-click restore.

### Rules
- Never change the slug or URL.
- Never undo the user's own edits: compare against the last published version, not the original draft.
- Don't update for the sake of it. Only material changes go out, so the article doesn't churn.
- Every new fact is backed by a saved, quoted source.
- Each run has a token and search budget per article; skipped work is reported, not hidden.

### What it needs
| Piece | Notes |
|---|---|
| Scheduler and worker | Monthly job per article (30 days after publish or last refresh), plus a manual "Check for updates now". Needs a real backend with a job queue |
| Update support in each publisher | WordPress: update post by ID. Webflow: update item (staged or live). HubSpot: update the draft, then push live. Ghost: update with the latest `updated_at`. Read back after every update |
| Search API | Same one the article Plan step needs |
| Database | Articles, versions, refresh runs, change sets (section 8) |
| Prompts to add | `prompts/steps/08-refresh-check.md` (what changed and how much), `prompts/steps/09-refresh-update.md` (write the change set) |
| Optional | Google Search Console connection (OAuth) for performance signals |

### UI
- **Content library:** a "Needs update" filter and status; "Updated on" date per article.
- **Article page:** the "Updates ready" panel (before and after per section, approve or skip); History tab lists every check and every version.
- **Home:** a small "3 articles have updates ready" card.
- **Settings:**
  - Monthly updates on or off;
  - Apply small fixes automatically (on by default) or ask first;
  - Email me when updates are ready.

## 8. Database and content library

### Already built (branch `claude/brave-faraday-b79dyz`, merge into `main` first)
- **Postgres everywhere:** embedded PGlite locally, or `DATABASE_URL` for Supabase or any Postgres. Same migrations (`server/db/migrations/`). Data from the browser moves into the database once.
- **Tables:**
  - `companies`: domain, name, logo, `brief_md`, pages saved;
  - `articles`: keyword, title, status, step, voice, plan, content, SEO numbers, slug, `cms`, `external_id`, `live_url`, `edit_url`, `scheduled_for`, `published_at`, `archived_at`;
  - `article_events`: the History tab.
- **Content library:**
  - Archive, restore, delete (with confirm), duplicate and bulk actions, with an Archived tab.
  - Edits in place, SEO fields and alt text are saved.
  - Continue reopens the same article.
  - Scheduling on WordPress, Ghost and HubSpot; publish outcomes are recorded.
  - The article id is in the URL.

### Still to add
| Table | Why |
|---|---|
| `brief_versions` (both `context.md` and `context-full.md`) | Writing uses the full brief; versions let Edit with AI and refreshes roll back |
| `research_pages`, `findings` | Move `research-store/` into the database; findings with quotes back every fact |
| `connections` (encrypted) | Move platform keys out of `.secrets/` |
| `article_versions` | Every published and refreshed version, one-click restore |
| `refresh_runs`, `refresh_schedule` | Monthly auto-update (section 7) |
| `users`, `workspace_members` | Accounts and teams, with auth |

## 9. Build order

1. **Merge the database branch**, then move research, `context-full.md` and connections into the database and add article versions (section 8).
2. **Real backend:** move the API routes out of the Vite dev server; add auth (accounts, workspaces).
3. **Search API:** for the Plan step's top-results scan and for research.
4. **Wire the article steps to Claude:** steps 01 to 07 using the prompts.
5. **Edit with AI:** wire it to the model.
6. **Monthly auto-update:** scheduler, worker, refresh prompts, the publisher update methods, the UI.
7. **Image model** (optional): replace drawn cards with generated images, same alt text rules.
8. **More platforms:** Framer, Wix, Shopify. Plus Google Search Console.

## 10. Open decisions

| Decision | Options | Notes |
|---|---|---|
| Database host | Supabase is recommended by the database branch; locally it runs on PGlite | Any Postgres works via `DATABASE_URL` |
| Search API | Serper, Tavily, Brave Search, DataForSEO | DataForSEO also gives search volume |
| Image model | OpenAI, Gemini, or keep drawn cards | Settings already has the toggle |
| Hosting and worker | Any Node host with a job queue | The older app has `Dockerfile.worker` as a pattern |
| Search Console | Connect or not | Improves monthly updates |
| Pricing unit | Per article, or per seat with an allowance | Monthly updates add ongoing cost per article |
| Auto-apply default | Small fixes on or off by default | Proposed: on |

## 11. Notes

- Rotate the Groq test key (it was shared in chat during testing).
- `.env`, `.secrets/` and `research-store/` are gitignored and must never be committed.
- Docs: `PLAN.md` (product and UX), `CONTENT_ENGINE.md` (prompt layers), `CMS_INTEGRATIONS.md` (publishing research and status), `prompts/README.md` (all writing instructions).
