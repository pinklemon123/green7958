const data = window.siteData || { posts: [], galleries: {}, comments: {} };
const page = document.body.dataset.page || "home";
const searchInput = document.querySelector("#siteSearch");
const menuButton = document.querySelector("#menuButton");
const closeMenu = document.querySelector("#closeMenu");
const siteMenu = document.querySelector("#siteMenu");
const menuOverlay = document.querySelector("#menuOverlay");
const tabs = document.querySelectorAll(".tab");
const sortSelect = document.querySelector("#sortSelect");
const themeButtons = document.querySelectorAll("[data-theme-choice]");
const loginMenuButton = document.querySelector("#loginMenuButton");
const loginForm = document.querySelector("#loginForm");
const userStatus = document.querySelector("#userStatus");
const loginName = document.querySelector("#loginName");
const logoutButton = document.querySelector("#logoutButton");
const maxFileSize = 5 * 1024 * 1024;

let activeFilter = "all";
let currentUser = null;

function storageGet(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function loadApiData() {
  try {
    const response = await fetch("/api/site-data");
    if (!response.ok) return;
    const apiData = await response.json();
    if (Array.isArray(apiData.posts)) data.posts = apiData.posts;
    if (apiData.galleries) data.galleries = apiData.galleries;
    if (apiData.comments) data.comments = apiData.comments;
  } catch {
    // File preview or offline mode keeps using data.js and localStorage.
  }
}

function getAllPosts() {
  return [...data.posts, ...storageGet("greenparty-posts", [])];
}

function getPostById(id) {
  return getAllPosts().find((post) => post.id === id);
}

function getCategoryLabel(category) {
  return (
    {
      discussion: "讨论广场",
      research: "研究札记",
      daily: "日常文章",
      translation: "翻译计划",
    }[category] || "讨论"
  );
}

function getCategoryUrl(category) {
  return (
    {
      discussion: "discussion.html",
      research: "research.html",
      daily: "articles.html",
      translation: "translation.html",
    }[category] || "discussion.html"
  );
}

function loadTheme() {
  const savedTheme = localStorage.getItem("greenparty-theme") || "light";
  document.documentElement.dataset.theme = savedTheme;
  themeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.themeChoice === savedTheme);
  });
}

function setTheme(theme) {
  localStorage.setItem("greenparty-theme", theme);
  document.documentElement.dataset.theme = theme;
  themeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.themeChoice === theme);
  });
}

function loadUser() {
  currentUser = storageGet("greenparty-user", null);
  renderUser();
}

function renderUser() {
  if (!loginMenuButton || !userStatus) return;
  if (currentUser?.name) {
    loginMenuButton.textContent = "个人登录页";
    loginMenuButton.setAttribute("href", "login.html");
    userStatus.textContent = `当前用户：${currentUser.name}`;
    return;
  }
  loginMenuButton.textContent = "匿名登录";
  loginMenuButton.setAttribute("href", "login.html");
  userStatus.textContent = "未登录";
}

function textMatches(post, query) {
  if (!query) return true;
  const text = `${post.title} ${post.type} ${post.author} ${post.excerpt}`.toLowerCase();
  return text.includes(query.toLowerCase());
}

function sortPosts(posts) {
  const value = sortSelect?.value || "hot";
  return [...posts].sort((a, b) => {
    if (value === "new") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (value === "deep") return (b.depth || 0) - (a.depth || 0);
    return (b.replies || 0) + (b.reads || 0) / 20 - ((a.replies || 0) + (a.reads || 0) / 20);
  });
}

function postCard(post) {
  return `
    <article class="post-card" data-category="${post.category}">
      <div class="post-topline">
        <span class="post-type">${post.type || getCategoryLabel(post.category)}</span>
        <span class="post-meta">${post.author} · ${post.time || "刚刚"}</span>
      </div>
      <h3>${post.title}</h3>
      <p>${post.excerpt}</p>
      <div class="post-footer">
        <div class="post-stats">
          <span>${post.replies || 0} 回复</span>
          <span>${post.reads || 0} 阅读</span>
          <span>${post.likes || 0} 喜欢</span>
        </div>
        <a class="reply-link" href="post.html?id=${encodeURIComponent(post.id)}">阅读全文</a>
      </div>
    </article>
  `;
}

function renderPostList() {
  const target = document.querySelector("#postList");
  if (!target) return;

  const query = searchInput?.value.trim() || "";
  const posts = sortPosts(
    getAllPosts().filter((post) => {
      const matchesFilter = activeFilter === "all" || post.category === activeFilter;
      return matchesFilter && textMatches(post, query);
    }),
  );

  target.innerHTML = posts.length ? posts.map(postCard).join("") : emptyState("没有找到匹配内容。");
}

function renderContentList() {
  const target = document.querySelector("#contentList");
  if (!target) return;

  const source = target.dataset.source;
  const query = searchInput?.value.trim() || "";
  const posts = getAllPosts().filter((post) => post.category === source && textMatches(post, query));

  target.innerHTML = posts.length ? posts.map(postCard).join("") : emptyState("没有找到匹配内容。");
}

function renderHome() {
  const feature = document.querySelector("#homeFeature");
  const highlights = document.querySelector("#homeHighlights");
  if (!feature || !highlights) return;

  const posts = getAllPosts();
  const featured = posts.find((post) => post.featured) || posts[0];
  feature.innerHTML = `
    <span class="feature-label">本周主帖</span>
    <h2>${featured.title}</h2>
    <p>${featured.excerpt}</p>
    <div class="feature-meta">
      <span>${featured.author}</span>
      <span>${featured.replies || 0} 回复</span>
      <span>${featured.reads || 0} 阅读</span>
    </div>
    <a class="text-link" href="post.html?id=${encodeURIComponent(featured.id)}">阅读全文</a>
  `;

  highlights.innerHTML = sortPosts(posts)
    .slice(0, 3)
    .map(
      (post) => `
        <a class="highlight-card" href="post.html?id=${encodeURIComponent(post.id)}">
          <span>${post.type || getCategoryLabel(post.category)}</span>
          <h3>${post.title}</h3>
          <p>${post.author} · ${post.time || "刚刚"}</p>
        </a>
      `,
    )
    .join("");
}

function galleryCard(item, index) {
  return `
    <article class="media-card" style="--i: ${index}">
      <img src="${item.image}" alt="${item.title}" loading="lazy" />
      <div class="media-glass">
        <span>${item.label}</span>
        <h3>${item.title}</h3>
        <p>${item.source}</p>
      </div>
    </article>
  `;
}

function renderHomeGallery() {
  const target = document.querySelector("#homeGallery");
  if (!target) return;
  target.innerHTML = (data.galleries?.home || []).map(galleryCard).join("");
}

function renderPageGallery() {
  const target = document.querySelector("#pageGallery");
  if (!target) return;
  const key = target.dataset.gallery || page;
  target.innerHTML = (data.galleries?.[key] || []).map(galleryCard).join("");
}

function renderProfile() {
  const profileCard = document.querySelector("#profileCard");
  const myPosts = document.querySelector("#myPosts");
  const favoritePosts = document.querySelector("#favoritePosts");
  const profileForm = document.querySelector("#profileForm");
  const profileName = document.querySelector("#profileName");
  const profileBio = document.querySelector("#profileBio");
  if (!profileCard || !myPosts || !favoritePosts) return;

  if (!currentUser?.name) {
    profileCard.innerHTML = `
      <h2>未登录</h2>
      <p>登录后可以查看自己的发布、收藏，并进入发布界面。</p>
      <a class="primary-button" href="login.html">匿名登录</a>
    `;
    if (profileForm) profileForm.hidden = true;
    myPosts.innerHTML = emptyState("登录后显示你的发布。");
    favoritePosts.innerHTML = emptyState("登录后显示你的收藏。");
    return;
  }

  if (profileForm) profileForm.hidden = false;
  if (profileName) profileName.value = currentUser.name || "";
  if (profileBio) profileBio.value = currentUser.bio || "";

  const posts = getAllPosts();
  const localPosts = storageGet("greenparty-posts", []).filter((post) => post.author === currentUser.name);
  const favoriteIds = storageGet("greenparty-favorites", []);
  const favorites = posts.filter((post) => favoriteIds.includes(post.id));

  profileCard.innerHTML = `
    ${
      currentUser.avatar
        ? `<img class="profile-avatar image-avatar" src="${currentUser.avatar}" alt="${currentUser.name} 的头像" />`
        : `<span class="profile-avatar">${currentUser.name.slice(0, 1)}</span>`
    }
    <h2>${currentUser.name}</h2>
    <p>${currentUser.bio || "匿名用户 · 本地会话"}</p>
    <div class="profile-stats">
      <span>${localPosts.length} 发布</span>
      <span>${favorites.length} 收藏</span>
    </div>
    <a class="primary-button" href="publish.html">发布文章</a>
  `;
  myPosts.innerHTML = localPosts.length ? localPosts.map(postCard).join("") : emptyState("还没有发布文章。");
  favoritePosts.innerHTML = favorites.length ? favorites.map(postCard).join("") : emptyState("还没有收藏文章。");
}

function bindProfileForm() {
  const form = document.querySelector("#profileForm");
  const avatarInput = document.querySelector("#avatarInput");
  const notice = document.querySelector("#profileNotice");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser?.name) return;
    const formData = new FormData(form);
    const nextName = String(formData.get("name") || "").trim();
    const bio = String(formData.get("bio") || "").trim();
    const avatarFile = avatarInput?.files?.[0];

    if (!nextName) return;
    if (avatarFile && avatarFile.size > maxFileSize) {
      if (notice) notice.textContent = "头像图片超过 5MB，请重新选择。";
      avatarInput.value = "";
      return;
    }

    currentUser = {
      ...currentUser,
      name: nextName,
      bio,
      avatar: avatarFile ? await readFileAsDataUrl(avatarFile) : currentUser.avatar || "",
      updatedAt: new Date().toISOString(),
    };
    storageSet("greenparty-user", currentUser);
    if (notice) notice.textContent = "资料已保存。";
    renderUser();
    renderProfile();
  });
}

function renderArticle() {
  const articleView = document.querySelector("#articleView");
  if (!articleView) return;

  const id = new URLSearchParams(location.search).get("id") || data.posts[0]?.id;
  const post = getPostById(id);
  if (!post) {
    articleView.innerHTML = emptyState("文章不存在。");
    return;
  }

  const paragraphs = String(post.content || post.excerpt)
    .split("\n")
    .filter(Boolean)
    .map((text) => `<p>${text}</p>`)
    .join("");
  articleView.innerHTML = `
    <header class="article-header">
      <span class="post-type">${post.type || getCategoryLabel(post.category)}</span>
      <h1>${post.title}</h1>
      <p>${post.author} · ${post.time || "刚刚"} · ${post.reads || 0} 阅读</p>
    </header>
    ${post.image ? `<img class="article-cover" src="${post.image}" alt="${post.title}" />` : ""}
    <div class="article-body">${paragraphs}</div>
    ${
      post.attachments?.length
        ? `<div class="attachment-list"><h2>附件</h2>${post.attachments
            .map((file) => `<a href="${file.dataUrl || "#"}" download="${file.name}">${file.name} · ${file.sizeLabel}</a>`)
            .join("")}</div>`
        : ""
    }
  `;
  renderReactions(post);
  renderComments(post.id);
}

function renderReactions(post) {
  const reactionStore = storageGet("greenparty-reactions", {});
  const favoriteIds = storageGet("greenparty-favorites", []);
  const local = reactionStore[post.id] || { likes: 0, dislikes: 0 };
  const likeButton = document.querySelector("#likeButton");
  const dislikeButton = document.querySelector("#dislikeButton");
  const favoriteButton = document.querySelector("#favoriteButton");
  if (!likeButton || !dislikeButton || !favoriteButton) return;
  likeButton.querySelector("span").textContent = (post.likes || 0) + local.likes;
  dislikeButton.querySelector("span").textContent = (post.dislikes || 0) + local.dislikes;
  favoriteButton.textContent = favoriteIds.includes(post.id) ? "已收藏" : "收藏";

  likeButton.onclick = () => {
    submitReaction(post, "like");
  };
  dislikeButton.onclick = () => {
    submitReaction(post, "dislike");
  };
  favoriteButton.onclick = () => {
    const ids = storageGet("greenparty-favorites", []);
    const next = ids.includes(post.id) ? ids.filter((item) => item !== post.id) : [...ids, post.id];
    storageSet("greenparty-favorites", next);
    renderReactions(post);
  };
}

async function submitReaction(post, type) {
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(post.id)}/reaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (response.ok) {
      const result = await response.json();
      post.likes = result.likes;
      post.dislikes = result.dislikes;
      renderReactions(post);
      return;
    }
  } catch {
    // Static file preview keeps the local fallback below.
  }
  if (type === "like") {
    const store = storageGet("greenparty-reactions", {});
    store[post.id] = store[post.id] || { likes: 0, dislikes: 0 };
    store[post.id].likes += 1;
    storageSet("greenparty-reactions", store);
  } else {
    const store = storageGet("greenparty-reactions", {});
    store[post.id] = store[post.id] || { likes: 0, dislikes: 0 };
    store[post.id].dislikes += 1;
    storageSet("greenparty-reactions", store);
  }
  renderReactions(post);
}

function renderComments(postId) {
  const target = document.querySelector("#commentList");
  if (!target) return;
  const localComments = storageGet("greenparty-comments", {});
  const comments = [...(data.comments?.[postId] || []), ...(localComments[postId] || [])];
  target.innerHTML = comments.length
    ? comments
        .map(
          (comment) => `
            <article class="comment-card">
              <strong>${comment.author}</strong>
              <p>${comment.text}</p>
              <span>${comment.time}</span>
            </article>
          `,
        )
        .join("")
    : emptyState("还没有评论。");
}

function bindCommentForm() {
  const form = document.querySelector("#commentForm");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = new URLSearchParams(location.search).get("id") || data.posts[0]?.id;
    const text = String(new FormData(form).get("comment") || "").trim();
    if (!text) return;
    const comments = storageGet("greenparty-comments", {});
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(id)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: currentUser?.name || "匿名读者", text }),
      });
      if (response.ok) {
        const result = await response.json();
        data.comments[id] = data.comments[id] || [];
        data.comments[id].push({
          author: result.comment.author,
          text: result.comment.text,
          time: "刚刚",
        });
        form.reset();
        renderComments(id);
        return;
      }
    } catch {
      // Static file preview keeps the local fallback below.
    }
    comments[id] = comments[id] || [];
    comments[id].push({
      author: currentUser?.name || "匿名读者",
      text,
      time: "刚刚",
    });
    storageSet("greenparty-comments", comments);
    form.reset();
    renderComments(id);
  });
}

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

function openMenu() {
  if (!siteMenu || !menuOverlay || !menuButton) return;
  siteMenu.classList.add("open");
  siteMenu.setAttribute("aria-hidden", "false");
  menuButton.setAttribute("aria-expanded", "true");
  menuOverlay.hidden = false;
}

function closeSiteMenu() {
  if (!siteMenu || !menuOverlay || !menuButton) return;
  siteMenu.classList.remove("open");
  siteMenu.setAttribute("aria-hidden", "true");
  menuButton.setAttribute("aria-expanded", "false");
  menuOverlay.hidden = true;
}

function setActiveMenu() {
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".menu-nav a").forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("active", href === current);
  });
}

function bindPublishForm() {
  const form = document.querySelector("#publishForm");
  const gate = document.querySelector("#publishGate");
  const coverInput = document.querySelector("#coverInput");
  const attachmentInput = document.querySelector("#attachmentInput");
  const coverPreview = document.querySelector("#coverPreview");
  const fileNotice = document.querySelector("#fileNotice");
  if (!form || !gate) return;

  if (!currentUser?.name) {
    gate.innerHTML = '发布文章需要先登录。<a class="text-link" href="login.html">去匿名登录</a>';
    form.hidden = true;
    return;
  }
  gate.hidden = true;
  form.hidden = false;

  coverInput?.addEventListener("change", async () => {
    const file = coverInput.files?.[0];
    if (!file || !coverPreview) return;
    if (file.size > maxFileSize) {
      fileNotice.textContent = "封面图片超过 5MB，请重新选择。";
      coverInput.value = "";
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    coverPreview.hidden = false;
    coverPreview.innerHTML = `<img src="${dataUrl}" alt="封面预览" /><span>${file.name}</span>`;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const coverFile = coverInput?.files?.[0];
    const attachmentFile = attachmentInput?.files?.[0];
    if ((coverFile && coverFile.size > maxFileSize) || (attachmentFile && attachmentFile.size > maxFileSize)) {
      fileNotice.textContent = "图片或附件超过 5MB，请重新选择。";
      return;
    }

    const category = String(formData.get("category"));
    const post = {
      id: `local-${Date.now()}`,
      title: String(formData.get("title")).trim(),
      category,
      type: getCategoryLabel(category),
      author: currentUser.name,
      time: "刚刚",
      createdAt: new Date().toISOString(),
      excerpt: String(formData.get("excerpt")).trim(),
      content: String(formData.get("content")).trim(),
      image: coverFile ? await readFileAsDataUrl(coverFile) : "",
      attachments: attachmentFile
        ? [
            {
              name: attachmentFile.name,
              size: attachmentFile.size,
              sizeLabel: formatFileSize(attachmentFile.size),
              dataUrl: await readFileAsDataUrl(attachmentFile),
            },
          ]
        : [],
      replies: 0,
      reads: 0,
      depth: 30,
      likes: 0,
      dislikes: 0,
    };
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(post),
      });
      if (response.ok) {
        const saved = await response.json();
        window.location.href = `post.html?id=${encodeURIComponent(saved.post.id)}`;
        return;
      }
    } catch {
      // Static file preview keeps the local fallback below.
    }
    const posts = storageGet("greenparty-posts", []);
    posts.unshift(post);
    storageSet("greenparty-posts", posts);
    window.location.href = `post.html?id=${encodeURIComponent(post.id)}`;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(size) {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

menuButton?.addEventListener("click", openMenu);
closeMenu?.addEventListener("click", closeSiteMenu);
menuOverlay?.addEventListener("click", closeSiteMenu);
siteMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeSiteMenu));

themeButtons.forEach((button) => {
  button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
});

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "").trim();
  if (!name || !password) return;
  currentUser = { name, createdAt: new Date().toISOString() };
  storageSet("greenparty-user", currentUser);
  loginForm.reset();
  renderUser();
  window.location.href = "profile.html";
});

logoutButton?.addEventListener("click", () => {
  localStorage.removeItem("greenparty-user");
  currentUser = null;
  renderUser();
  loginName?.focus();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    activeFilter = tab.dataset.filter;
    renderPostList();
  });
});

sortSelect?.addEventListener("change", renderPostList);
searchInput?.addEventListener("input", () => {
  renderHome();
  renderPostList();
  renderContentList();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSiteMenu();
});

async function init() {
  loadTheme();
  loadUser();
  await loadApiData();
  if (page === "login") loginName?.focus();
  setActiveMenu();
  renderHome();
  renderHomeGallery();
  renderPageGallery();
  renderPostList();
  renderContentList();
  renderProfile();
  bindProfileForm();
  renderArticle();
  bindCommentForm();
  bindPublishForm();
}

init();
