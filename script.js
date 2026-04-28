const posts = [
  {
    title: "自由选择为什么总伴随焦虑？",
    category: "research",
    type: "研究讨论",
    author: "林砚",
    time: "18 分钟前",
    excerpt:
      "从萨特的自由概念出发，讨论选择不是从选项中挑一个答案，而是把自己暴露在责任之中。",
    replies: 24,
    reads: 430,
    depth: 92,
  },
  {
    title: "在地铁上重读《西西弗神话》",
    category: "daily",
    type: "日常文章",
    author: "许枝",
    time: "1 小时前",
    excerpt:
      "今天的拥挤和延误反而让“荒诞”变得具体：不是宏大的绝望，而是每一次仍然继续的动作。",
    replies: 18,
    reads: 316,
    depth: 61,
  },
  {
    title: "克尔凯郭尔的信仰跳跃是否能被公共讨论？",
    category: "reading",
    type: "读书笔记",
    author: "周临",
    time: "昨天",
    excerpt:
      "如果信仰的核心是个体无法完全转译的激情，那么论坛中的讨论应该保留怎样的边界？",
    replies: 31,
    reads: 562,
    depth: 88,
  },
  {
    title: "他者的目光与办公室里的自我表演",
    category: "daily",
    type: "日常文章",
    author: "阿澈",
    time: "昨天",
    excerpt:
      "一次会议中的沉默，让我重新理解被观看并不只是羞耻，也可能是自我被固定成角色的瞬间。",
    replies: 12,
    reads: 205,
    depth: 54,
  },
  {
    title: "海德格尔的日常性可以怎样帮助文章写作？",
    category: "research",
    type: "研究讨论",
    author: "闻屿",
    time: "2 天前",
    excerpt:
      "把日常性理解为问题的入口，而不是低一级的经验材料，或许能改善哲学文章的语气。",
    replies: 22,
    reads: 389,
    depth: 79,
  },
];

const postList = document.querySelector("#postList");
const tabs = document.querySelectorAll(".tab");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const composer = document.querySelector("#composer");
const composeButton = document.querySelector("#composeButton");
const closeComposer = document.querySelector("#closeComposer");

let activeFilter = "all";

function sortedPosts(items) {
  const value = sortSelect.value;
  return [...items].sort((a, b) => {
    if (value === "new") {
      return posts.indexOf(a) - posts.indexOf(b);
    }
    if (value === "deep") {
      return b.depth - a.depth;
    }
    return b.replies + b.reads / 20 - (a.replies + a.reads / 20);
  });
}

function renderPosts() {
  const query = searchInput.value.trim().toLowerCase();
  const visiblePosts = sortedPosts(
    posts.filter((post) => {
      const matchesFilter = activeFilter === "all" || post.category === activeFilter;
      const text = `${post.title} ${post.type} ${post.author} ${post.excerpt}`.toLowerCase();
      return matchesFilter && text.includes(query);
    }),
  );

  if (!visiblePosts.length) {
    postList.innerHTML = '<div class="empty-state">没有找到匹配的帖子。</div>';
    return;
  }

  postList.innerHTML = visiblePosts
    .map(
      (post) => `
        <article class="post-card" data-category="${post.category}">
          <div class="post-topline">
            <span class="post-type">${post.type}</span>
            <span class="post-meta">${post.author} · ${post.time}</span>
          </div>
          <h2>${post.title}</h2>
          <p>${post.excerpt}</p>
          <div class="post-footer">
            <div class="post-stats">
              <span>${post.replies} 回复</span>
              <span>${post.reads} 阅读</span>
              <span>深度 ${post.depth}</span>
            </div>
            <a class="reply-link" href="#">进入讨论</a>
          </div>
        </article>
      `,
    )
    .join("");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    activeFilter = tab.dataset.filter;
    renderPosts();
  });
});

searchInput.addEventListener("input", renderPosts);
sortSelect.addEventListener("change", renderPosts);

composeButton.addEventListener("click", () => {
  composer.classList.add("open");
  composer.querySelector("input").focus();
});

closeComposer.addEventListener("click", () => {
  composer.classList.remove("open");
});

renderPosts();
