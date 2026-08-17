# Pull request review

```sh
qwen-local-plan -p "Review the current branch against its merge base. Prioritize correctness, security, concurrency, compatibility, and missing tests. Cite file and line evidence. Do not edit files. Return only actionable findings ordered by severity." --max-wall-time 20m --max-tool-calls 40
```

Use the interactive agent when the review requires follow-up questions:

```sh
qwen-local -i "Review this branch against its merge base and start with the highest-risk behavior change."
```
