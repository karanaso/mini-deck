import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import http from "node:http";
import test from "node:test";

import { createProxyServer } from "../proxy.mjs";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve) => {
    server.closeAllConnections?.();
    server.close(resolve);
  });
}

function jsonHandler(route) {
  return (request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        route,
        url: request.url,
        xff: request.headers["x-forwarded-for"] ?? null,
      }),
    );
  };
}

test("proxy routes HTTP and WebSocket traffic and forwards client IP", async () => {
  const web = http.createServer(jsonHandler("web"));
  const collab = http.createServer(jsonHandler("collab"));
  let upgradedSocket = null;
  collab.on("upgrade", (request, socket) => {
    const key = request.headers["sec-websocket-key"];
    const accept = createHash("sha1").update(`${key}${WS_GUID}`).digest("base64");
    upgradedSocket = socket;
    socket.write(
      [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${accept}`,
        "",
        "",
      ].join("\r\n"),
    );
  });

  const webPort = await listen(web);
  const collabPort = await listen(collab);
  const proxy = await createProxyServer({
    webPort,
    collabPort,
    listenPort: 0,
    listenHost: "127.0.0.1",
  });

  try {
    const webResponse = await fetch(`http://127.0.0.1:${proxy.port}/api/health`, {
      headers: { "x-forwarded-for": "203.0.113.9" },
    });
    assert.equal(webResponse.status, 200);
    const webBody = await webResponse.json();
    assert.equal(webBody.route, "web");
    assert.match(webBody.xff, /^203\.0\.113\.9/);

    const collabResponse = await fetch(
      `http://127.0.0.1:${proxy.port}/collab/health`,
    );
    assert.equal(collabResponse.status, 200);
    assert.equal((await collabResponse.json()).route, "collab");

    const socket = new WebSocket(`ws://127.0.0.1:${proxy.port}/collab`);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("WebSocket timed out")), 5_000);
      socket.addEventListener("open", () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.addEventListener("error", (event) => {
        clearTimeout(timeout);
        reject(event);
      });
    });
    socket.close();
  } finally {
    upgradedSocket?.destroy();
    await proxy.close();
    await close(web);
    await close(collab);
  }
});

test("proxy returns 502 when the web upstream is unavailable", async () => {
  const web = http.createServer(jsonHandler("web"));
  const webPort = await listen(web);
  await close(web);

  const proxy = await createProxyServer({
    webPort,
    collabPort: 1,
    listenPort: 0,
    listenHost: "127.0.0.1",
  });

  try {
    const response = await fetch(`http://127.0.0.1:${proxy.port}/api/health`);
    assert.equal(response.status, 502);
  } finally {
    await proxy.close();
  }
});
