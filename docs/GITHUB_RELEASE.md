# Codex Agent Usage Visualizer v1.0.0

Wallpaper Engine Web wallpaper for Codex users.

## Highlights

- Show Codex remaining usage directly on the desktop wallpaper.
- Display both Codex rate-limit windows: 5H and 7D remaining percentage plus reset time.
- Show a 30-day token usage calendar, total tokens, and today's tokens.
- Local-only data reader: reads `~\.codex\sessions` rollout usage events, not auth files, cookies, or browser sessions.
- Audio-responsive visualizer using Wallpaper Engine Web audio.
- Layered 2.5D parallax scene with configurable background image.
- Optional Windows SMTC/GSMTC clock/media overlay for current track title, artist, and album art.

## Files

- `codex-agent-wallpaper.zip`: release package.
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

4. Keep `媒体数据源 URL` as:

```text
http://127.0.0.1:47622/media
```

The wallpaper will refresh usage every 300 seconds by default.

## Privacy

The local adapter reads only Codex usage/rate-limit events stored under the current user's `.codex\sessions` folder. It does not read `auth.json`, cookies, browser state, prompts, or account credentials.
