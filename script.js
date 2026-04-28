const data = window.siteData || { posts: [] };
const page = document.body.dataset.page || "home";
const searchInput = document.querySelector("#siteSearch");
const menuButton = document.querySelector("#menuButton");
const closeMenu = document.querySelector("#closeMenu");
const siteMenu = document.querySelector("#siteMenu");
const menuOverlay = document.querySelector("#menuOverlay");
const composeButton = document.querySelector("#composeButton");
const closeComposer = document.querySelector("#closeComposer");
const composer = document.querySelector("#composer");
const tabs = document.querySelectorAll(".tab");
const sortSelect = document.querySelector("#sortSelect");

let activeFilter = "all";

function textMatches(post, query) {
  if (!query) return true;
  const text = `${post.title} ${post.type} ${post.author} ${post.excerpt}`.toLowerCase();
  return text.includes(query.toLowerCase());
}

function sortPosts(posts) {
  const value = sortSelect?.value || "hot";
  return [...posts].sort((a, b) => {
    if (value === "new") return data.posts.indexOf(a) - data.posts.indexOf(b);
    if (value === "deep") return b.depth - a.depth;
    return b.replies + b.reads / 20 - (a.replies + a.reads / 20);
  });
}

function postCard(post) {
  return `
    <article class="post-card" data-category="${post.category}">
      <div class="post-topline">
        <span class="post-type">${post.type}</span>
        <span class="post-meta">${post.author} · ${post.time}</span>
      </div>
      <h3>${post.title}</h3>
      <p>${post.excerpt}</p>
      <div class="post-footer">
        <div class="post-stats">
          <span>${post.replies} 回复</span>
          <span>${post.reads} 阅读</span>
          <span>深度 ${post.depth}</span>
        </div>
        <a class="reply-link" href="discussion.html">进入讨论</a>
      </div>
    </article>
  `;
}

function renderPostList() {
  const target = document.querySelector("#postList");
  if (!target) return;

  const query = searchInput?.value.trim() || "";
  const posts = sortPosts(
    data.posts.filter((post) => {
      const matchesFilter = activeFilter === "all" || post.category === activeFilter;
      return matchesFilter && textMatches(post, query);
    }),
  );

  target.innerHTML = posts.length ? posts.map(postCard).join("") : emptyState();
}

function renderContentList() {
  const target = document.querySelector("#contentList");
  if (!target) return;

  const source = target.dataset.source;
  const query = searchInput?.value.trim() || "";
  const posts = data.posts.filter((post) => post.category === source && textMatches(post, query));

  target.innerHTML = posts.length ? posts.map(postCard).join("") : emptyState();
}

function renderHome() {
  const feature = document.querySelector("#homeFeature");
  const highlights = document.querySelector("#homeHighlights");
  if (!feature || !highlights) return;

  const featured = data.posts.find((post) => post.featured) || data.posts[0];
  feature.innerHTML = `
    <span class="feature-label">本周主帖</span>
    <h2>${featured.title}</h2>
    <p>${featured.excerpt}</p>
    <div class="feature-meta">
      <span>${featured.author}</span>
      <span>${featured.replies} 回复</span>
      <span>${featured.reads} 阅读</span>
    </div>
    <a class="text-link" href="discussion.html">查看讨论</a>
  `;

  highlights.innerHTML = sortPosts(data.posts)
    .slice(0, 3)
    .map(
      (post) => `
        <a class="highlight-card" href="${post.category === "daily" ? "articles.html" : post.category === "translation" ? "translation.html" : "research.html"}">
          <span>${post.type}</span>
          <h3>${post.title}</h3>
          <p>${post.author} · ${post.time}</p>
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

function emptyState() {
  return '<div class="empty-state">没有找到匹配内容。</div>';
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

menuButton?.addEventListener("click", openMenu);
closeMenu?.addEventListener("click", closeSiteMenu);
menuOverlay?.addEventListener("click", closeSiteMenu);
siteMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeSiteMenu));

composeButton?.addEventListener("click", () => {
  composer?.classList.add("open");
  composer?.scrollIntoView({ behavior: "smooth", block: "start" });
});

closeComposer?.addEventListener("click", () => {
  composer?.classList.remove("open");
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

setActiveMenu();
renderHome();
renderHomeGallery();
renderPageGallery();
renderPostList();
renderContentList();
