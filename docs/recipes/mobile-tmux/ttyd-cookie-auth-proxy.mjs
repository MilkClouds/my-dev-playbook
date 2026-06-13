#!/usr/bin/env node
import http from "node:http";
import net from "node:net";
import crypto from "node:crypto";

const listenHost = process.env.LISTEN_HOST || "127.0.0.1";
const listenPort = Number(process.env.LISTEN_PORT || "7681");
const targetHost = process.env.TARGET_HOST || "127.0.0.1";
const targetPort = Number(process.env.TARGET_PORT || "7682");
const username = process.env.AUTH_USER || "";
const password = process.env.AUTH_PASS || "";
const cookieName = process.env.COOKIE_NAME || "ttyd_auth";
const secret = process.env.AUTH_SECRET || crypto.randomBytes(32).toString("hex");

if (!username || !password) {
  console.error("AUTH_USER and AUTH_PASS are required");
  process.exit(2);
}

function timingSafeEqualString(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function sign(value) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function cookieValue() {
  const value = `${username}:${password}`;
  return `${Buffer.from(value).toString("base64url")}.${sign(value)}`;
}

function hasValidCookie(req) {
  const cookies = req.headers.cookie || "";
  const match = cookies.match(new RegExp(`(?:^|; )${cookieName}=([^;]+)`));
  if (!match) return false;
  const [encoded, mac] = decodeURIComponent(match[1]).split(".");
  if (!encoded || !mac) return false;

  let value;
  try {
    value = Buffer.from(encoded, "base64url").toString();
  } catch {
    return false;
  }

  return value === `${username}:${password}` && timingSafeEqualString(mac, sign(value));
}

function hasValidBasicAuth(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;

  let decoded;
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString();
  } catch {
    return false;
  }

  return timingSafeEqualString(decoded, `${username}:${password}`);
}

function isAuthorized(req) {
  return hasValidCookie(req) || hasValidBasicAuth(req);
}

function sendAuthRequired(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="ttyd"',
    "Content-Type": "text/plain; charset=utf-8",
  });
  res.end("Authentication required\n");
}

function setAuthCookie(headers) {
  headers["Set-Cookie"] = `${cookieName}=${encodeURIComponent(cookieValue())}; Path=/; HttpOnly; SameSite=Lax`;
}

const server = http.createServer((req, res) => {
  const basicAuthOk = hasValidBasicAuth(req);
  if (!basicAuthOk && !hasValidCookie(req)) {
    sendAuthRequired(res);
    return;
  }

  const upstream = http.request({
    host: targetHost,
    port: targetPort,
    method: req.method,
    path: req.url,
    headers: {
      ...req.headers,
      host: `${targetHost}:${targetPort}`,
    },
  }, (upstreamRes) => {
    const headers = { ...upstreamRes.headers };
    if (basicAuthOk) setAuthCookie(headers);
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.statusMessage, headers);
    upstreamRes.pipe(res);
  });

  upstream.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Upstream error: ${err.message}\n`);
  });

  req.pipe(upstream);
});

server.on("upgrade", (req, socket, head) => {
  if (!isAuthorized(req)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm=\"ttyd\"\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }

  const upstream = net.connect(targetPort, targetHost, () => {
    const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const name = req.rawHeaders[i];
      const value = req.rawHeaders[i + 1];
      if (name.toLowerCase() === "host") {
        lines.push(`Host: ${targetHost}:${targetPort}`);
      } else {
        lines.push(`${name}: ${value}`);
      }
    }

    upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  upstream.on("error", () => {
    socket.destroy();
  });
});

server.listen(listenPort, listenHost, () => {
  console.log(`auth proxy listening on http://${listenHost}:${listenPort} -> http://${targetHost}:${targetPort}`);
});
