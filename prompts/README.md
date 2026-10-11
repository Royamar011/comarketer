# Prompts

How the instruction layers assemble for each call. See ../CONTENT_ENGINE.md for the reasoning.

## Layer order (stable first, so it can be cached)

1. `engine.md` (all companies, all articles)
2. Company brief: context-full.md (the complete internal brief; the user reviews the shorter context.md)
3. Voice: `voices/founder.md` or `voices/team.md` plus the company's house rules
4. Blog type: one file from `blog-types/`
5. Article memory: confirmed choices so far (type, answers, idea, title, structure) and research (see below)
6. Step instruction: one file from `steps/`, with its output format

Layers 1 to 4 are identical for every call of an article and are cached. Layer 5 grows as the article moves forward and is cached step by step. Only layer 6 changes per call.

## Flow

| Product step | Calls |
|---|---|
| Plan | 01-blog-type → user confirms type and answers → 02-competitor-scan → 03-ideas-titles → user picks idea and title |
| Research | 04-research → user reviews findings |
| Blog structure | 05-structure → user picks |
| Draft | user picks voice → 06-draft → 07-fact-check (automatic) → user sees the article |

## Research store

Every page read in 02 and 04 is saved in full, never only summarised:

- `sources`: id, article id, url, title, fetched at, full text, content hash
- `findings`: id, source id, type, plain text, exact quote, verified flag

A finding is only kept if its quote is found word for word in the stored source text. The draft cites finding ids on every factual sentence, and the fact check verifies them.

What the draft call sees:
- Claude (production): the findings plus the full text of every cited source, passed as documents with citations enabled, so the model can point at exact passages. Cached, so later calls in the same article are cheap. Note: citations do not combine with forced JSON output, so the draft returns HTML text with citations, and meta, slug and images come from a second small call.
- A model with a smaller input size: the findings plus only the passages around each cited quote (sized by `LLM_INPUT_CHARS`).

The user can open any source from the Research notebook and the article's Sources tab.

## Company brief updates
`context/build-context.md` builds the brief once from the website. `context/update-context.md` handles "Edit with AI": the user's typed or spoken note, targeted re-research, and a reviewed new version of context.md.

## Which brief the writing calls use
Every article step receives `context-full.md` (the complete internal brief, with sources). `context.md` is the shorter version the user reviews; it is never the only company context a writing call gets.
