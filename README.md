# Green Party 小型论坛站点

项目包含一组静态页面与简单的服务器文件，用于本地开发与演示。

## 项目简介
- 一个轻量级的论坛/文章展示网站，包含文章列表、讨论区、翻译页面、登录页等。
- 前端由 HTML/CSS/JavaScript 组成；仓库中可能包含一个简单的 `server.js` 用于本地测试 API 或静态服务。

## 主要文件
- `index.html` - 站点首页
- `articles.html` - 文章列表页面
- `discussion.html` - 讨论/论坛页面
- `research.html` - 研究/资源页面
- `translation.html` - 翻译页面
- `login.html` - 登录页
- `script.js` / `data.js` - 前端脚本和数据
- `styles.css` - 全局样式
- `db.json`、`post.html`、`profile.html`、`publish.html` - 新增的内容与后端示例
- `server.js` - （可选）本地测试用的 Node 服务器

## 本地运行
静态预览：直接在浏览器中打开 `index.html`。

如果存在 `server.js`，你可以使用 Node 运行一个本地服务：

```bash
node server.js
# 或使用 npm/yarn 脚本（若项目提供）
```

## 提交/推送建议
- 将对现有页面的修改作为一次提交，信息示例：
  - `Update site pages, scripts and styles: improve UI, fix login and translations`
- 将新增页面与后端文件作为另一次提交，信息示例：
  - `Add server and CMS pages: db.json, post/profile/publish, server.js`

## 贡献与许可
欢迎提交 Issues 或 Pull Requests。请在合并前保持提交信息清晰。

---
（自动生成的 README，可根据需要修改或扩展）
