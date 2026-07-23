const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const port = Number(process.env.WEB_PORT ?? 5173);
const root = path.resolve(__dirname, "../apps/web/dist");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": contentType });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent(
    new URL(req.url ?? "/", `http://localhost:${port}`).pathname
  );
  const target = path.normalize(path.join(root, requestPath));
  const safeTarget =
    target.startsWith(root) && !target.endsWith(path.sep) ? target : path.join(root, "index.html");
  const filePath =
    fs.existsSync(safeTarget) && fs.statSync(safeTarget).isFile()
      ? safeTarget
      : path.join(root, "index.html");

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 500, "Unable to read frontend asset.");
      return;
    }
    send(res, 200, data, contentTypes[path.extname(filePath)] ?? "application/octet-stream");
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Frontend build server listening on http://127.0.0.1:${port}`);
});
