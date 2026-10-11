# Comarketer: notes for Claude

Blog automation for SaaS companies. Vite 7 + React 19 + TypeScript + motion. The dev server also hosts the API routes (see `vite.config.ts`).

## Run and check
- `npm install`, then `npm run dev` (http://127.0.0.1:5180). `npm run typecheck` must pass.
- Writing model: `server/llm.ts`. Claude when `ANTHROPIC_API_KEY` is set; otherwise any OpenAI-compatible endpoint from `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. Never add provider-specific logic to research or writing code.

## How data is stored today (no database yet)
| Data | Where | File |
|---|---|---|
| Current company (name, domain, logo, user brief `md`, saved research summary) and its articles | Browser `localStorage`, key `comarketer.workspace.v2` | `src/workspace.ts` (`useWorkspace`, `setWorkspace`, `saveArticle`) |
| Research: every page read, `context.md` (user brief), `context-full.md` (internal brief), `status.json` | Disk: `research-store/<domain>/` (gitignored) | `server/research.ts` |
| Blog platform connections (keys) | Disk: `.secrets/connections.json` (gitignored, mode 600) | `server/connections.ts` |
| Article content | Rebuilt from preview content per keyword and title; not stored | `src/sample.ts`, `src/post.ts`, `src/article-data.ts` |

The `Article` type is in `src/data.ts`. The content library is `src/screens/Library.tsx` (list, filters, search, article page with Publish, Details, SEO and GEO, Images, Sources, History tabs).

## Rules from the product owner
- Plain, value-focused copy in the UI. No internal process words (angle, evidence, memory). Never "your turn".
- Article steps are Plan, Research, Blog structure, Draft. Blog type is chosen first; voice (founder or team) is chosen right before the draft.
- Nothing about a specific company may be hardcoded. Company facts come only from the brief.
- The user sees `context.md`; writing calls use `context-full.md`. Research is stored in full so writing never relies on memory.
- Publishing goes in as a draft by default. Keys stay on the server, never in the browser.
- Design tokens are in `src/styles.css` (ivory, ink, cobalt blue, butter). Readable type sizes, calm motion, light and dark care.

## Docs
`PLAN.md` (product and UX), `CONTENT_ENGINE.md` (prompt layers), `CMS_INTEGRATIONS.md` (publishing), `prompts/README.md` (all writing instructions).
