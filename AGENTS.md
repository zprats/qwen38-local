# AGENTS.md

## Role

Maintain a reproducible local and RunPod inference harness for Qwen3.8-27B.
Preserve secure defaults, exact artifact verification, and parity between server and client context profiles.
Treat launchers, model settings, and deployment templates as one configuration surface.

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
make install-runpod-client
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
make agent-runpod
make agent-runpod-unrestricted
make create-runpod-template RUNPOD_PROFILE=128k
make create-runpod-template RUNPOD_PROFILE=262k
make runpod-benchmark
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
RunPod inference uses an authenticated HTTPS endpoint through `agent/runpod-proxy.mjs` except for the explicitly unrestricted mode.
Every context profile spans a RunPod template, Qwen Code settings file, configuration validation, launcher selection, and documentation.
Secrets live only in ignored mode-0600 environment files and are never embedded in tracked settings or templates.

## Engineering Standards

- Pin package, container, model, source revision, and downloaded artifact versions exactly.
- Keep POSIX shell scripts compatible with `/bin/sh` and fail with `set -eu`.
- Update server context and client `contextWindowSize` together.
- Keep telemetry, automatic updates, managed memory, and trace propagation disabled.
- Bind local services and local proxy listeners to loopback-only interfaces.
- Preserve normal approval prompts unless a command name explicitly communicates unrestricted operation.
- Validate user-supplied URLs, profiles, and keys before persisting configuration.
- Keep generated credentials and runtime state out of version control.
- Update README command tables and security caveats with every user-visible mode change.

## Anti-Patterns

| Avoid | Reason |
| --- | --- |
| Changing only the server or client context limit | Produces premature compaction or rejected requests |
| Adding an unpinned package, image tag, model revision, or binary download | Breaks reproducibility and supply-chain verification |
| Embedding API keys in JSON, shell arguments, templates, or logs | Exposes credentials through version control or process inspection |
| Reusing the unrestricted launcher as a secure scanning boundary | It deliberately removes the host sandbox and network restrictions |
| Enabling multiple concurrent long-context sequences by default | Exhausts KV cache and destabilizes latency on a single GPU |
| Copying sensitive prompts, requests, or production evidence into this public repository | Publishes internal methodology or confidential data |
| Adding a profile without updating validation and installation paths | Creates a documented command that cannot be selected reliably |
| Treating model output as verified evidence | Findings require independently captured requests, responses, and reproducible checks |
