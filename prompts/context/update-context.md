# Updating context.md from a user note ("Edit with AI")

Runs when the user types or speaks a change on the company brief, for example "We stopped selling to enterprises", "Our pricing page is the right one" or "We launched a mobile app last month, check the site again".

## Inputs
- The note: typed text, or the voice transcript (speech to text runs first; send the transcript, never audio)
- The current context.md, in full
- The company research store (all saved pages and facts)
- The company website and sitemap URL from "At a glance"

## Step 1. Understand the note
Return:
```json
{ "intent": "correct|add|remove|resolve_question|refresh",
  "sections": ["section titles in context.md that this touches"],
  "claims": ["each factual statement the user made, one per line"],
  "needs_research": true,
  "research_plan": ["specific pages to re-read or searches to run, e.g. /pricing, sitemap entries under /product/, '[company] mobile app'"] }
```
- A statement about the company's own business that a website cannot show (who they sell to, what they want to stress, what is wrong in the brief) is accepted as a fact from the company. Mark it `source: "company"`.
- A statement the website should show (a new product, a new price, a new integration) is checked: re-read the pages before writing it.

## Step 2. Research again, only where needed
- Re-read the sitemap and fetch new or changed URLs (compare with page hashes in the store).
- Re-read every page in `research_plan`. Search outside the site only when the note asks for it.
- Save every page read to the research store, as in `build-context.md`.
- If the website disagrees with the user, keep the user's version and add a "Please confirm" note that quotes what the site says.

## Step 3. Write the new context.md and context-full.md
- Change only the sections the note and the new research affect, in both briefs. Keep every other section word for word.
- The user's change always lands in context-full.md too, with `[from the company]` as its source.
- Follow `context-template.md`: same section order, same rules (product page URLs, no source links, no competitors, no stats).
- When the note answers a "Please confirm" question, replace the question with the answer.

Return:
```json
{ "context_md": "the full new file",
  "changes": [{ "section": "", "type": "added|changed|removed", "before": "", "after": "", "why": "from your note | found on /page" }],
  "questions": ["anything still unclear, asked plainly"] }
```

## What the user sees
1. The note, then a short progress line while research runs.
2. The brief with changed sections highlighted and a one-line reason for each.
3. Keep changes or Undo. Nothing is saved until the user keeps it. Every kept version is stored, so an older brief can be restored.
