# RunPod deployment

This deployment serves the gated [`orcarouter/Qwen3.8-27B-Uncensored-FP8`](https://huggingface.co/orcarouter/Qwen3.8-27B-Uncensored-FP8) checkpoint with vLLM and connects the local Qwen Code harness through RunPod's HTTPS proxy. Repository tools remain on the local machine. Model prompts and tool results included in the conversation are sent to the Pod.

## Cost and speed

The exact checkpoint occupies 30.9 GB before runtime and KV-cache overhead. The default 128K profile requires at least 48 GB VRAM. The native 262K and extrapolated 1M profiles require an 80 GB GPU.

| GPU | Approximate RunPod Pod price | Expected role |
| --- | ---: | --- |
| A40 48 GB | $0.44/hour | Budget 128K profile, likely 15 to 30 tok/s |
| RTX A6000 48 GB | $0.53/hour | Budget 128K profile, likely 18 to 32 tok/s |
| A100 80 GB | $1.39 to $1.49/hour | 128K or 262K, roughly 35 to 60 tok/s on shorter generations; experimental 1M startup candidate |
| H100 SXM 80 GB | $2.99/hour | 128K or 262K, target 60+ tok/s on shorter generations; experimental 1M startup candidate |

[RunPod prices](https://www.runpod.io/pricing) and speed ranges change with availability, context length, MTP acceptance, and host configuration. The repository includes a benchmark command because the 60 tok/s target cannot be guaranteed before measuring the allocated GPU. The A40 is the closest match to a $0.50/hour budget and can serve the 128K profile, but it is not a 60 tok/s or dependable 262K configuration.

## 1. Create secrets

Create two RunPod secrets in the RunPod console:

- `hf_token`: a read-only Hugging Face token with access to the gated model.
- `qwen_vllm_api_key`: a random API key generated locally with `openssl rand -hex 32`.

Do not put either value in this repository or directly in the Pod template.

## 2. Create the template

Create a private [RunPod Pod template](https://docs.runpod.io/pods/templates/create-custom-template). The pinned image is vLLM `v0.24.0`, the version verified by the model publisher. Configure one HTTP port, `8000`, and retain the 80 GB persistent volume mounted at `/workspace`.

Use the default 131,072-token profile on a 48 GB or 80 GB GPU:

After creating the two RunPod secrets, the repository can create the private template through RunPod's API. The account API key is read without echo and is not stored:

```sh
make create-runpod-template
```

Use the native 262,144-token profile only on an A100 80 GB or H100 80 GB:

```sh
make create-runpod-template RUNPOD_PROFILE=262k
```

Use the extrapolated 1,000,000-token profile only on an 80 GB GPU and validate that vLLM reaches its ready state before configuring a client:

```sh
make create-runpod-template-1m
```

The checkpoint declares `max_position_embeddings=262144`. The 1M template opts into vLLM's long-length override with `VLLM_ALLOW_LONG_MAX_MODEL_LEN=1`; it is not a native model configuration. Its full-window FP8 KV cache is estimated at approximately 30.5 GiB before model and runtime memory, so capacity is plausible on 80 GB but not guaranteed on every host. Qwen Code uses the matching 1,000,000-token client window and a 0.95 automatic compaction threshold, targeting compaction at 950,000 tokens.

The first start downloads about 31 GB from Hugging Face. The persistent volume keeps the Hugging Face cache across Pod restarts. Wait for the Pod logs to report that the OpenAI-compatible server is listening on port 8000.

Deploy the 128K template with an A40 or RTX A6000 for the budget profile. Use an A100 80 GB or H100 SXM 80 GB for the 262K template or experimental 1M startup test. The H100 is the appropriate choice when the 60 tok/s target matters more than hourly cost.

## 3. Install the local client

The client-only installation does not download local model weights:

```sh
corepack enable
corepack prepare pnpm@10.30.2 --activate
make install-runpod-client
```

Get the Pod ID from RunPod and configure the HTTPS endpoint. The command prompts for the same value stored in `qwen_vllm_api_key` and saves it to the ignored `.env.runpod` file with mode `0600`.

```sh
bin/configure-runpod https://POD_ID-8000.proxy.runpod.net
```

For a Pod created from the 262K template, select the matching local profile:

```sh
bin/configure-runpod https://POD_ID-8000.proxy.runpod.net 262k
```

For a Pod that has successfully started from the 1M template, select the matching extrapolated profile:

```sh
bin/configure-runpod https://POD_ID-8000.proxy.runpod.net 1m
```

Run the agent from any authorized repository:

```sh
cd /path/to/repository
qwen-runpod-uncensored
```

For explicitly authorized testing that requires direct public-network access, use the separate opt-in launcher. It runs repository tools directly on the local host with normal approval prompts and leaves the restricted launcher unchanged:

```sh
qwen-runpod-unrestricted
```

Measure end-to-end speed:

```sh
bin/runpod-benchmark
```

## Security boundaries

- vLLM `v0.24.0` is pinned because it contains the [API-authentication bypass fix](https://github.com/vllm-project/vllm/security/advisories/GHSA-94f4-hr76-p5j6) released in vLLM `0.22.0`.
- The endpoint is publicly routable through RunPod's HTTPS proxy, so the vLLM API key is mandatory.
- Qwen Code talks only to a localhost proxy. That proxy accepts only loopback clients and `/v1/` model routes, injects the API key, and rejects general outbound proxy traffic.
- Qwen, Hugging Face, and vLLM telemetry are disabled. vLLM request and access logging are disabled.
- RunPod remains the infrastructure provider and can access workload data at the infrastructure layer. Do not send production secrets, credentials, customer data, or regulated data without an approved cloud-data path.
- The RunPod HTTP proxy has a 100-second connection limit. Large prefills can exceed it even when the GPU has enough memory. Context capacity does not guarantee that a near-full prompt can complete through this endpoint; this risk is highest for the extrapolated 1M profile.
- Stop the Pod when it is idle. Persistent volume storage continues to incur storage charges.
