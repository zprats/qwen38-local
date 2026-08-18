# Qwen3.8-27B Local Web UI

Qwen3.8-27B inference on Apple Silicon through llama.cpp Metal, plus an optional RunPod FP8 deployment for the gated uncensored research model.

## Requirements

These requirements apply to local inference. The RunPod client needs only Node.js, pnpm, and a RunPod account.

- Apple Silicon Mac with 48 GB RAM recommended
- Node.js 24.18.0
- pnpm 10.30.2
- About 30 GB free for the base installation
- Podman only for the browser UI

Install the pinned package manager and optional UI runtime:

```sh
corepack enable
corepack prepare pnpm@10.30.2 --activate
brew install podman
podman machine init
podman machine start
```

Skip the Podman commands when only the coding agent is needed.

## Install the base model

```sh
make install
make install-agent
make start-model
```

The installer downloads pinned llama.cpp binaries, the Q6_K model, and the vision projector. Every downloaded artifact is SHA-256 verified. It also generates an ignored per-install API key and WebUI signing key in `.env` with mode `0600`.

Run Qwen Code from any repository:

```sh
cd /path/to/your/repository
qwen-local
```

The launcher starts the model server automatically. Useful session commands:

```sh
qwen-local --continue
qwen-local --resume
qwen-local -i "Inspect the failing test, explain the cause, and wait before editing."
qwen-local-plan -p "Review this branch against its merge base."
```

## Browser UI

```sh
make start
open http://localhost:2501
```

The first Open WebUI account created is the local administrator. The UI and model API listen on localhost only.

```sh
make status
make security-check
make model-logs
make logs
make stop
```

## Security defaults

The launcher enforces these settings:

- Model API bound to `127.0.0.1:8001`
- Open WebUI bound to `127.0.0.1:2501`
- Random per-install API and signing keys
- Localhost-only CORS
- Qwen usage statistics disabled
- Qwen telemetry and OpenTelemetry SDK disabled
- Trace-context propagation disabled
- Automatic updates disabled
- Managed memory, team-memory sync, and automatic skills disabled
- Open WebUI analytics, telemetry, and version checks disabled
- Git co-author attribution disabled

`qwen-local` retains approved network-capable coding tools. Use `qwen-local-incident` when tool processes must have no external network access. Chat history, tool output, Qwen Code sessions, and server logs remain on the local machine.

## Coding commands

The installed commands are:

| Command | Behavior |
| --- | --- |
| `qwen-local` | Interactive coding agent; asks before risky actions |
| `qwen-local-plan` | Read-only planning and investigation |
| `qwen-local-incident` | Incident workflow with tool network access disabled |
| `qwen-local-uncensored` | Uncensored research model with full repository tools, approval prompts, and external network access disabled |
| `qwen-runpod-uncensored` | Local repository tools with uncensored FP8 inference on an authenticated RunPod |
| `qwen-runpod-unrestricted` | Opt-in RunPod inference with unsandboxed local tools, normal approval prompts, and unrestricted host networking |

The agent uses a 128K server context and caps each model response at 16K tokens. Session turns, wall time, and aggregate tool calls are not artificially capped. Subagents are available to depth five, desktop automation is disabled, and background managed-memory calls are disabled because the server has one inference slot.

Do not use `--yolo` against production repositories or during incident validation. The regular command is the right default for implementation; use plan mode for investigation and incident mode for sanitized payment, booking, or security evidence. Copy-paste workflows are in [examples](examples).

This supplies the tool harness found in Codex and Claude Code, but it does not make a local quantized 27B model equally reliable on long autonomous changes. Keep changes scoped, inspect diffs, and require test evidence before accepting its conclusion.

## Additional system prompt

Every launcher can append an external instruction file without storing that content in this repository:

```sh
QWEN_EXTRA_SYSTEM_PROMPT_FILE=/absolute/path/to/instructions.md qwen-runpod-uncensored
```

The launcher accepts a readable, non-symlink regular file containing 1 to 524,288 bytes of valid UTF-8 without NUL bytes. The path must be absolute. Its content is appended after the selected operating-mode instructions and sent to the configured model on every request in the session.

Keep confidential instructions outside this public repository. They remain visible to the model provider, Qwen Code session history, and local process inspection while the launcher is running. Do not use a prompt file as a security boundary; tool approvals, sandboxing, and network controls remain authoritative.

## Optional gated research model

This profile requires access to `orcarouter/Qwen3.8-27B-Uncensored-FP8` and an authenticated Hugging Face CLI:

```sh
hf auth login
make install-uncensored
make start-research
qwen-local-uncensored
```

The exact pinned FP8 revision is retained under the ignored `runtime` directory and converted into Q6_K for Metal. The research router exposes both models but keeps only one resident at a time.

The uncensored variant is abliterated and does not provide meaningful refusal behavior. Open WebUI gives it chat and image inference only. `qwen-local-uncensored` adds repository tools with normal approval prompts while denying tool traffic to external networks. It can still read and modify files in the selected repository, and local chat history, tool output, model logs, and Qwen Code sessions persist on disk. Use sanitized fixtures and a disposable branch or worktree.

## RunPod FP8 deployment

The RunPod path uses the publisher's original gated block-FP8 checkpoint instead of the Mac GGUF conversion. The Pod runs pinned vLLM with MTP speculative decoding. The default profile has a 131,072-token context, the 262,144-token profile preserves the model's native window, and the optional 1,000,000-token profile uses vLLM's explicit long-length extrapolation override. Qwen Code and repository tools remain on the local machine, while inference requests cross the network to RunPod over HTTPS.

```sh
make install-runpod-client
bin/configure-runpod https://POD_ID-8000.proxy.runpod.net
cd /path/to/your/repository
qwen-runpod-uncensored
```

Use the separate unrestricted command only for explicitly authorized targets. It disables the macOS tool sandbox, so shell commands execute directly on the host and can reach public networks:

```sh
qwen-runpod-unrestricted
```

For the native context window, create and configure the matching 262K profile on an 80 GB GPU:

```sh
make create-runpod-template RUNPOD_PROFILE=262k
bin/configure-runpod https://POD_ID-8000.proxy.runpod.net 262k
```

The experimental 1M profile configures the server and Qwen Code client together and compacts at 95% of the configured window:

```sh
make create-runpod-template-1m
bin/configure-runpod https://POD_ID-8000.proxy.runpod.net 1m
```

The checkpoint declares a native 262,144-token limit. The 1M profile is extrapolated, requires an 80 GB GPU, and must be startup-tested on the allocated host before use. Its FP8 KV cache is estimated at approximately 30.5 GiB at the full window, before model and runtime memory. Qwen Code targets compaction at 950,000 tokens, while retaining its separate summary and safety buffers.

An A40 is the approximate $0.50/hour 128K profile but is not expected to sustain 60 tok/s. The 262K profile requires an A100 80 GB or H100 80 GB. An H100 SXM is the reliable 60+ tok/s target on shorter generations at roughly $3/hour. Current GPU guidance, the pinned private templates, secret setup, benchmarking, and security boundaries are documented in [runpod/README.md](runpod/README.md).

## Installed components

| Component | Pin |
| --- | --- |
| Model | `unsloth/Qwen3.8-27B-GGUF`, `Q6_K`, SHA-256 `562fbf760503008f118e5df38de5b3e97992d1f693f475815631198547486727` |
| Vision projector | `mmproj-F16.gguf`, SHA-256 `cbb841a9ee0636b2ec172f5bb8df2ea8dfeb01e90fe7c6126581d662a0b4e43e` |
| Research source | `orcarouter/Qwen3.8-27B-Uncensored-FP8`, revision `9228df5c6c9c509e1019f83b4e085cf643118bac` |
| Research model | Local `Q6_K`, SHA-256 `e2fecab60f4b85e5c369e69801e329e8cc32863c14864b0219775ddb8b93cc57` |
| Research vision projector | Local `F16`, SHA-256 `8c4304a2e39efe8433b6a0f8b3bbfad47a3a1b0bed445614685b2b19d760b87c` |
| Research MTP draft | Local `Q8_0`, SHA-256 `c3a466439660a5d82c4a669c39943869ece2b5e668b5e3d1381f125acff2a310` |
| llama.cpp | `b10434`, SHA-256 `3410f386636f72fbdf7f7389173dd569cd46f43dfab873d5b848d2f7e468c310` |
| llama.cpp converter | commit `7e4c0a96880dae4fc4268ad441f8a6446bd5460a`, archive SHA-256 `8759ab3d3a92d86ba3ba24fab7e6adde08eaf2f941e6c79118373e4f41e0af8c` |
| Open WebUI | `v0.9.5`, arm64 image digest `sha256:e78f8d3672b1f32867cedc90a3f3b31ee53a7b5cf027618c944be88bae9d67f4` |
| Qwen Code | `0.21.6` |
| pnpm | `10.30.2` |
| RunPod vLLM | `v0.24.0`, linux/amd64 image digest `sha256:f9de5cd9fa907fbf6dbba691eb7db095d48ad58ea283e3eba7142f9a91e186e8` |

The router runs as a per-user `launchd` service with restart-on-failure behavior, a 128K context window, full Metal offload, Q8 KV cache, native image input, preserved thinking output, and one resident model. The research profile also uses its separate MTP head for speculative decoding. Its converted serving artifacts use about 25 GB of disk and about 30 GB RSS when loaded; the pinned original FP8 source uses another 31 GB of disk.

The upstream research model has a native 262K context, but this setup deliberately uses 128K to fit the 48 GB machine with Metal offload and the draft model. The publisher's block-FP8 runtime targets CUDA/vLLM; the Mac serves a locally converted Q6_K artifact, not the original FP8 tensors.

Qwen's published comparisons put the unquantized model in the same broad capability class as Opus 4.6 Max, but benchmark results vary by task and harness. Local Q6 quantization and a 128K context limit are practical compromises for a 48 GB Mac and may reduce quality relative to Qwen's reference setup.
