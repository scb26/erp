const http = require("http");
const fs = require("fs");
const path = require("path");

const host = "0.0.0.0";
const port = 8080;
const root = __dirname;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json"
};

function send(res, statusCode, body, contentType) {
  res.writeHead(statusCode, {
    "Cache-Control": "no-cache",
    "Content-Type": contentType
  });
  res.end(body);
}

function resolveFilePath(urlPath) {
  const requestPath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const normalizedPath = path.normalize(requestPath === "/" ? "/index.html" : requestPath);
  const relativePath = normalizedPath.replace(/^(\.\.[\\/])+/, "").replace(/^[/\\]+/, "");
  return path.join(root, relativePath);
}

const server = http.createServer((req, res) => {
  let filePath = resolveFilePath(req.url);

  fs.stat(filePath, (statError, stats) => {
    if (!statError && stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (readError, content) => {
      if (readError) {
        send(res, 404, "Not found", "text/plain; charset=utf-8");
        return;
      }

      send(
        res,
        200,
        content,
        mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
      );
    });
  });
});

server.listen(port, host, () => {
  console.log(`Frontend running on http://localhost:${port}`);
});
