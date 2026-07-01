# 社媒发布文案

## 小红书图文笔记

标题备选：

1. 我把 Codex 剩余额度做成了桌面动态壁纸
2. Codex 用户的痛点：剩余额度终于能直接看了
3. Wallpaper Engine + Codex：桌面实时显示 5H/7D 剩余额度

正文：

最近做了一个给 Codex 用户用的 Wallpaper Engine 动态壁纸。

重点不是好看，而是实用：  
它可以直接在桌面右上角显示 Codex 的剩余额度。

现在不用点进说明页/状态页，也不用凭感觉猜还剩多少：

- 5H 剩余用量百分比
- 7D 剩余用量百分比
- 两个窗口的重置时间
- 近 30 天 Token 使用日历
- 累计 Token
- 今日 Token

壁纸本身也做了一些动态效果：

- 背景音频响应
- 鼠标移动的 2.5D 视差背景
- 上方偏中左时间 + 当前播放信息
- 可以自己换背景图

本地数据是从 Codex App 写在电脑里的 usage/rate-limit 记录读取的，只读 `~/.codex/sessions`，不读取登录凭据、cookie 或浏览器状态。

第一次运行一次安装脚本，之后开机自动启动本地服务，Wallpaper Engine 每隔几分钟刷新一次。

这个东西适合那种每天都在用 Codex、又经常忘记自己剩余额度的人。  
现在桌面上就能看到 5H 和 7D 还剩多少。

配图建议：

1. 主图：`docs/images/01-main-preview.jpg`，展示桌面整体效果和右上角剩余额度。
2. 第二张：`docs/images/02-codex-usage-panel.jpg`，突出 5H / 7D。
3. 第三张：`docs/images/03-token-calendar.jpg`，突出 Token 日历热力图。
4. 第四张：`docs/images/04-media-player.jpg`，展示上方偏中左的时间与当前播放信息。
5. 第五张：安装脚本或 Wallpaper Engine 属性页。

标签：

`#Codex` `#WallpaperEngine` `#动态壁纸` `#AI工具` `#效率工具` `#桌面美化` `#程序员桌面` `#Token管理`

## X / Twitter

Short:

I made a Wallpaper Engine wallpaper that shows Codex remaining usage right on the desktop.

- 5H remaining %
- 7D remaining %
- reset times
- 30-day token calendar
- total / today tokens
- subtle audio-reactive background
- local-only Codex usage reader

No auth files, cookies, or browser state. It reads local `~/.codex/sessions` usage events.

Long:

Built a Wallpaper Engine Web wallpaper for Codex users.

The useful part: it shows Codex remaining usage directly on the desktop, including both rate-limit windows:

- 5H remaining usage
- 7D remaining usage
- reset time for each window
- 30-day token usage calendar
- total tokens
- today's tokens

It also has a subtle audio-reactive background, a layered 2.5D parallax scene, configurable background image, and a Windows SMTC clock/media overlay.

The local adapter only reads Codex usage/rate-limit events from `~/.codex/sessions`. It does not read auth files, cookies, browser state, or account credentials.

Useful if you keep checking how much Codex quota you have left.

Suggested images:

- `docs/images/01-main-preview.jpg`
- `docs/images/02-codex-usage-panel.jpg`
- `docs/images/03-token-calendar.jpg`
- `docs/images/04-media-player.jpg`
