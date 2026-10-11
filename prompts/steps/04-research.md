# Step 2: Research

## Input
Brief, blog type, chosen idea and title, competitor scan, tool list if any. Tools: web search, web fetch.

## Task
Research everything the article will need, so that writing needs no memory at all:
- How the topic works, how it is done today, where it breaks
- Every tool on the list: features, pricing with plan names, integrations, ratings, ideal user, from its own pages
- Data and studies with the original source (not a blog quoting a blog, where avoidable)
- Real questions and language from forums, reviews and support content
- Examples and mistakes
- Company pages that support each point (from the brief's URLs)

Save every page you read to the research store in full. Then extract findings. Every finding quotes the source exactly. A finding whose quote cannot be found in the stored page is rejected automatically.

## Output (JSON)
```json
{
  "findings": [{
    "id": "F1", "type": "stat|definition|question|example|mistake|tool_fact|company_fact|quote",
    "text": "the fact in plain words", "quote": "exact words from the source",
    "source_id": "S12", "about": "Tool name or topic", "date": "date on the source if shown"
  }],
  "open_questions": ["things we could not verify"]
}
```
