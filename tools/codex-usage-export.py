import argparse
import glob
import json
import os
import subprocess
from datetime import datetime, time, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from zoneinfo import ZoneInfo


def parse_timestamp(value):
    if not value:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, timezone.utc)
    if isinstance(value, str):
        text = value.strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(text)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    return None


def period_starts(now):
    day_start = datetime.combine(now.date(), time.min, tzinfo=now.tzinfo)
    week_start = day_start - timedelta(days=day_start.weekday())
    month_start = day_start.replace(day=1)
    return week_start, month_start


def add_usage(bucket, usage):
    if not isinstance(usage, dict):
        return
    for key in ("input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens", "total_tokens"):
        value = usage.get(key)
        if isinstance(value, (int, float)):
            bucket[key] = bucket.get(key, 0) + int(value)


def empty_usage():
    return {
        "input_tokens": 0,
        "cached_input_tokens": 0,
        "output_tokens": 0,
        "reasoning_output_tokens": 0,
        "total_tokens": 0,
    }


def read_rollout_usage(codex_home, tz):
    sessions = Path(codex_home) / "sessions"
    files = sorted(glob.glob(str(sessions / "**" / "rollout-*.jsonl"), recursive=True))
    now = datetime.now(tz)
    week_start, month_start = period_starts(now)
    today_start = datetime.combine(now.date(), time.min, tzinfo=tz)
    daily_start_date = today_start.date() - timedelta(days=29)
    week = {}
    month = {}
    today = {}
    total = {}
    daily = {}
    latest_rate = None
    latest_rate_at = None
    files_checked = 0

    for file in files:
        files_checked += 1
        try:
            fh = open(file, "r", encoding="utf-8", errors="replace")
        except OSError:
            continue
        with fh:
            for line in fh:
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                payload = obj.get("payload")
                if not isinstance(payload, dict) or payload.get("type") != "token_count":
                    continue

                stamp = parse_timestamp(obj.get("timestamp"))
                if stamp is None:
                    continue
                local_stamp = stamp.astimezone(tz)

                info = payload.get("info")
                usage = info.get("last_token_usage") if isinstance(info, dict) else None
                add_usage(total, usage)
                local_date = local_stamp.date()
                date_key = local_date.isoformat()
                if local_date >= daily_start_date:
                    if date_key not in daily:
                        daily[date_key] = empty_usage()
                    add_usage(daily[date_key], usage)
                if local_stamp >= today_start:
                    add_usage(today, usage)
                if local_stamp >= week_start:
                    add_usage(week, usage)
                if local_stamp >= month_start:
                    add_usage(month, usage)

                rate_limits = payload.get("rate_limits")
                if isinstance(rate_limits, dict) and (latest_rate_at is None or stamp >= latest_rate_at):
                    latest_rate = rate_limits
                    latest_rate_at = stamp

    return {
        "week": week,
        "month": month,
        "today": today,
        "total": total,
        "daily": daily,
        "latest_rate": latest_rate,
        "latest_rate_at": latest_rate_at,
        "files_checked": files_checked,
        "week_start": week_start,
        "month_start": month_start,
        "daily_start": daily_start_date,
    }


def clamp_percent(value):
    return min(100.0, max(0.0, float(value)))


def window_duration_label(minutes):
    if not isinstance(minutes, (int, float)) or minutes <= 0:
        return None
    if minutes % 1440 == 0:
        return f"{int(minutes / 1440)}D"
    if minutes % 60 == 0:
        return f"{int(minutes / 60)}H"
    return f"{int(minutes)}m"


def rate_window(rate_limits, window_name, label, tz):
    if not isinstance(rate_limits, dict):
        return None
    window = rate_limits.get(window_name)
    if not isinstance(window, dict):
        return None
    used_percent = window.get("used_percent")
    if not isinstance(used_percent, (int, float)):
        return None
    used_percent = clamp_percent(used_percent)
    reset_epoch = window.get("resets_at")
    reset_iso = None
    if isinstance(reset_epoch, (int, float)):
        reset_iso = datetime.fromtimestamp(reset_epoch, timezone.utc).astimezone(tz).isoformat()
    window_minutes = window.get("window_minutes")
    inferred_label = window.get("label") or window_duration_label(window_minutes) or label
    return {
        "key": window_name,
        "label": inferred_label,
        "usedPercent": round(used_percent, 1),
        "remainingPercent": round(100.0 - used_percent, 1),
        "windowMinutes": window_minutes,
        "resetsAt": reset_iso,
        "resetsAtEpoch": reset_epoch,
    }


def build_status(codex_home, tz_name):
    tz = ZoneInfo(tz_name)
    usage = read_rollout_usage(codex_home, tz)
    rate = usage["latest_rate"] or {}
    windows = []
    seen_window_keys = set()
    for key in ("primary", "secondary"):
        item = rate_window(rate, key, "额度", tz)
        if item is not None:
            windows.append(item)
            seen_window_keys.add(key)
    for key in sorted(rate.keys()):
        if key in seen_window_keys or key in {"limit_id", "plan_type"}:
            continue
        item = rate_window(rate, key, "额度", tz)
        if item is not None:
            windows.append(item)
            seen_window_keys.add(key)
    main_window = next((item for item in windows if item.get("key") == "secondary" or item.get("label") in ("1周", "7D") or (item.get("windowMinutes") or 0) >= 10080), None) or (windows[0] if windows else None) or {
        "key": "unknown",
        "label": "额度",
        "usedPercent": 0.0,
        "remainingPercent": 0.0,
        "windowMinutes": None,
        "resetsAt": None,
        "resetsAtEpoch": None,
    }

    now = datetime.now(tz)
    latest_rate_at = usage["latest_rate_at"].astimezone(tz).isoformat() if usage["latest_rate_at"] else None
    return {
        "provider": "Codex",
        "updatedAt": now.isoformat(),
        "quota": {
            "mode": "percent",
            "label": main_window["label"],
            "usedPercent": main_window["usedPercent"],
            "remainingPercent": main_window["remainingPercent"],
            "resetsAt": main_window["resetsAt"],
            "source": f"codex_rate_limits.{main_window['key']}.used_percent",
            "windows": windows,
        },
        "tokens": {
            "week": int(usage["week"].get("total_tokens", 0)),
            "month": int(usage["month"].get("total_tokens", 0)),
            "today": int(usage["today"].get("total_tokens", 0)),
            "total": int(usage["total"].get("total_tokens", 0)),
            "weekInput": int(usage["week"].get("input_tokens", 0)),
            "weekOutput": int(usage["week"].get("output_tokens", 0)),
            "monthInput": int(usage["month"].get("input_tokens", 0)),
            "monthOutput": int(usage["month"].get("output_tokens", 0)),
            "daily": [
                {"date": date, "tokens": int(values.get("total_tokens", 0))}
                for date, values in sorted(usage["daily"].items())
            ],
        },
        "agents": [
            {
                "name": f"{item['label']} 剩余用量",
                "remainingPercent": item["remainingPercent"],
                "usedPercent": item["usedPercent"],
                "resetsAt": item["resetsAt"],
            }
            for item in windows
        ],
        "codexRateLimits": {
            "latestAt": latest_rate_at,
            "limitId": rate.get("limit_id"),
            "planType": rate.get("plan_type"),
            "primary": rate.get("primary"),
            "secondary": rate.get("secondary"),
        },
        "source": {
            "codexHome": str(codex_home),
            "sessionsChecked": usage["files_checked"],
            "weekStart": usage["week_start"].isoformat(),
            "monthStart": usage["month_start"].isoformat(),
            "dailyStart": usage["daily_start"].isoformat(),
        },
    }


def read_current_media():
    script = Path(__file__).with_name("get-current-media.ps1")
    if not script.exists():
        return {"status": "Unavailable", "title": "", "artist": "", "thumbnail": ""}
    try:
        completed = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(script),
            ],
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=3.5,
        )
    except Exception:
        return {"status": "Unavailable", "title": "", "artist": "", "thumbnail": ""}
    if completed.returncode != 0 or not completed.stdout.strip():
        return {"status": "Unavailable", "title": "", "artist": "", "thumbnail": ""}
    try:
        return json.loads(completed.stdout.strip().splitlines()[-1])
    except json.JSONDecodeError:
        return {"status": "Unavailable", "title": "", "artist": "", "thumbnail": ""}


class UsageHandler(BaseHTTPRequestHandler):
    server_version = "CodexUsageServer/1.0"

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/media":
            self.send_json(read_current_media(), 200)
            return
        if path != "/status":
            self.send_json({"error": "not found"}, 404)
            return
        try:
            data = build_status(
                self.server.codex_home,
                self.server.tz_name,
            )
            self.send_json(data, 200)
        except Exception as exc:
            self.send_json({"error": str(exc), "provider": "Codex"}, 500)

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.log_date_time_string(), fmt % args))

    def send_json(self, data, status):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description="Export local Codex usage for Wallpaper Engine.")
    parser.add_argument("--codex-home", default=os.path.join(os.path.expanduser("~"), ".codex"))
    parser.add_argument("--timezone", default="Asia/Shanghai")
    parser.add_argument("--output", default="")
    parser.add_argument("--serve", type=int, default=0, metavar="PORT")
    args = parser.parse_args()

    if args.serve:
        server = ThreadingHTTPServer(("127.0.0.1", args.serve), UsageHandler)
        server.codex_home = args.codex_home
        server.tz_name = args.timezone
        print(f"Codex usage URL: http://127.0.0.1:{args.serve}/status")
        print("Press Ctrl+C to stop.")
        server.serve_forever()
        return

    data = build_status(args.codex_home, args.timezone)
    text = json.dumps(data, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(text + "\n", encoding="utf-8")
    else:
        print(text)


if __name__ == "__main__":
    main()
