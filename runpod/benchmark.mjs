const baseUrl = process.env.QWEN_RUNPOD_BASE_URL;
const apiKey = process.env.LOCAL_QWEN_API_KEY;

if (!baseUrl || !apiKey) {
  process.exit(78);
}

const started = performance.now();
const response = await fetch(`${baseUrl}/v1/chat/completions`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    model: "qwen3.8-27b-uncensored-research-local",
    messages: [
      {
        role: "user",
        content: "Write a detailed numbered list of software reliability practices. Continue until the response limit."
      }
    ],
    max_tokens: 512,
    temperature: 0.6,
    stream: true,
    stream_options: {
      include_usage: true
    }
  })
});

if (!response.ok) {
  const result = await response.json();
  process.stderr.write(`${result.error?.message ?? `HTTP ${response.status}`}\n`);
  process.exit(1);
}

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
let completionTokens;
let firstTokenAt;

while (true) {
  const { done, value } = await reader.read();
  buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.startsWith("data: ") || line === "data: [DONE]") {
      continue;
    }
    const event = JSON.parse(line.slice(6));
    const delta = event.choices?.[0]?.delta;
    if (
      !firstTokenAt &&
      delta &&
      Object.entries(delta).some(
        ([name, value]) => name !== "role" && value !== null && value !== "" && value !== undefined
      )
    ) {
      firstTokenAt = performance.now();
    }
    if (Number.isFinite(event.usage?.completion_tokens)) {
      completionTokens = event.usage.completion_tokens;
    }
  }
  if (done) {
    break;
  }
}

const finishedAt = performance.now();
if (!Number.isFinite(completionTokens) || completionTokens < 1) {
  process.stderr.write("Response did not include completion token usage.\n");
  process.exit(1);
}
if (!firstTokenAt) {
  process.stderr.write("Response did not include a generated token.\n");
  process.exit(1);
}

const timeToFirstTokenSeconds = (firstTokenAt - started) / 1000;
const generationSeconds = (finishedAt - firstTokenAt) / 1000;
process.stdout.write(`Completion tokens: ${completionTokens}\n`);
process.stdout.write(`Time to first token: ${timeToFirstTokenSeconds.toFixed(2)} seconds\n`);
process.stdout.write(`Decode time: ${generationSeconds.toFixed(2)} seconds\n`);
process.stdout.write(`Generation: ${(completionTokens / generationSeconds).toFixed(2)} tokens/second\n`);
