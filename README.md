```markdown
# 青蓝论坛 Android App

青蓝论坛 App 是 `青蓝存在主义论坛` 的 Android 客户端，用于连接服务器 API，与网页端共享同一套 MongoDB 数据。

App 端不直接连接 MongoDB，而是通过网站后端接口访问数据，避免数据库账号密码暴露在 APK 中。

## 当前服务器

```text
IPv4: 216.128.145.106
IPv6: 2001:19f0:5c00:4465:5400:06ff:fe1e:029e
```

默认 API 地址：

```text
http://216.128.145.106
```

网页端：

```text
http://216.128.145.106/
```

网页后台：

```text
http://216.128.145.106/admin.html
```

## 主要功能

- 主页内容流
- 图片轮播块
- 分区浏览
  - 讨论广场
  - 研究札记
  - 日常文章
  - 翻译计划
- 发布文章 / 帖子
- 选择封面图片
- 添加 3MB 以下附件
- 文章详情页
- 点赞
- 踩
- 评论
- 收藏
- 个人中心
- 上传头像
- 编辑个签
- 白天 / 黑夜模式
- 隐藏管理员入口

## 隐藏后台入口

在 App 主页左上角连续点击 `存` 字 7 次，可以进入隐藏后台登录页。

管理员账号：

```text
adminxxx
```

管理员密码：

```text
2430350396
```

后台当前支持：

- 查看帖子 / 文章
- 删除内容
- 修改展示图片

## 与服务器共享数据库

服务器当前使用 MongoDB：

```text
greenparty-mongo
```

网站容器：

```text
green7958
```

服务器日志已确认：

```text
MongoDB connected
Storage: MongoDB
```

App 发布内容后，会通过接口写入服务器 MongoDB，网页端和 App 端会读取同一份数据。

主要接口：

```text
GET  /api/site-data
GET  /api/posts
POST /api/posts
GET  /api/posts/:id
POST /api/posts/:id/comments
POST /api/posts/:id/reaction
POST /api/admin/login
GET  /api/admin/dashboard
PUT  /api/admin/posts/:id
DELETE /api/admin/posts/:id
```

## 本地开发

进入 Flutter 项目目录：

```powershell
cd F:\creat\greenlab\flutter_application_1
```

安装依赖：

```powershell
flutter pub get
```

检查代码：

```powershell
flutter analyze
```

运行到浏览器或设备：

```powershell
flutter run
```

构建 Android APK：

```powershell
flutter build apk --release
```

默认连接：

```text
http://216.128.145.106
```

## 自定义 API 地址

如果服务器地址变化，可以构建时指定：

```powershell
flutter build apk --release --dart-define=QINGLAN_API_BASE_URL=http://你的服务器IP
```

IPv6 地址需要加方括号：

```powershell
flutter build apk --release --dart-define=QINGLAN_API_BASE_URL=http://[2001:19f0:5c00:4465:5400:06ff:fe1e:029e]
```

## 注意事项

当前服务器没有单独的文件上传接口，App 会把封面图和 3MB 以下附件转换成 `dataUrl` 后通过 JSON 提交到 `/api/posts`，再存入 MongoDB。

这个方式适合测试和小文件使用。后续如果附件或图片变多，建议给服务器增加独立上传接口，例如：

```text
POST /api/upload
```

然后把文件存到服务器目录、对象存储或 CDN，只在 MongoDB 中保存文件 URL。
```
