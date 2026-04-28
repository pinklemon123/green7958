import http from "http";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;
const dbPath = path.join(root, "db.json");
const port = Number(process.env.PORT || 3000);
const maxBodySize = 8 * 1024 * 1024;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function initialDb() {
  return {
    users: [],
    posts: [],
    comments: {},
    reactions: {},
    favorites: {},
  };
}

function readDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(initialDb(), null, 2));
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBodySize) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, requested));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const db = readDb();

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readBody(req);
    if (!body.name || !body.password) return sendJson(res, 400, { error: "name and password are required" });
    const user = { id: randomUUID(), name: String(body.name), createdAt: new Date().toISOString() };
    db.users.push(user);
    writeDb(db);
    return sendJson(res, 200, { user });
  }

  if (req.method === "GET" && url.pathname === "/api/posts") {
    return sendJson(res, 200, { posts: db.posts });
  }

  if (req.method === "POST" && url.pathname === "/api/posts") {
    const body = await readBody(req);
    if (!body.title || !body.content || !body.category || !body.author) {
      return sendJson(res, 400, { error: "title, content, category and author are required" });
    }
    const post = {
      id: randomUUID(),
      title: String(body.title),
      category: String(body.category),
      type: String(body.type || body.category),
      author: String(body.author),
      excerpt: String(body.excerpt || "").slice(0, 240),
      content: String(body.content),
      image: String(body.image || ""),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      likes: 0,
      dislikes: 0,
      replies: 0,
      reads: 0,
      depth: 30,
      createdAt: new Date().toISOString(),
    };
    db.posts.unshift(post);
    writeDb(db);
    return sendJson(res, 201, { post });
  }

  const postMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (req.method === "GET" && postMatch) {
    const post = db.posts.find((item) => item.id === postMatch[1]);
    if (!post) return sendJson(res, 404, { error: "post not found" });
    post.reads += 1;
    writeDb(db);
    return sendJson(res, 200, { post, comments: db.comments[post.id] || [] });
  }

  const reactionMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/reaction$/);
  if (req.method === "POST" && reactionMatch) {
    const body = await readBody(req);
    const post = db.posts.find((item) => item.id === reactionMatch[1]);
    if (!post) return sendJson(res, 404, { error: "post not found" });
    if (body.type === "like") post.likes += 1;
    if (body.type === "dislike") post.dislikes += 1;
    writeDb(db);
    return sendJson(res, 200, { likes: post.likes, dislikes: post.dislikes });
  }

  const commentMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);
  if (req.method === "POST" && commentMatch) {
    const body = await readBody(req);
    if (!body.text) return sendJson(res, 400, { error: "text is required" });
    const comment = {
      id: randomUUID(),
      author: String(body.author || "匿名读者"),
      text: String(body.text),
      createdAt: new Date().toISOString(),
    };
    db.comments[commentMatch[1]] = db.comments[commentMatch[1]] || [];
    db.comments[commentMatch[1]].push(comment);
    writeDb(db);
    return sendJson(res, 201, { comment });
  }

  const favoriteMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/favorites$/);
  if (req.method === "POST" && favoriteMatch) {
    const body = await readBody(req);
    const userId = favoriteMatch[1];
    db.favorites[userId] = db.favorites[userId] || [];
    if (body.postId && !db.favorites[userId].includes(body.postId)) db.favorites[userId].push(body.postId);
    writeDb(db);
    return sendJson(res, 200, { favorites: db.favorites[userId] });
  }

  sendJson(res, 404, { error: "api route not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`Greenparty forum server running at http://localhost:${port}`);
});
