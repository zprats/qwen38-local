import http from "node:http";

const allowedHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const allowedPort = "8001";

function reject(response, statusCode, message) {
  response.writeHead(statusCode, { "content-type": "text/plain" });
  response.end(message);
}

const server = http.createServer((request, response) => {
  const targetsProxy = request.headers.host?.endsWith(":8877");
  if (request.url === "/" && targetsProxy) {
    reject(response, 200, "ok");
    return;
  }

  let target;
  try {
    const value = targetsProxy
      ? new URL(request.url, "http://127.0.0.1:8001").href
      : request.url.startsWith("http://")
      ? request.url
      : `http://${request.headers.host}${request.url}`;
    target = new URL(value);
  } catch {
    reject(response, 400, "invalid proxy target");
    return;
  }

  if (
    target.protocol !== "http:" ||
    !allowedHosts.has(target.hostname) ||
    target.port !== allowedPort
  ) {
    reject(response, 403, "proxy target denied");
    return;
  }

  const headers = { ...request.headers, host: target.host };
  delete headers["proxy-connection"];

  const upstream = http.request(
    {
      hostname: target.hostname,
      port: Number(target.port),
      method: request.method,
      path: `${target.pathname}${target.search}`,
      headers
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    }
  );

  upstream.setTimeout(1800000, () => upstream.destroy(new Error("upstream timeout")));
  upstream.on("error", () => reject(response, 502, "local model unavailable"));
  request.pipe(upstream);
});

server.on("connect", (_request, socket) => {
  socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
});

server.listen(8877, "::");

process.on("SIGTERM", () => server.close());
