import http from "node:http";
import https from "node:https";

const apiKey = process.env.LOCAL_QWEN_API_KEY;
const baseUrl = process.env.QWEN_RUNPOD_BASE_URL;
let remote;

try {
  remote = new URL(baseUrl);
} catch {
  process.exit(78);
}

if (
  !apiKey ||
  remote.protocol !== "https:" ||
  remote.port ||
  remote.pathname !== "/" ||
  !/^[a-z0-9-]+-8000\.proxy\.runpod\.net$/.test(remote.hostname)
) {
  process.exit(78);
}

const loopbackAddresses = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function reject(response, statusCode, message) {
  response.writeHead(statusCode, { "content-type": "text/plain" });
  response.end(message);
}

const server = http.createServer((request, response) => {
  if (!loopbackAddresses.has(request.socket.remoteAddress)) {
    reject(response, 403, "proxy client denied");
    return;
  }
  if (request.url === "/") {
    reject(response, 200, "ok");
    return;
  }
  if (
    !["GET", "POST"].includes(request.method) ||
    !request.url.startsWith("/v1/") ||
    request.url.includes("://")
  ) {
    reject(response, 403, "proxy target denied");
    return;
  }

  const headers = {
    ...request.headers,
    authorization: `Bearer ${apiKey}`,
    host: remote.host
  };
  for (const name of [
    "connection",
    "cookie",
    "forwarded",
    "proxy-authorization",
    "proxy-connection",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto"
  ]) {
    delete headers[name];
  }

  const upstream = https.request(
    {
      hostname: remote.hostname,
      port: 443,
      method: request.method,
      path: request.url,
      headers
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    }
  );

  upstream.setTimeout(1800000, () => upstream.destroy(new Error("upstream timeout")));
  upstream.on("error", () => {
    if (response.headersSent) {
      response.destroy();
      return;
    }
    reject(response, 502, "RunPod model unavailable");
  });
  request.on("aborted", () => upstream.destroy());
  request.pipe(upstream);
});

server.on("connect", (_request, socket) => {
  socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
});

server.listen(8877, "::");

process.on("SIGTERM", () => server.close());
