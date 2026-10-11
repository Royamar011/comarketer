# Step 1b: Competitor scan (first research pass)

## Input
Keyword, confirmed blog type and answers, company brief. Tools: web search, web fetch.

## Task
1. Search the keyword and read the top 10 organic results in full. Save every page to the research store (full text, URL, title, date fetched). Skip ads, forums and the company's own pages, but note if the company already ranks.
2. For each result record:
   - what it covers (sections, depth, formats used, word count, last updated date if shown)
   - why it ranks, with evidence from the page: matches intent, depth, freshness, format (lists, tables, steps), original data, expert or first-hand experience, strong examples, FAQ or schema, site authority signals
   - where it is weak: thin sections, outdated facts, missing steps, no examples, no data, ignores a segment
3. Find patterns across all results: sections everyone has (the reader expects these), average length, common formats.
4. Find the gaps: questions or needs that no result answers well. Every gap needs evidence (people ask it in related searches, forums or reviews, and no top result covers it).
5. Build the keyword cluster: variations (same intent), semantic terms, question keywords.
6. Note where the company genuinely fits each gap, citing the brief section.

## Output (JSON)
```json
{
  "intent": {"problem": "...", "stage": "comparing options", "already_know": "...", "where_it_breaks": "..."},
  "keywords": {"primary": "...", "variations": [], "semantic": [], "questions": []},
  "results": [{
    "rank": 1, "source_id": "S3", "title": "...", "url": "...", "format": "listicle", "words": 2400,
    "covers": ["..."], "why_it_ranks": [{"reason": "...", "evidence_quote": "..."}], "weak_spots": ["..."]
  }],
  "expected_sections": ["sections every top result has"],
  "typical_length": 2600,
  "gaps": [{"gap": "...", "evidence": "...", "source_ids": ["S7"], "why_it_matters": "..."}],
  "company_fit": [{"gap_index": 0, "brief_section": "Products > [product name]", "how": "..."}]
}
```
