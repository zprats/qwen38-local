# AGENTS.md

## Role

Maintain a reproducible local inference harness for Qwen3.8-27B.
Preserve secure defaults, exact artifact verification, and parity between server and client context limits.
Treat launchers, model settings, and service configuration as one configuration surface.

## Agent Configuration

| Task | Required perspectives |
| --- | --- |
| Shell launcher or configuration change | Developer |
| New command or operating mode | Developer, Tester, Reviewer |
| Authentication, proxy, sandbox, or telemetry change | Developer, Security, Devil's Advocate |
| Documentation-only change | Reviewer |

## Commands

```sh
make install
make install-agent
make start-model
make start-research
make start
make stop
make status
make security-check
make agent
make agent-plan
make agent-incident
make agent-research
```

Run syntax validation for every shell change:

```sh
for file in bin/* config.sh; do sh -n "$file"; done
```

Install JavaScript dependencies reproducibly:

```sh
pnpm install --frozen-lockfile --ignore-scripts
```

## Architecture

`bin/qwen-agent` selects an operating mode, loads one system settings file, configures sandbox and telemetry environment variables, and launches the pinned Qwen Code binary.
Local inference is served by a launchd-managed llama.cpp router configured from `config.sh`, `models.ini`, and the launchd template.
Secrets live only in ignored mode-0600 environment files and are never embedded in tracked settings or service configuration.

## Engineering Standards

- Pin package, container, model, source revision, and downloaded artifact versions exactly.
- Keep POSIX shell scripts compatible with `/bin/sh` and fail with `set -eu`.
- Update server context and client `contextWindowSize` together.
- Keep telemetry, automatic updates, managed memory, and trace propagation disabled.
- Bind local services and local proxy listeners to loopback-only interfaces.
- Keep generated credentials and runtime state out of version control.
- Update README command tables and security caveats with every user-visible mode change.

## Anti-Patterns

| Avoid | Reason |
| --- | --- |
| Changing only the server or client context limit | Produces premature compaction or rejected requests |
| Adding an unpinned package, image tag, model revision, or binary download | Breaks reproducibility and supply-chain verification |
| Embedding API keys in JSON, shell arguments, templates, or logs | Exposes credentials through version control or process inspection |
| Enabling multiple concurrent long-context sequences by default | Exhausts KV cache and destabilizes latency on a single GPU |
| Copying sensitive prompts, requests, or production evidence into this public repository | Publishes internal methodology or confidential data |
| Adding a profile without updating validation and installation paths | Creates a documented command that cannot be selected reliably |
| Treating model output as verified evidence | Findings require independently captured requests, responses, and reproducible checks |
