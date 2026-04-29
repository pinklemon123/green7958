# 青蓝存在主义论坛

一个轻量论坛/文章站原型，包含主页、讨论广场、研究札记、日常文章、翻译计划、登录页、个人中心、发布页、文章阅读页和后台管理页。

当前版本可以部署演示，但还不是完整生产系统。

## 本地运行

```bash
npm start
```

访问：

```text
http://localhost:3000
```

检查脚本：

```bash
npm run check
```

## 一键 Docker 部署

服务器装好 Docker 后，在项目目录执行：

```bash
docker compose up -d --build
```

访问：

```text
http://服务器IP:3000
```

后台入口：

```text
http://服务器IP:3000/admin.html
```

默认管理员账号来自 `docker-compose.yml`：

```text
ADMIN_USER=adminxxx
ADMIN_PASSWORD=2430350396
```

正式部署必须修改 `ADMIN_PASSWORD`。

## 数据库

Docker Compose 会同时启动 PostgreSQL 和论坛服务。论坛服务通过下面的连接串连接数据库：

```text
DATABASE_URL=postgres://greenparty:greenparty-change-this-password@postgres:5432/greenparty
```

PostgreSQL 数据保存在 Docker 卷 `greenparty-postgres`，容器重建后不会丢。

如果不设置 `DATABASE_URL`，程序会退回 JSON 文件数据库：

```text
DB_FILE=/data/db.json
```

JSON 文件位置由 `DB_FILE` 控制。Docker Compose 仍保留 `/data` 挂载作为备用。

如果正式上线，建议换成 PostgreSQL 或 MySQL。你可以直接在自己的服务器上安装数据库，也可以用 Docker 安装数据库。推荐 PostgreSQL：

```bash
docker run -d --name greenparty-postgres \
  -e POSTGRES_USER=greenparty \
  -e POSTGRES_PASSWORD=请改成强密码 \
  -e POSTGRES_DB=greenparty \
  -p 5432:5432 \
  -v greenparty-postgres:/var/lib/postgresql/data \
  postgres:16
```

当前 `server.js` 已经支持 PostgreSQL。为了保持代码简单，现在先把站点状态作为一份 JSONB 存在 `app_state` 表中；后续正式做复杂查询时，再拆成 `users/posts/comments/galleries` 多张表。

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
- PostgreSQL/MySQL/MongoDB 等真实数据库
- 图片和附件上传到对象存储
- 评论审核、举报、删除
- HTTPS、域名、反向代理、日志和备份
