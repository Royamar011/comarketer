# Comarketer

Blog automation for SaaS companies: research the company's website into a brief, plan and research each article against what already ranks, write it in the founder's or team's voice, and publish it with images, SEO fields and schema.

## Run

```sh
npm install
cp .env.example .env   # add ANTHROPIC_API_KEY
npm run dev
```

Open http://127.0.0.1:5180. Screens have hash links: `#onboarding`, `#home`, `#new`, `#library`, `#context`, `#styles`, `#settings`.

## What is real today

| Part | State |
|---|---|
| Website research → company brief (`context.md`) and the complete internal brief (`context-full.md`) | Real. Reads robots.txt, the sitemap and key pages, saves every page, then the writing model writes both briefs |
| Writing model | Claude by default (`ANTHROPIC_API_KEY`). Any OpenAI-compatible endpoint works for testing (`server/llm.ts`) |
| Article steps (top results, ideas, titles, research, structure, draft) | Preview content built from the keyword and company. Search is not connected yet |
| Article images | Real PNG and JPEG files with matching alt text (`src/cards.ts`) |
| Copy with formatting, Copy HTML, Copy Markdown, Download .zip | Real |
| Publishing to WordPress, Webflow, HubSpot, Ghost | Real (`server/publish.ts`). Tested against stand-in APIs; try a live account with "Send as draft" |

## Where things are

- `prompts/` All writing instructions: engine rules, blog types, voices, the step prompts, and the company brief templates. Start with `prompts/README.md`.
- `server/research.ts` Website research and brief writing
- `server/llm.ts` The writing model, behind one interface
- `server/publish.ts`, `server/connections.ts`, `server/api.ts` Blog platform publishing and connections (keys are kept in `.secrets/`, never in the browser)
- `src/post.ts` One article format, rendered to HTML, Markdown, WordPress blocks and JSON-LD
- `src/screens/` Onboarding, the article workflow, Home, Library, Company brief, Voices, Settings
- `integrations/wordpress/` Small plugin that lets Comarketer set Yoast or Rank Math SEO fields

## Docs

- `PLAN.md` Product, UX and AI pipeline plan
- `CONTENT_ENGINE.md` How the writing skill maps to the API and the prompt layers
- `CMS_INTEGRATIONS.md` Blog platform research and how each integration works

## Not committed

`.env` (keys), `.secrets/` (blog platform connections), `research-store/` (saved website research) and `node_modules/`.
