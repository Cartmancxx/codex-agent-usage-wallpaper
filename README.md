# Codex Agent Usage Visualizer

这是一个 Wallpaper Engine Web 动态壁纸工程，已包含：

- 音频响应：使用 Wallpaper Engine 的 Web 音频监听接口读取频段数据，驱动底部频谱、流动波形、粒子和背景缩放。
- 可替换图片：在 Wallpaper Engine 属性面板里选择“背景图片”，支持铺满、完整显示、拉伸。
- Agent 用量面板：通过 JSON/HTTP 数据源显示 Codex 5 小时窗口和 1 周窗口的剩余用量百分比、重置时间、近 30 天 Token 日历热力图、累计 Token 和今日 Token。
- 媒体播放器：通过 Windows SMTC/GSMTC 读取当前系统媒体会话，显示标题、歌手和封面；没有正在播放的媒体时显示 fallback。

## 导入 Wallpaper Engine

1. 打开 Wallpaper Engine 编辑器。
2. 创建 Web 壁纸，选择本文件夹里的 `index.html`；也可以把整个 `codex-agent-wallpaper` 文件夹拖入编辑器。
3. 在属性面板里设置背景图片、Agent 数据源 URL、刷新间隔、面板位置和颜色。默认刷新间隔是 300 秒。
4. 发布或应用到桌面。

项目入口是 `index.html`，Wallpaper Engine 配置在 `project.json`。其中 `general.supportsaudioprocessing` 已开启，音频动画代码在 `app.js` 里。

## 分层壁纸资产

当前默认画面来自一套 2.5D 壁纸资产。原始交付包含同尺寸 clean plate、人物透明层、人物 mask、16-bit depth map、8-bit depth preview、QA contact sheet 和 parallax 预览视频。

为了降低 Wallpaper Engine 的显存和包体积，工程没有直接使用 7728x5152 原始 PNG，而是在 `assets` 下生成了 2560 宽运行时资产：

- `scene-clean-plate.webp`：背景 clean plate。
- `scene-person-layer.webp`：透明人物前景层。
- `scene-depth-preview.webp`：depth 预览，保留给后续 shader/depth 位移方案。
- `scene-asset-manifest.json`：记录原始交付包和运行时资产。

当前鼠标透视使用的是 clean plate + 人物透明层的实时 parallax。真正按 depth map 做像素级位移还需要 WebGL shader 或 Three.js 网格方案，现阶段没有启用，以免引入更高显存和边缘撕裂。

## Agent 数据源

浏览器静态预览默认读取 `agent-status.sample.json`。如果你想接入其他 Agent，也可以提供同样结构的 JSON/HTTP 数据源。通用 JSON 文件服务可以这样启动：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\agent-status-server.ps1
```

然后在 Wallpaper Engine 属性面板中把“Agent 数据源 URL”设置为：

```text
http://127.0.0.1:47621/status
```

服务默认读取 `agent-status.local.json`；如果这个文件不存在，就读取 `agent-status.sample.json`。你可以复制 `agent-status.local.example.json` 为 `agent-status.local.json`，再让 Codex、Claude、Cursor 或自己的统计脚本更新它。

## 读取本地 Codex App 额度

本项目额外提供了 `tools/codex-usage-export.py`，它默认读取当前 Windows 用户的 `~\.codex\sessions` rollout usage 事件。不同用户的 Codex 路径不需要手动写死：

- `payload.info.last_token_usage`：累加本周/本月 Token。
- `payload.rate_limits.primary`：Codex 返回的 5 小时窗口使用百分比。
- `payload.rate_limits.secondary`：Codex 返回的 7 天窗口使用百分比。

启动实时数据源：

```powershell
.\start-codex-usage-server.cmd
```

脚本会按顺序寻找 Python：

1. 环境变量 `CODEX_USAGE_PYTHON` 指向的 `python.exe`。
2. 当前用户的 Codex bundled Python，例如 `~\.cache\codex-runtimes\...\python.exe`。
3. 系统 PATH 里的 `python`。

如果 Codex Home 不在默认位置，可以直接调用：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run-codex-usage-export.ps1 -Serve 47622 -CodexHome "D:\your\.codex"
```

然后在 Wallpaper Engine 属性面板中把“Agent 数据源 URL”设置为：

```text
http://127.0.0.1:47622/status
```

同一个服务还会提供媒体接口：

```text
http://127.0.0.1:47622/media
```

它调用 Windows 的 `GlobalSystemMediaTransportControlsSessionManager`，也就是常说的 SMTC/GSMTC。Spotify、网易云、Edge/Chrome 播放器等只要把当前播放状态暴露给 Windows 媒体控制，壁纸就能读到标题、歌手和封面。

如果你改了服务端口，同时把 Wallpaper Engine 属性面板里的“媒体数据源 URL”改到同一个端口。

只配置一次、以后自动运行：

```powershell
.\install-autostart.cmd
```

这个脚本会优先注册当前 Windows 用户的计划任务 `CodexUsageWallpaperServer`，登录后自动启动 `http://127.0.0.1:47622/status` 和 `/media`。如果 Windows 拒绝注册计划任务，脚本会自动降级到当前用户 Startup 文件夹，写入隐藏启动的 `CodexUsageWallpaperServer.vbs`，不需要管理员权限。卸载自启：

```powershell
.\uninstall-autostart.cmd
```

也可以只导出一次静态 JSON：

```powershell
.\export-codex-usage-once.cmd
```

这条路径不读取 `auth.json`、cookie 或浏览器登录态；它只读本地 Codex 已写下来的 usage/rate-limit 记录。`5 小时` 和 `1 周` 是 Codex 的限额窗口，不是可用时长；界面显示两个窗口各自的剩余用量百分比与重置时间。

Token 日历来自 `payload.info.last_token_usage` 的本地累计，按天聚合。为了避免面板塞进过长历史和过大的 JSON，接口只返回近 30 天 daily 数据；总 Token 仍然按全部本地记录累计。颜色越深表示当天 Token 使用量越高；下方统计只显示累计 Token 和今日 Token，避免小卡片里数字挤在一起。

如果你在 `C:\Windows\system32` 这类目录运行命令，`.\tools\...` 会找错位置。先进入工程目录：

```powershell
Set-Location "<你的 codex-agent-wallpaper 文件夹>"
```

支持的 JSON 结构：

```json
{
  "provider": "Codex",
  "updatedAt": "2026-06-30T20:20:00+08:00",
  "quota": {
    "mode": "percent",
    "label": "1周",
    "usedPercent": 31,
    "remainingPercent": 69,
    "resetsAt": "2026-07-07T14:01:00+08:00",
    "windows": [
      {
        "label": "5小时",
        "usedPercent": 26,
        "remainingPercent": 74,
        "resetsAt": "2026-07-01T14:01:00+08:00"
      },
      {
        "label": "1周",
        "usedPercent": 31,
        "remainingPercent": 69,
        "resetsAt": "2026-07-07T14:01:00+08:00"
      }
    ]
  },
  "tokens": {
    "week": 250000,
    "month": 1100000,
    "today": 42000,
    "total": 5300000,
    "daily": [
      { "date": "2026-06-24", "tokens": 92000 },
      { "date": "2026-06-25", "tokens": 300000 }
    ]
  },
  "agents": [
    {
      "name": "5小时 剩余用量",
      "remainingPercent": 74,
      "resetsAt": "2026-07-01T14:01:00+08:00"
    }
  ]
}
```

Codex 本地适配器会自动生成上面的百分比结构。兼容旧数据源时，壁纸仍可读取 `quota.usedMinutes`，但本地 Codex 额度不再按分钟显示。

## 本地预览

Wallpaper Engine 里不需要本地服务器；浏览器预览时建议使用项目内置的静态服务：

```powershell
node .\tools\static-server.mjs
```

打开：

```text
http://127.0.0.1:5173/
```

普通浏览器没有 Wallpaper Engine 的音频接口，所以会自动使用模拟音频动画；导入 Wallpaper Engine 后会改用真实桌面音频数据。

## 关于 Codex/Agent 额度

Codex 本地适配器读取的是 Codex App 已缓存到本机 rollout 文件里的 usage/rate-limit 事件，不登录账号，也不读取认证文件。其他 Agent 仍可通过写入同样结构的 JSON 或提供 HTTP 端点接入。
