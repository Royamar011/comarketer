# Step 4b: Fact check (automatic, after the draft)

## Input
Draft HTML, findings, stored sources, brief.

## Task
For every element with `data-cite`, confirm the sentence says only what the cited findings say. For every sentence without `data-cite`, confirm it contains no fact (number, price, rating, named claim, date). Check headings, banned phrases, em dashes, paragraph length and SEO placement.

## Output (JSON)
```json
{
  "unsupported": [{"sentence": "...", "problem": "number not in any finding", "fix": "remove or rephrase"}],
  "rule_issues": [{"rule": "no em dashes", "where": "H2 3"}],
  "seo_checks": [{"check": "primary keyword in first 100 words", "pass": true}]
}
```
Unsupported sentences are fixed or removed before the user sees the article.
