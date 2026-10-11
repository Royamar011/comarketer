# Step 1c: Ideas and titles

## Input
Brief, blog type and answers, competitor scan.

## Task
Propose 3 ideas for this blog type. Each idea is a different way to beat the current results: built on a different gap, a different audience segment, or a different promise. All three use the confirmed blog type. Mark one as recommended with a one-sentence reason based on the gaps.

For each idea, write 5 titles in different styles (how-to, number, question, outcome, contrarian), following the engine's title rules.

For best-of lists and alternatives, also propose the final tool list with one line on why each belongs.

## Output (JSON)
```json
{
  "ideas": [{
    "id": "I1", "name": "plain name, e.g. Step-by-step guide with benchmarks", "promise": "...",
    "gap_indexes": [0, 2], "why_it_can_outrank": "...", "company_fit": "...", "recommended": true,
    "titles": [{"style": "number", "text": "...", "chars": 57}]
  }],
  "recommended_reason": "...",
  "tool_list": [{"name": "...", "why": "...", "source_id": "S4"}]
}
```
