const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const ROOT = __dirname;
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 8765);
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_LINES = 1000;
const MAX_POINTS_PER_LINE = 5000;
const MAX_TOTAL_POINTS = 100000;
const MAX_DIMENSION = 8192;
const ROOT_FILES = new Set(["index.html", "frame.js", "app.js", "style.css"]);
let tempSequence = 0;

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(body));
}

function validateFeedback(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Expected a JSON object";
  if (typeof value.design !== "string" || value.design.length > 64 || !/^[a-z0-9-]+$/.test(value.design)) {
    return "Invalid design id";
  }
  if (!Number.isInteger(value.width) || value.width < 1 || value.width > MAX_DIMENSION ||
      !Number.isInteger(value.height) || value.height < 1 || value.height > MAX_DIMENSION) {
    return "Invalid design dimensions";
  }
  if (!Array.isArray(value.lines) || value.lines.length > MAX_LINES) return "Invalid feedback lines";

  const margin = Math.max(value.width, value.height);
  const minX = -margin;
  const maxX = value.width + margin;
  const minY = -margin;
  const maxY = value.height + margin;
  let totalPoints = 0;
  for (const stroke of value.lines) {
    if (!Array.isArray(stroke) || stroke.length < 1 || stroke.length > MAX_POINTS_PER_LINE) {
      return "Invalid stroke";
    }
    totalPoints += stroke.length;
    if (totalPoints > MAX_TOTAL_POINTS) return "Too many feedback points";
    for (const point of stroke) {
      if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) {
        return "Invalid feedback point";
      }
      if (point[0] < minX || point[0] > maxX || point[1] < minY || point[1] > maxY) {
        return "Feedback point is outside the allowed canvas margin";
      }
    }
  }
  return null;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let oversized = false;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        oversized = true;
        chunks.length = 0;
      } else if (!oversized) {
        chunks.push(chunk);
      }
    });
    request.on("end", () => {
      if (oversized) resolve({error: "Request body is too large"});
      else resolve({text: Buffer.concat(chunks).toString("utf8")});
    });
    request.on("aborted", () => reject(new Error("Request body was interrupted")));
    request.on("error", reject);
  });
}

function withinDirectory(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function staticFile(relativePath) {
  const parts = relativePath.split("/").filter(Boolean);
  if (!parts.length) return "index.html";
  if (parts[0] === "feedback") return null;
  if (parts.length === 1 && ROOT_FILES.has(parts[0])) return parts[0];
  if (parts.length === 2 && parts[0] === "examples" && /^[a-z0-9-]+\.js$/.test(parts[1])) return path.join("examples", parts[1]);
  if (parts.length === 2 && parts[0] === "assets" && /^[a-z0-9-]+\.(png|jpg|jpeg|webp|svg)$/.test(parts[1])) return path.join("assets", parts[1]);
  return null;
}

function contentType(filename) {
  if (filename.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filename.endsWith(".css")) return "text/css; charset=utf-8";
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  if (filename.endsWith(".webp")) return "image/webp";
  if (filename.endsWith(".svg")) return "image/svg+xml";
  return "text/html; charset=utf-8";
}

function createFrameServer({root = ROOT, feedbackDir = path.join(root, "feedback")} = {}) {
  const rootPath = path.resolve(root);
  const feedbackPath = path.resolve(feedbackDir);
  const writeQueues = new Map();

  async function writeFeedback(value) {
    const previous = writeQueues.get(value.design) || Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      await fs.promises.mkdir(feedbackPath, {recursive: true});
      const target = path.join(feedbackPath, `${value.design}.json`);
      const temporary = path.join(feedbackPath, `.${value.design}.${process.pid}.${++tempSequence}.tmp`);
      try {
        await fs.promises.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {flag: "wx"});
        await fs.promises.rename(temporary, target);
      } catch (error) {
        await fs.promises.unlink(temporary).catch(() => {});
        throw error;
      }
    });
    writeQueues.set(value.design, next);
    try {
      await next;
    } finally {
      if (writeQueues.get(value.design) === next) writeQueues.delete(value.design);
    }
  }

  async function handleFeedback(request, response, url) {
    if (url.pathname !== "/api/feedback") return false;
    if (request.method !== "POST") {
      json(response, 405, {error: "Method not allowed"});
      return true;
    }
    const contentTypeHeader = (request.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
    if (contentTypeHeader !== "application/json") {
      json(response, 415, {error: "Content-Type must be application/json"});
      return true;
    }
    const origin = request.headers.origin;
    if (origin) {
      try {
        if (new URL(origin).host !== request.headers.host) {
          json(response, 403, {error: "Cross-origin requests are not allowed"});
          return true;
        }
      } catch {
        json(response, 403, {error: "Invalid request origin"});
        return true;
      }
    }
    const declaredSize = Number(request.headers["content-length"] || 0);
    if (declaredSize > MAX_BODY_BYTES) {
      request.resume();
      json(response, 413, {error: "Request body is too large"});
      return true;
    }

    let body;
    try {
      body = await readJsonBody(request);
    } catch {
      json(response, 400, {error: "Could not read request body"});
      return true;
    }
    if (body.error) {
      json(response, 413, {error: body.error});
      return true;
    }
    let value;
    try {
      value = JSON.parse(body.text);
    } catch {
      json(response, 400, {error: "Malformed JSON"});
      return true;
    }
    const validationError = validateFeedback(value);
    if (validationError) {
      json(response, 400, {error: validationError});
      return true;
    }
    const feedback = {design: value.design, width: value.width, height: value.height, lines: value.lines};
    try {
      await writeFeedback(feedback);
      json(response, 201, {ok: true, design: feedback.design});
    } catch {
      json(response, 500, {error: "Could not save feedback"});
    }
    return true;
  }

  return http.createServer(async (request, response) => {
    const host = request.headers.host || `${HOST}:${PORT}`;
    let url;
    try {
      url = new URL(request.url, `http://${host}`);
    } catch {
      json(response, 400, {error: "Invalid request URL"});
      return;
    }
    if (await handleFeedback(request, response, url)) return;
    if (request.method !== "GET" && request.method !== "HEAD") {
      json(response, 405, {error: "Method not allowed"});
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      json(response, 400, {error: "Invalid URL encoding"});
      return;
    }
    if (pathname.split("/").includes("feedback")) {
      json(response, 403, {error: "Feedback files are not served"});
      return;
    }
    const relative = staticFile(pathname);
    if (!relative) {
      json(response, 404, {error: "Not found"});
      return;
    }
    const filename = path.resolve(rootPath, relative);
    if (!withinDirectory(rootPath, filename)) {
      json(response, 403, {error: "Path is outside the workspace"});
      return;
    }
    fs.readFile(filename, (error, data) => {
      if (error) {
        json(response, 404, {error: "Not found"});
        return;
      }
      response.writeHead(200, {
        "Content-Type": contentType(filename),
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff"
      });
      if (request.method === "HEAD") response.end();
      else response.end(data);
    });
  });
}

if (require.main === module) {
  const server = createFrameServer();
  server.listen(PORT, HOST, () => console.log(`Frame at http://${HOST}:${PORT}/`));
  server.on("error", (error) => {
    console.error(`Frame server failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {createFrameServer};
