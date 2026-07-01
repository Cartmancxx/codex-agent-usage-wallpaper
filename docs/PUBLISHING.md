# Publishing Checklist

## Before Publishing

- Do not include `agent-status.local.json`; it contains local usage data.
- Keep `agent-status.sample.json` for preview/demo data.
- Keep the default Wallpaper Engine property:
  - `Agent 数据源 URL`: `http://127.0.0.1:47622/status`
  - `媒体数据源 URL`: `http://127.0.0.1:47622/media`
- Include `install-autostart.cmd` so users can configure the local endpoint once.

## GitHub

This workspace is not currently a git repository and `gh` CLI is not installed on this machine, so publishing has to be done from a GitHub repo or through the GitHub web UI.

Recommended repository name:

```text
codex-agent-usage-wallpaper
```

Suggested description:

```text
Wallpaper Engine Web wallpaper that shows Codex 5H/7D remaining usage and token stats on your desktop.
```

Suggested topics:

```text
codex, wallpaper-engine, dynamic-wallpaper, token-usage, desktop-widget, productivity
```

Suggested release title:

```text
v1.0.0 - Codex remaining usage on desktop
```

Upload:

- `codex-agent-wallpaper.zip`
- `assets/preview.png`

## Steam Workshop / Wallpaper Engine

1. Open Wallpaper Engine Editor.
2. Create or open a Web wallpaper project.
3. Select `index.html` from this folder.
4. Check properties in `project.json`.
5. Use `assets/preview.png` as preview.
6. Paste `docs/WORKSHOP_DESCRIPTION.md` into the Workshop description.
7. Add tags such as `Web`, `Audio responsive`, `Interactive`, `Utility`.
8. Publish through Wallpaper Engine while logged into Steam.

Workshop upload requires the user's Steam account and Wallpaper Engine editor session, so it cannot be completed from this background script alone.
