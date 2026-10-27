import http from "node:http";
import { pathToFileURL } from "node:url";

import httpProxy from "http-proxy";

const DEFAULT_WEB_PORT = 3000;
const DEFAULT_COLLAB_PORT = 1234;
const DEFAULT_PROXY_PORT = 8080;

export async function createProxyServer({
  webPort = Number(process.env.WEB_PORT ?? DEFAULT_WEB_PORT),
  collabPort = Number(process.env.COLLAB_PORT ?? DEFAULT_COLLAB_PORT),
  listenPort = Number(process.env.PROXY_PORT ?? DEFAULT_PROXY_PORT),
  listenHost = "0.0.0.0",
} = {}) {
  const proxy = httpProxy.createProxyServer({ xfwd: true });
  const webTarget = `http://127.0.0.1:${webPort}`;
  const collabHttpTarget = `http://127.0.0.1:${collabPort}`;
  const collabWsTarget = `ws://127.0.0.1:${collabPort}`;

  const server = http.createServer((request, response) => {
    const target = isCollabPath(request.url) ? collabHttpTarget : webTarget;
    proxy.web(request, response, { target });
  });

  server.on("upgrade", (request, socket, head) => {
    if (!isCollabPath(request.url)) {
      socket.destroy();
      return;
    }
    proxy.ws(request, socket, head, { target: collabWsTarget });
  });

  proxy.on("error", (error, request, response) => {
    console.error(`[proxy] upstream error for ${request.url}: ${error.message}`);
    if (response && typeof response.writeHead === "function" && !response.headersSent) {
      response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      response.end("Bad gateway");
      return;
    }
    if (response && typeof response.destroy === "function") response.destroy();
  });

  const sockets = new Set();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(listenPort, listenHost, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : listenPort;
  console.log(`[proxy] listening on ${listenHost}:${actualPort}`);

  return {
    server,
    port: actualPort,
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
      if (typeof proxy.close === "function") proxy.close();
    },
  };
}

function isCollabPath(url) {
  return (
    typeof url === "string" &&
    (url === "/collab" || url.startsWith("/collab?") || url.startsWith("/collab/"))
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { close } = await createProxyServer();
  let closing = false;

  async function shutdown(signal) {
    if (closing) return;
    closing = true;
    console.log(`[proxy] shutting down (${signal})`);
    await close();
    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
