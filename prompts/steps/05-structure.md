# Step 3: Blog structure

## Input
Brief, voice, blog type playbook, chosen idea and title, competitor scan, research findings.

## Task
Write 3 genuinely different structures. Option A follows the playbook template. Options B and C change 2 to 3 sections in structure or narrative, keeping the playbook's required sections. Every structure must cover the expected sections from the competitor scan and the chosen gaps. Assign findings to the sections that will use them. Mark one recommended with a reason.

## Output (JSON)
```json
{
  "structures": [{
    "id": "A", "name": "plain name, e.g. Step by step", "why": "who this suits", "recommended": true,
    "intro_plan": "the situation the intro opens with",
    "sections": [{"h2": "...", "purpose": "...", "h3": ["..."], "finding_ids": ["F3", "F9"], "image_brief": "..."}],
    "faq": ["question", "question"],
    "estimated_words": 2600
  }]
}
```
