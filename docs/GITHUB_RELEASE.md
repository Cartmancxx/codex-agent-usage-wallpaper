# Codex Agent Usage Visualizer v1.0.2

Wallpaper Engine Web wallpaper for AI Agent power users and multi-agent workflows.

中文：把 Codex 和其他 AI Agent 的剩余额度、Token 使用趋势、当前播放封面做成桌面动态壁纸。  
English: A desktop AI quota and token dashboard for Codex, Claude Code, Cursor, Gemini CLI, Aider, and custom agents.

## Highlights

- Show Codex or custom AI Agent remaining usage directly on the desktop wallpaper.
- Display rate-limit windows such as 5H and 7D remaining percentage plus reset time.
- Show a 30-day token usage calendar, total tokens, and today's tokens.
- Local-first Codex reader: reads `~\.codex\sessions` rollout usage events, not auth files, cookies, or browser sessions.
- Generic JSON/HTTP schema for Claude Code, Cursor, Gemini CLI, Aider, OpenHands, or your own scripts.
- Audio-responsive visualizer using Wallpaper Engine Web audio.
- Layered 2.5D parallax scene with configurable background image.
- Optional Wallpaper Engine media integration overlay for current track title, artist, and album art.

## Files

- `codex-agent-wallpaper-v1.0.2.zip`: release package.
- `install-autostart.cmd`: one-time setup for the local Codex usage endpoint.
- `start-codex-usage-server.cmd`: manually start the local endpoint.
- `README.md`: setup and customization guide.

## Setup

1. Import the folder or `index.html` into Wallpaper Engine as a Web wallpaper.
2. Run `install-autostart.cmd` once.
3. Keep Wallpaper Engine property `Agent 数据源 URL` as:

```text
http://127.0.0.1:47622/status
```

The wallpaper will refresh usage every 300 seconds by default.
Album art and track metadata are read through Wallpaper Engine's built-in media integration when the wallpaper runs inside Wallpaper Engine. The `媒体数据源 URL（浏览器预览 fallback）` property is only used outside Wallpaper Engine.

## Privacy

The local adapter reads only Codex usage/rate-limit events stored under the current user's `.codex\sessions` folder. It does not read `auth.json`, cookies, browser state, prompts, or account credentials.
