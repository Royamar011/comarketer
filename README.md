# Comarketer blog automation

Design prototype of the full product: onboarding (website to context.md), dashboard, the four-step article workflow, and the supporting screens. Read `PLAN.md` for the product, UX and AI pipeline plan.

## Run

```sh
npm run dev
```

Open http://127.0.0.1:5180. Every screen has a hash link: `#onboarding`, `#home`, `#new`, `#articles`, `#context`, `#styles`, `#settings`.

## What is real and what is sample

- Company facts for Dyrect come from its public website.
- Ranking articles, research findings and timings are sample data on `.example` domains (see `src/data.ts`). The UI marks this as a design preview.
- No API calls are made yet. `PLAN.md` section 8 describes the Claude pipeline that replaces the sample data.

## Structure

- `src/components/brand.tsx` Logo and the Content + Marketer merge animation
- `src/components/ui.tsx` Tiles, coach nudges, stepper, live progress, toast
- `src/screens/Onboarding.tsx` Welcome, website, research, context.md review, voice
- `src/screens/Workflow.tsx` Keyword, angle and title, research, outline, writing, ready to publish
- `src/screens/Pages.tsx` Home, Articles, Company context, Writing styles, Settings
- `src/data.ts` Design-preview data
