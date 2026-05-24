## Output

Return findings as a JSON array of at most ${H} objects:

```json
[
  {
    "file": "path/to/file.ext",
    "line": 123,
    "summary": "one-sentence statement of the bug",
    "failure_scenario": "concrete inputs/state → wrong output/crash"
  }
]
```

Ranked most-severe first. If more than ${H} survive, keep the ${H} most
severe. If nothing survives verification, return `[]`.
