# Codex Agent Usage Visualizer

把 Codex 和其他 AI Agent 的剩余额度、Token 使用趋势直接放到桌面上的 Wallpaper Engine 动态壁纸。

English: A Wallpaper Engine dynamic wallpaper that turns your desktop into a live AI Agent quota and token dashboard.

## 功能

- 桌面右上角显示 Codex 或自定义 AI Agent 剩余用量。
- 同时显示 5H、7D 或自定义额度窗口：剩余百分比 + 重置时间。
- 近 30 天 Token 日历热力图。
- 累计 Token / 今日 Token。
- 支持多 Agent JSON/HTTP 数据源：Claude Code、Cursor、Gemini CLI、Aider、自建脚本都可以接入。
- 背景明暗、饱和度和环境光跟随音频轻微响应。
- 2.5D 分层视差背景，支持鼠标移动。
- 上方偏中左的时间与媒体信息层，通过 Wallpaper Engine 官方媒体集成读取标题、歌手、封面，并可在属性里微调位置。
- 可在 Wallpaper Engine 属性里替换背景图片、调整刷新间隔、颜色和透明度。

## 使用方法

首次使用需要运行一次随包附带的：

```text
install-autostart.cmd
```

它会在本机启动一个只监听 `127.0.0.1` 的本地服务：

```text
http://127.0.0.1:47622/status
```

Wallpaper Engine 属性里的 `Agent 数据源 URL` 默认已经指向这个地址。

## 数据说明

内置 Codex 适配器读取的是本机 Codex App 已缓存到 `~\.codex\sessions` 的 usage/rate-limit 事件：

- 5H 剩余用量
- 7D 剩余用量
- 今日 Token
- 累计 Token
- 近 30 天 Token 日历

它不会读取 Codex 登录凭据、cookie、浏览器状态或账号密码。

其他 AI Agent 可以通过同样结构的 JSON 文件或 HTTP endpoint 接入，不需要改壁纸 UI。

## 适用人群

适合经常用 Codex、Claude Code、Cursor 或自建 Agent，并想随时知道额度和 Token 使用情况的人。
