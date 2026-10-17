# Comarketer: notes for Claude

Blog automation for SaaS companies. Vite 7 + React 19 + TypeScript + motion. The dev server also hosts the API routes (see `vite.config.ts`).

## Run and check
- `npm install`, then `npm run dev` (http://127.0.0.1:5180). `npm run typecheck` must pass.
- Writing model: `server/llm.ts`. Claude when `ANTHROPIC_API_KEY` is set; otherwise any OpenAI-compatible endpoint from `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. Never add provider-specific logic to research or writing code.

## How data is stored
| Data | Where | File |
|---|---|---|
| Companies (name, domain, logo, brief `md`), their articles (status, plan, finished `content`, publish links, dates, archive) and each article's history | Postgres: PGlite in `.data/pglite` (gitignored) by default, or `DATABASE_URL` (Supabase). Same SQL for both | `server/db/` (schema in `server/db/migrations/`); browser side `src/workspace.ts` (`useWorkspace`, `saveArticle`, `archiveArticles`, `loadArticle`, ...) |
| Browser copy for instant loads (no article content) | `localStorage`, key `comarketer.workspace.v3`. Older `v2` data is moved into the database once | `src/workspace.ts` |
| Research: every page read, `context.md` (user brief), `context-full.md` (internal brief), `status.json` | Disk: `research-store/<domain>/` (gitignored) | `server/research.ts` |
| Market: competitors and buyer groups, each with its evidence | Postgres `companies.competitors` and `companies.buyer_groups`; written for the writer as `research-store/<domain>/market.md`, which `readBrief` appends to the full brief | `server/market.ts` (logic), `server/market-api.ts` (routes, background jobs), `server/search.ts` (web search), `src/components/market.tsx` (setup step 4 and the Company brief tab) |
| Blog platform connections (keys) | Disk: `.secrets/connections.json` (gitignored, mode 600) | `server/connections.ts` |
| Article content | Built from preview content (`src/sample.ts`) when the draft finishes, then saved as a `Post` in `articles.content`; edits and SEO changes update it | `src/article-data.ts`, `src/post.ts` |

New tables or columns go in a new numbered file in `server/db/migrations/`. Never edit one that has already run. See `DATABASE.md`.

The `Article` type is in `src/data.ts`. The content library is `src/screens/Library.tsx`: list with status tabs, Archived, search, bulk archive, restore and delete, and the article page (edit in place, Publish with schedule, Details, SEO and GEO, Images, Sources, History). Articles in progress reopen where they were left (`Workflow` with `articleId`).

## Rules from the product owner
- Plain, value-focused copy in the UI. No internal process words (angle, evidence, memory). Never "your turn".
- Article steps are Plan, Research, Blog structure, Draft. Blog type is chosen first; voice (founder or team) is chosen right before the draft.
- Nothing about a specific company may be hardcoded. Company facts come only from the brief.
- Buyer groups found only on competitors' sites are market context. Never write that the company serves a group unless it is marked "You serve this" (proved by a quote from the company's own site).
- The user sees `context.md`; writing calls use `context-full.md`. Research is stored in full so writing never relies on memory.
- Publishing goes in as a draft by default. Keys stay on the server, never in the browser.
- Design tokens are in `src/styles.css` (ivory, ink, cobalt blue, butter). Readable type sizes, calm motion, light and dark care.
- Shared motion pieces are in `src/components/ui.tsx`: `RouteBar` (top progress bar), `Skel` (loading placeholders), `Burst` (small celebration), `Toast` (problems shown in red). Page transitions follow menu order (`place` in `src/App.tsx`). Keep `MotionConfig reducedMotion="user"` and the reduced-motion CSS working.

## Docs
`PLAN.md` (product and UX), `DATABASE.md` (database choice, tables, API), `CONTENT_ENGINE.md` (prompt layers), `CMS_INTEGRATIONS.md` (publishing), `prompts/README.md` (all writing instructions).
