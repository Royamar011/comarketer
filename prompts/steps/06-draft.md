# Step 4: Draft

## Input
All layers, plus the chosen structure, the research findings, and the full stored sources for those findings.

## Task
Write the complete article following the structure, the playbook, the voice and the engine rules.

Truth: every factual sentence carries the ids of the findings it uses, as `data-cite="F3 F9"` on its element. Facts about the company may cite brief sections instead (`data-cite="brief:Proof"`). Sentences that are opinion, explanation or transition need no citation. If you need a fact that is not in the findings, do not write it; add it to `gaps`.

Allowed HTML: h1, h2, h3, h4, p, ul, ol, li, strong, em, a (href from the brief or findings only), table, thead, tbody, tr, th, td, blockquote, figure, figcaption, section, details, summary. No inline styles, no scripts.

## Output (JSON)
```json
{
  "html": "<h1>...</h1>...",
  "meta_description": "145 to 155 characters, includes the primary keyword",
  "slug": "short-keyword-slug",
  "images": [{"placement": "after H2 ...", "prompt": "what to generate", "alt": "what the image shows"}],
  "faq_schema": [{"question": "...", "answer": "..."}],  // optional: Google stopped showing FAQ rich results in May 2026; kept for AI answer engines
  "internal_links": ["..."],
  "gaps": ["facts we needed but did not have"]
}
```
