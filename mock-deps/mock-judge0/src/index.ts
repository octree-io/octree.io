import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { config } from "./config.js";
import { ALL_STATUSES, LANGUAGES } from "./statuses.js";
import {
  create,
  get,
  has,
  pickFields,
  type CreateBody,
} from "./submissions.js";

// ─── tiny helpers ───────────────────────────────────────────────────────────

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 5_000_000) reject(new Error("payload too large"));
    });
    req.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

// base64_encoded defaults to false in real Judge0.
const isBase64 = (url: URL): boolean => url.searchParams.get("base64_encoded") === "true";

// If auth is configured, require the matching X-Auth-Token header.
function authorized(req: IncomingMessage): boolean {
  if (!config.authToken) return true;
  return req.headers["x-auth-token"] === config.authToken;
}

// ─── routing ────────────────────────────────────────────────────────────────

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://localhost:${config.port}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = req.method ?? "GET";

  if (!authorized(req)) {
    return send(res, 401, { error: "Invalid or missing X-Auth-Token" });
  }

  // Health / info endpoints (handy, and mirror the real service).
  if (method === "GET" && (path === "/" || path === "/about")) {
    return send(res, 200, {
      name: "mock-judge0",
      version: "0.1.0",
      note: "Dummy Judge0 CE mock — returns fake results, executes nothing.",
    });
  }
  if (method === "GET" && path === "/languages") {
    return send(res, 200, LANGUAGES);
  }
  if (method === "GET" && path === "/statuses") {
    return send(res, 200, ALL_STATUSES);
  }

  // POST /submissions  → create and return a token (or the full result if wait=true)
  if (method === "POST" && path === "/submissions") {
    let body: CreateBody;
    try {
      body = (await readJson(req)) as CreateBody;
    } catch (err) {
      return send(res, 400, { error: (err as Error).message });
    }
    if (body.source_code == null) {
      return send(res, 422, { error: "source_code is required" });
    }

    const base64 = isBase64(url);
    const token = create(body, base64);

    // wait=true → resolve synchronously (real Judge0 supports this). Our result
    // is terminal on the first read unless MOCK_PROCESSING_POLLS forces a wait.
    if (url.searchParams.get("wait") === "true") {
      return send(res, 201, get(token, base64));
    }
    return send(res, 201, { token });
  }

  // GET /submissions/:token  → current (dummy) state
  const match = /^\/submissions\/([^/]+)$/.exec(path);
  if (method === "GET" && match) {
    const token = decodeURIComponent(match[1]);
    if (!has(token)) {
      return send(res, 404, { error: "Submission not found" });
    }
    const result = get(token, isBase64(url))!;
    return send(res, 200, pickFields(result, url.searchParams.get("fields")));
  }

  send(res, 404, { error: `No mock route for ${method} ${path}` });
}

// ─── server ─────────────────────────────────────────────────────────────────

const server = createServer((req, res) => {
  route(req, res).catch((err) => {
    console.error("[mock-judge0] handler error:", err);
    if (!res.headersSent) send(res, 500, { error: "Internal mock error" });
  });
});

server.listen(config.port, () => {
  console.log(`[mock-judge0] listening on http://localhost:${config.port}`);
  console.log(
    `[mock-judge0] verdict=${config.verdict} processingPolls=${config.processingPolls}` +
      (config.authToken ? " auth=on" : ""),
  );
  console.log("[mock-judge0] point the worker at it: JUDGE0_URL=http://localhost:" + config.port);
});
