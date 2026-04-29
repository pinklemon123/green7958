const tokenKey = "greenparty-admin-token";
const loginForm = document.querySelector("#adminLoginForm");
const loginMessage = document.querySelector("#adminLoginMessage");
const dashboard = document.querySelector("#adminDashboard");
const adminPosts = document.querySelector("#adminPosts");
const adminGalleries = document.querySelector("#adminGalleries");
const saveGalleries = document.querySelector("#saveGalleries");
const adminLogout = document.querySelector("#adminLogout");

let adminToken = localStorage.getItem(tokenKey) || "";
let galleriesState = {};

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`,
  };
}

async function adminRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(adminToken ? adminHeaders() : { "Content-Type": "application/json" }),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function showMessage(text) {
  if (loginMessage) loginMessage.textContent = text;
}

async function loadDashboard() {
  if (!adminToken) return;
  try {
    const data = await adminRequest("/api/admin/dashboard");
    loginForm.hidden = true;
    dashboard.hidden = false;
    renderPosts(data.posts || []);
    galleriesState = data.galleries || {};
    renderGalleries(galleriesState);
  } catch (error) {
    localStorage.removeItem(tokenKey);
    adminToken = "";
    loginForm.hidden = false;
    dashboard.hidden = true;
    showMessage(error.message);
  }
}

function renderPosts(posts) {
  adminPosts.innerHTML = posts.length
    ? posts
        .map(
          (post) => `
            <article class="admin-row" data-id="${post.id}">
              <div>
                <strong>${post.title}</strong>
                <p>${post.type || post.category} · ${post.author || "未知作者"} · ${post.reads || 0} 阅读</p>
              </div>
              <div class="admin-actions">
                <a class="secondary-button" href="post.html?id=${encodeURIComponent(post.id)}" target="_blank">查看</a>
                <button class="secondary-button" type="button" data-edit="${post.id}">改图</button>
                <button class="secondary-button danger" type="button" data-delete="${post.id}">删除</button>
              </div>
            </article>
          `,
        )
        .join("")
    : '<div class="empty-state">暂无文章。</div>';
}

function renderGalleries(galleries) {
  adminGalleries.innerHTML = Object.entries(galleries)
    .map(
      ([section, items]) => `
        <section class="admin-panel gallery-section" data-section="${section}">
          <h3>${section}</h3>
          ${(items || [])
            .map(
              (item, index) => `
                <div class="gallery-admin-card" data-index="${index}">
                  <img src="${item.image}" alt="${item.title}" />
                  <label>标题<input data-field="title" value="${item.title || ""}" /></label>
                  <label>标签<input data-field="label" value="${item.label || ""}" /></label>
                  <label>图片 URL<input data-field="image" value="${item.image || ""}" /></label>
                  <label>来源<input data-field="source" value="${item.source || ""}" /></label>
                </div>
              `,
            )
            .join("")}
        </section>
      `,
    )
    .join("");
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  try {
    const data = await adminRequest("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        username: String(formData.get("username") || ""),
        password: String(formData.get("password") || ""),
      }),
    });
    adminToken = data.token;
    localStorage.setItem(tokenKey, adminToken);
    showMessage("登录成功。");
    await loadDashboard();
  } catch (error) {
    showMessage(error.message);
  }
});

adminPosts?.addEventListener("click", async (event) => {
  const deleteId = event.target.dataset.delete;
  const editId = event.target.dataset.edit;
  if (deleteId) {
    if (!confirm("确定删除这篇文章吗？")) return;
    await adminRequest(`/api/admin/posts/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
    await loadDashboard();
  }
  if (editId) {
    const image = prompt("输入新的封面图片 URL");
    if (!image) return;
    await adminRequest(`/api/admin/posts/${encodeURIComponent(editId)}`, {
      method: "PUT",
      body: JSON.stringify({ image }),
    });
    await loadDashboard();
  }
});

saveGalleries?.addEventListener("click", async () => {
  const next = {};
  document.querySelectorAll(".gallery-section").forEach((sectionNode) => {
    const section = sectionNode.dataset.section;
    next[section] = [];
    sectionNode.querySelectorAll(".gallery-admin-card").forEach((card) => {
      const item = {};
      card.querySelectorAll("[data-field]").forEach((input) => {
        item[input.dataset.field] = input.value.trim();
      });
      next[section].push(item);
    });
  });
  await adminRequest("/api/admin/galleries", {
    method: "PUT",
    body: JSON.stringify({ galleries: next }),
  });
  galleriesState = next;
  renderGalleries(galleriesState);
  showMessage("图片已保存。");
});

adminLogout?.addEventListener("click", () => {
  localStorage.removeItem(tokenKey);
  adminToken = "";
  loginForm.hidden = false;
  dashboard.hidden = true;
});

loadDashboard();
