# Step 1a: Blog type (before any research)

## Input
Keyword, company brief.

## Task
Classify the searcher's intent from the keyword and pick the blog type that matches what already ranks for queries like it. Choose from: best-of-list, how-to-guide, comparison, alternatives, tips. Use the "Suggest this type when" rules in each playbook.

Then prefill the playbook's "Confirm before research" answers with your best guess, so the user only confirms.

## Output (JSON)
```json
{
  "suggested_type": "best-of-list",
  "reason": "one plain sentence a non-marketer understands",
  "other_types": [{"type": "how-to-guide", "reason": "..."}],
  "confirm": [
    {"id": "item_count", "question": "How many tools should the list cover?", "answer": "9", "options": ["5","7","9","10"]}
  ]
}
```
The user confirms the type and answers before step 1b runs.
