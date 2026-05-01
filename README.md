# 青蓝存在主义论坛

一个轻量论坛/文章站原型，包含主页、讨论广场、研究札记、日常文章、翻译计划、登录页、个人中心、发布页、文章阅读页和后台管理页。

当前版本已经支持 MongoDB。前端页面不用改，后端会优先使用 `MONGODB_URI` 连接 MongoDB；如果没有配置 MongoDB，则回退到 `db.json`。

## 本地运行

```bash
npm install
npm start
```

访问：

```text
http://localhost:3000
```

后台入口：

```text
http://localhost:3000/admin.html
```

管理员账号：

```text
账号：adminxxx
密码：2430350396
```

检查脚本：

```bash
npm run check
```

## 一键 Docker + MongoDB 部署

服务器装好 Docker 后，在项目目录执行：

```bash
docker compose up -d --build
```

它会启动两个容器：

- `greenparty-forum`：Node 网站和 API
- `greenparty-mongo`：MongoDB 数据库

访问：

```text
http://服务器IP:3000
```

后台：

```text
http://服务器IP:3000/admin.html
```

## MongoDB 配置

Docker Compose 默认连接串：

```text
MONGODB_URI=mongodb://admin:123456@mongo:27017/greenparty?authSource=admin
```

MongoDB 数据保存在 Docker 卷：

```text
greenparty-mongo
```

## 从 db.json 迁移到 MongoDB

如果你服务器上已有 `db.json`，可以在配置好 `MONGODB_URI` 后运行：

```bash
npm run migrate:mongo
```

也可以指定数据源：

```bash
node migrate-mongo.js /path/to/db.json
```

迁移脚本会把整个站点状态导入 MongoDB 的 `SiteState/main` 文档。

## 当前后端接口

- `GET /api/site-data`
- `POST /api/login`
- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/:id`
- `POST /api/posts/:id/reaction`
- `POST /api/posts/:id/comments`
- `POST /api/users/:id/favorites`
- `POST /api/admin/login`
- `GET /api/admin/dashboard`
- `PUT /api/admin/posts/:id`
- `DELETE /api/admin/posts/:id`
- `PUT /api/admin/galleries`

## 正式上线前建议补齐

- 真实用户注册、密码哈希、登录 token
- 文章审核状态：草稿、待审、已发布、驳回
- 管理员权限分级和操作日志
- 图片和附件上传到对象存储
- 评论审核、举报、删除
- HTTPS、域名、反向代理、日志和备份
