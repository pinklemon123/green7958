import http from "http";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import vm from "vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;
const dbPath = process.env.DB_FILE ? path.resolve(process.env.DB_FILE) : path.join(root, "db.json");
const port = Number(process.env.PORT || 3000);
const maxBodySize = 8 * 1024 * 1024;
const adminUser = process.env.ADMIN_USER || "adminxxx";
const adminPassword = process.env.ADMIN_PASSWORD || "2430350396";
const adminTokens = new Set();
let pgClient = null;

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

function loadSeedData() {
  try {
    const code = fs.readFileSync(path.join(root, "data.js"), "utf8");
    const sandbox = { window: {} };
    vm.runInNewContext(code, sandbox);
    return sandbox.window.siteData || { posts: [], galleries: {}, comments: {} };
  } catch {
    return { posts: [], galleries: {}, comments: {} };
  }
}

function initialDb() {
  const seed = loadSeedData();
  return {
    users: [],
    posts: seed.posts || [],
    galleries: seed.galleries || {},
    comments: seed.comments || {},
    reactions: {},
    favorites: {},
  };
}

function normalizeDb(db) {
  const seed = loadSeedData();
  return {
    users: db.users || [],
    posts: db.posts?.length ? db.posts : seed.posts || [],
    galleries: db.galleries || seed.galleries || {},
    comments: db.comments || seed.comments || {},
    reactions: db.reactions || {},
    favorites: db.favorites || {},
  };
}

async function initPostgres() {
  if (!process.env.DATABASE_URL) return;
  const { Client } = await import("pg");
  pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  await pgClient.connect();
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const result = await pgClient.query("SELECT data FROM app_state WHERE id = 1");
  if (!result.rowCount) {
    await pgClient.query("INSERT INTO app_state (id, data) VALUES (1, $1)", [initialDb()]);
  }
}

async function readDb() {
  if (pgClient) {
    const result = await pgClient.query("SELECT data FROM app_state WHERE id = 1");
    return normalizeDb(result.rows[0]?.data || initialDb());
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(initialDb(), null, 2));
  }
  return normalizeDb(JSON.parse(fs.readFileSync(dbPath, "utf8")));
}

async function writeDb(db) {
  const normalized = normalizeDb(db);
  if (pgClient) {
    await pgClient.query("UPDATE app_state SET data = $1, updated_at = NOW() WHERE id = 1", [normalized]);
    return;
  }
  fs.writeFileSync(dbPath, JSON.stringify(normalized, null, 2));
}

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function requireAdmin(req, res) {
  const token = getBearerToken(req);
  if (!token || !adminTokens.has(token)) {
    sendJson(res, 401, { error: "admin authorization required" });
    return false;
  }
  return true;
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
  const db = await readDb();

  if (req.method === "GET" && url.pathname === "/api/site-data") {
    return sendJson(res, 200, {
      posts: db.posts,
      galleries: db.galleries,
      comments: db.comments,
    });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    const body = await readBody(req);
    if (body.username !== adminUser || body.password !== adminPassword) {
      return sendJson(res, 401, { error: "invalid admin credentials" });
    }
    const token = randomUUID();
    adminTokens.add(token);
    return sendJson(res, 200, { token, user: { name: adminUser } });
  }

  if (req.method === "GET" && url.pathname === "/api/admin/dashboard") {
    if (!requireAdmin(req, res)) return;
    return sendJson(res, 200, {
      posts: db.posts,
      galleries: db.galleries,
      users: db.users.map((user) => ({ id: user.id, name: user.name, createdAt: user.createdAt })),
    });
  }

  const adminPostMatch = url.pathname.match(/^\/api\/admin\/posts\/([^/]+)$/);
  if (req.method === "DELETE" && adminPostMatch) {
    if (!requireAdmin(req, res)) return;
    const id = adminPostMatch[1];
    db.posts = db.posts.filter((post) => post.id !== id);
    delete db.comments[id];
    await writeDb(db);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "PUT" && adminPostMatch) {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const post = db.posts.find((item) => item.id === adminPostMatch[1]);
    if (!post) return sendJson(res, 404, { error: "post not found" });
    Object.assign(post, {
      title: body.title ?? post.title,
      excerpt: body.excerpt ?? post.excerpt,
      content: body.content ?? post.content,
      image: body.image ?? post.image,
      category: body.category ?? post.category,
      type: body.type ?? post.type,
    });
    await writeDb(db);
    return sendJson(res, 200, { post });
  }

  if (req.method === "PUT" && url.pathname === "/api/admin/galleries") {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    if (!body.galleries || typeof body.galleries !== "object") {
      return sendJson(res, 400, { error: "galleries object is required" });
    }
    db.galleries = body.galleries;
    await writeDb(db);
    return sendJson(res, 200, { galleries: db.galleries });
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readBody(req);
    if (!body.name || !body.password) return sendJson(res, 400, { error: "name and password are required" });
    const user = { id: randomUUID(), name: String(body.name), createdAt: new Date().toISOString() };
    db.users.push(user);
    await writeDb(db);
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
    await writeDb(db);
    return sendJson(res, 201, { post });
  }

  const postMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (req.method === "GET" && postMatch) {
    const post = db.posts.find((item) => item.id === postMatch[1]);
    if (!post) return sendJson(res, 404, { error: "post not found" });
    post.reads += 1;
    await writeDb(db);
    return sendJson(res, 200, { post, comments: db.comments[post.id] || [] });
  }

  const reactionMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/reaction$/);
  if (req.method === "POST" && reactionMatch) {
    const body = await readBody(req);
    const post = db.posts.find((item) => item.id === reactionMatch[1]);
    if (!post) return sendJson(res, 404, { error: "post not found" });
    if (body.type === "like") post.likes += 1;
    if (body.type === "dislike") post.dislikes += 1;
    await writeDb(db);
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
    await writeDb(db);
    return sendJson(res, 201, { comment });
  }

  const favoriteMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/favorites$/);
  if (req.method === "POST" && favoriteMatch) {
    const body = await readBody(req);
    const userId = favoriteMatch[1];
    db.favorites[userId] = db.favorites[userId] || [];
    if (body.postId && !db.favorites[userId].includes(body.postId)) db.favorites[userId].push(body.postId);
    await writeDb(db);
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

await initPostgres();

server.listen(port, () => {
  const storage = pgClient ? "PostgreSQL" : `JSON file (${dbPath})`;
  console.log(`Greenparty forum server running at http://localhost:${port}`);
  console.log(`Storage: ${storage}`);
});
