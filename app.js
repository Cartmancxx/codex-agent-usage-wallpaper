(() => {
  const hasWallpaperAudioApi = typeof window.wallpaperRegisterAudioListener === "function";

  const defaults = {
    backgroundImage: "assets/scene-clean-plate.webp",
    personLayerImage: "assets/scene-person-layer.webp",
    backgroundFit: "cover",
    panelPosition: "right",
    dataUrl: "agent-status.sample.json",
    mediaUrl: "http://127.0.0.1:47622/media",
    providerName: "Codex",
    mediaXPercent: 18,
    mediaYPercent: 7,
    weeklyLimitHours: 5,
    pollSeconds: 300,
    showTokens: true,
    accentRgb: [76, 214, 194],
    panelOpacity: 0.72,
    visualizerIntensity: 0.78,
    testMode: false,
  };

  const sampleStatus = {
    provider: "Codex",
    updatedAt: new Date().toISOString(),
    quota: {
      mode: "percent",
      label: "1周",
      usedPercent: 0,
      remainingPercent: 100,
      windows: [
        { label: "5小时", usedPercent: 0, remainingPercent: 100 },
        { label: "1周", usedPercent: 0, remainingPercent: 100 },
      ],
    },
    tokens: {
      week: 0,
      month: 0,
    },
    agents: [
      { name: "5小时 剩余用量", remainingPercent: 100 },
      { name: "1周 剩余用量", remainingPercent: 100 },
    ],
  };

  const settings = { ...defaults };
  const els = {
    root: document.getElementById("wallpaper"),
    scene: document.getElementById("scene"),
    bg: document.getElementById("backgroundImage"),
    scenePerson: document.querySelector(".scene-person"),
    sceneDepth: document.querySelector(".scene-depth"),
    canvas: document.getElementById("audioCanvas"),
    panel: document.getElementById("agentPanel"),
    providerName: document.getElementById("providerName"),
    liveState: document.getElementById("liveState"),
    quota5hPercent: document.getElementById("quota5hPercent"),
    quota5hReset: document.getElementById("quota5hReset"),
    quota5hBar: document.getElementById("quota5hBar"),
    quota7dPercent: document.getElementById("quota7dPercent"),
    quota7dReset: document.getElementById("quota7dReset"),
    quota7dBar: document.getElementById("quota7dBar"),
    tokenCalendar: document.getElementById("tokenCalendar"),
    calendarRange: document.getElementById("calendarRange"),
    totalTokens: document.getElementById("totalTokens"),
    todayTokens: document.getElementById("todayTokens"),
    tokenBlock: document.getElementById("tokenBlock"),
    updatedAt: document.getElementById("updatedAt"),
    dataHealth: document.getElementById("dataHealth"),
    clockTime: document.getElementById("clockTime"),
    clockDate: document.getElementById("clockDate"),
    albumArt: document.getElementById("albumArt"),
    mediaTitle: document.getElementById("mediaTitle"),
    mediaArtist: document.getElementById("mediaArtist"),
  };

  const ctx = els.canvas.getContext("2d", { alpha: true });
  const audio = {
    raw: new Float32Array(128),
    bands: { bass: 0, mid: 0, treble: 0, energy: 0 },
    lastRealFrame: 0,
  };

  let refreshTimer = 0;
  let mediaTimer = 0;
  let clockTimer = 0;
  let currentStatus = normalizeStatus(sampleStatus);
  const motion = { x: 0, y: 0, tx: 0, ty: 0 };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function asNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return undefined;
  }

  function formatDuration(totalMinutes) {
    const safeMinutes = Math.max(0, Math.round(totalMinutes));
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  function formatCompactNumber(value) {
    const number = Number(value) || 0;
    return new Intl.NumberFormat("en", {
      notation: Math.abs(number) >= 10000 ? "compact" : "standard",
      maximumFractionDigits: Math.abs(number) >= 10000 ? 1 : 0,
    }).format(number);
  }

  function formatDateTime(value) {
    if (!value) return "未更新";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  function formatPercent(value) {
    const number = clamp(Number(value) || 0, 0, 100);
    return `${Number.isInteger(number) ? number.toFixed(0) : number.toFixed(1)}%`;
  }

  function formatResetTime(value) {
    if (!value) return "未记录";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const now = new Date();
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    return new Intl.DateTimeFormat("zh-CN", sameDay
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : { month: "numeric", day: "numeric" }).format(date);
  }

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getQuotaWindow(status, key, label) {
    return (
      status.quotaWindows.find((item) => item.key === key) ||
      status.quotaWindows.find((item) => item.label === label) ||
      null
    );
  }

  function setQuotaLine(percentEl, resetEl, barEl, item) {
    const remaining = item ? item.remainingPercent : 0;
    percentEl.textContent = item ? formatPercent(remaining) : "--";
    resetEl.textContent = item ? formatResetTime(item.resetsAt) : "--";
    barEl.style.width = `${clamp(remaining, 0, 100)}%`;
  }

  function applyMotion() {
    motion.x += (motion.tx - motion.x) * 0.13;
    motion.y += (motion.ty - motion.y) * 0.13;
    const tiltX = `${(-motion.y * 4.8).toFixed(3)}deg`;
    const tiltY = `${(motion.x * 6.1).toFixed(3)}deg`;
    const sceneX = `${(motion.x * 24).toFixed(3)}px`;
    const sceneY = `${(motion.y * 17).toFixed(3)}px`;
    els.root.style.setProperty("--tilt-x", tiltX);
    els.root.style.setProperty("--tilt-y", tiltY);
    els.root.style.setProperty("--scene-x", sceneX);
    els.root.style.setProperty("--scene-y", sceneY);
  }

  function updateMotionFromPointer(event) {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    motion.tx = clamp((event.clientX / width - 0.5) * 2, -1, 1);
    motion.ty = clamp((event.clientY / height - 0.5) * 2, -1, 1);
  }

  function renderClock() {
    const now = new Date();
    els.clockTime.textContent = new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
    els.clockDate.textContent = new Intl.DateTimeFormat("en", {
      weekday: "short",
      month: "short",
      day: "2-digit",
    }).format(now);
  }

  function scheduleClock() {
    window.clearInterval(clockTimer);
    renderClock();
    clockTimer = window.setInterval(renderClock, 1000);
  }

  function renderMedia(media) {
    const title = media?.title || media?.track || "System audio";
    const artist = media?.artist || media?.albumArtist || media?.app || "SMTC / local media";
    els.mediaTitle.textContent = title;
    els.mediaArtist.textContent = artist;
    if (media?.thumbnail) {
      els.albumArt.style.backgroundImage = `url("${media.thumbnail}")`;
    } else if (media?.artUrl) {
      els.albumArt.style.backgroundImage = `url("${media.artUrl}")`;
    } else {
      els.albumArt.style.backgroundImage = "";
    }
  }

  async function refreshMedia() {
    try {
      const response = await fetch(cacheBustedUrl(settings.mediaUrl), { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      renderMedia(await response.json());
    } catch {
      renderMedia(null);
    }
  }

  function scheduleMediaRefresh() {
    window.clearInterval(mediaTimer);
    refreshMedia();
    mediaTimer = window.setInterval(refreshMedia, 10000);
  }

  function renderTokenCalendar(days) {
    const daily = new Map((currentStatus.dailyTokens || []).map((item) => [item.date, Number(item.tokens) || 0]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - days + 1);
    const leadingBlanks = (start.getDay() + 6) % 7;

    const values = [];
    for (let i = 0; i < days; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      values.push({ date, key: dateKey(date), tokens: daily.get(dateKey(date)) || 0 });
    }
    const max = Math.max(1, ...values.map((item) => item.tokens));

    els.tokenCalendar.replaceChildren();
    for (let i = 0; i < leadingBlanks; i += 1) {
      const blank = document.createElement("span");
      blank.className = "heat-cell is-empty";
      els.tokenCalendar.append(blank);
    }
    for (const item of values) {
      const cell = document.createElement("span");
      const ratio = item.tokens <= 0 ? 0 : item.tokens / max;
      const level = ratio === 0 ? 0 : ratio < 0.18 ? 1 : ratio < 0.42 ? 2 : ratio < 0.72 ? 3 : 4;
      cell.className = `heat-cell level-${level}`;
      cell.textContent = String(item.date.getDate());
      cell.title = `${item.key}: ${formatCompactNumber(item.tokens)} tokens`;
      els.tokenCalendar.append(cell);
    }
    const trailingBlanks = (7 - ((leadingBlanks + days) % 7)) % 7;
    for (let i = 0; i < trailingBlanks; i += 1) {
      const blank = document.createElement("span");
      blank.className = "heat-cell is-empty";
      els.tokenCalendar.append(blank);
    }
    els.calendarRange.textContent = `近${days}天 ${dateKey(start).slice(5)} - ${dateKey(today).slice(5)}`;
  }

  function wallpaperFileUrl(path) {
    if (!path) return defaults.backgroundImage;
    if (/^(https?:|file:|data:|assets\/)/i.test(path)) return path;
    const normalized = String(path).replaceAll("\\", "/");
    return encodeURI(`file:///${normalized}`);
  }

  function readProp(properties, key) {
    return Object.prototype.hasOwnProperty.call(properties, key) ? properties[key].value : undefined;
  }

  function parseWallpaperColor(value) {
    if (Array.isArray(value)) return value.slice(0, 3).map((n) => Math.round(Number(n) * 255));
    if (typeof value === "string") {
      const parts = value.trim().split(/\s+/).map(Number);
      if (parts.length >= 3 && parts.every(Number.isFinite)) {
        return parts.slice(0, 3).map((n) => Math.round(clamp(n, 0, 1) * 255));
      }
    }
    return defaults.accentRgb;
  }

  function normalizeStatus(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const quota = source.quota && typeof source.quota === "object" ? source.quota : {};
    const tokens = source.tokens && typeof source.tokens === "object" ? source.tokens : {};
    const rateLimits = source.codexRateLimits && typeof source.codexRateLimits === "object" ? source.codexRateLimits : {};
    const quotaWindows = [];

    function pushWindow(input, fallbackLabel, fallbackKey) {
      if (!input || typeof input !== "object") return;
      const usedPercent = asNumber(input.usedPercent, input.used_percent);
      let remainingPercent = asNumber(input.remainingPercent, input.remaining_percent);
      if (remainingPercent == null && usedPercent != null) remainingPercent = 100 - usedPercent;
      if (remainingPercent == null) return;
      quotaWindows.push({
        key: input.key || fallbackKey || fallbackLabel,
        label: input.label || fallbackLabel || "额度",
        usedPercent: clamp(usedPercent == null ? 100 - remainingPercent : usedPercent, 0, 100),
        remainingPercent: clamp(remainingPercent, 0, 100),
        resetsAt: input.resetsAt || input.resets_at || null,
        windowMinutes: asNumber(input.windowMinutes, input.window_minutes),
      });
    }

    if (Array.isArray(quota.windows)) {
      for (const item of quota.windows) pushWindow(item);
    }
    pushWindow(rateLimits.primary, "5小时", "primary");
    pushWindow(rateLimits.secondary, "1周", "secondary");

    const seenWindows = new Set();
    const dedupedWindows = quotaWindows.filter((item) => {
      const key = item.key || item.label;
      if (seenWindows.has(key)) return false;
      seenWindows.add(key);
      return true;
    });
    const percentMode =
      quota.mode === "percent" ||
      asNumber(quota.remainingPercent, quota.remaining_percent, quota.usedPercent, quota.used_percent) != null ||
      dedupedWindows.length > 0;

    const weeklyLimitHours = asNumber(
      quota.weeklyLimitHours,
      quota.limitHours,
      source.weeklyLimitHours,
      settings.weeklyLimitHours,
      defaults.weeklyLimitHours,
    );
    let usedMinutes = asNumber(
      quota.usedMinutes,
      quota.weekMinutesUsed,
      source.usedMinutes,
      source.weekMinutesUsed,
      source.weeklyUsedMinutes,
    );
    const remainingMinutes = asNumber(
      quota.remainingMinutes,
      source.remainingMinutes,
      source.weekRemainingMinutes,
    );
    const totalMinutes = Math.max(1, weeklyLimitHours * 60);

    if (usedMinutes == null && remainingMinutes != null) {
      usedMinutes = totalMinutes - remainingMinutes;
    }
    usedMinutes = clamp(usedMinutes || 0, 0, Math.max(totalMinutes, usedMinutes || 0));

    const mainWindow =
      dedupedWindows.find((item) => item.key === "secondary" || item.label === "1周") ||
      dedupedWindows[0] ||
      null;
    let remainingPercent = asNumber(quota.remainingPercent, quota.remaining_percent);
    const quotaUsedPercent = asNumber(quota.usedPercent, quota.used_percent);
    if (remainingPercent == null && quotaUsedPercent != null) remainingPercent = 100 - quotaUsedPercent;
    if (remainingPercent == null && mainWindow) remainingPercent = mainWindow.remainingPercent;
    remainingPercent = clamp(remainingPercent == null ? 0 : remainingPercent, 0, 100);

    return {
      provider: source.provider || settings.providerName || defaults.providerName,
      updatedAt: source.updatedAt || source.timestamp || new Date().toISOString(),
      quotaMode: percentMode ? "percent" : "time",
      quotaLabel: quota.label || mainWindow?.label || "本周",
      quotaRemainingPercent: remainingPercent,
      quotaUsedPercent: clamp(quotaUsedPercent == null ? 100 - remainingPercent : quotaUsedPercent, 0, 100),
      quotaResetsAt: quota.resetsAt || quota.resets_at || mainWindow?.resetsAt || null,
      quotaWindows: dedupedWindows,
      weeklyLimitHours,
      usedMinutes,
      remainingMinutes:
        remainingMinutes == null ? Math.max(0, totalMinutes - usedMinutes) : Math.max(0, remainingMinutes),
      weekTokens: asNumber(tokens.week, tokens.weekTokens, source.tokensWeek, source.weekTokens) || 0,
      monthTokens: asNumber(tokens.month, tokens.monthTokens, source.tokensMonth, source.monthTokens) || 0,
      todayTokens: asNumber(tokens.today, tokens.todayTokens, source.tokensToday, source.todayTokens) || 0,
      totalTokens: asNumber(tokens.total, tokens.totalTokens, source.tokensTotal, source.totalTokens) || 0,
      dailyTokens: Array.isArray(tokens.daily) ? tokens.daily : [],
      agents: Array.isArray(source.agents) ? source.agents.slice(0, 4) : [],
    };
  }

  function renderStatus(status, health = "live") {
    currentStatus = status;
    els.providerName.textContent = status.provider;
    setQuotaLine(
      els.quota5hPercent,
      els.quota5hReset,
      els.quota5hBar,
      getQuotaWindow(status, "primary", "5小时"),
    );
    setQuotaLine(
      els.quota7dPercent,
      els.quota7dReset,
      els.quota7dBar,
      getQuotaWindow(status, "secondary", "1周"),
    );
    els.totalTokens.textContent = formatCompactNumber(status.totalTokens);
    els.todayTokens.textContent = formatCompactNumber(status.todayTokens);
    els.updatedAt.textContent = formatDateTime(status.updatedAt);
    els.dataHealth.textContent = health;
    els.tokenBlock.hidden = !settings.showTokens;
    renderTokenCalendar(30);
  }

  function markHealth(label, isError = false) {
    els.liveState.textContent = isError ? "ERR" : "LIVE";
    els.liveState.classList.toggle("is-error", isError);
    els.dataHealth.textContent = label;
  }

  function cacheBustedUrl(url) {
    if (!url || url.startsWith("data:") || url.trim().startsWith("{")) return url;
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}_=${Date.now()}`;
  }

  async function refreshStatus() {
    const source = settings.dataUrl.trim();

    try {
      let payload = sampleStatus;
      if (source) {
        if (source.startsWith("{")) {
          payload = JSON.parse(source);
        } else {
          const response = await fetch(cacheBustedUrl(source), { cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          payload = await response.json();
        }
      }
      renderStatus(normalizeStatus(payload), source ? "live" : "sample");
      markHealth(source ? "live" : "sample", false);
    } catch (error) {
      renderStatus(currentStatus, "stale");
      markHealth("stale", true);
      console.warn("Agent data source failed:", error);
    }
  }

  function scheduleRefresh() {
    window.clearInterval(refreshTimer);
    refreshStatus();
    refreshTimer = window.setInterval(refreshStatus, Math.max(5, settings.pollSeconds) * 1000);
  }

  function applySettings() {
    document.documentElement.style.setProperty("--accent-rgb", settings.accentRgb.join(" "));
    document.documentElement.style.setProperty("--panel-bg", `rgb(10 12 17 / ${settings.panelOpacity})`);
    document.documentElement.style.setProperty("--media-left", `clamp(160px, ${settings.mediaXPercent}vw, 520px)`);
    document.documentElement.style.setProperty("--media-top", `clamp(36px, ${settings.mediaYPercent}vh, 120px)`);
    const backgroundUrl = wallpaperFileUrl(settings.backgroundImage);
    const usesDefaultLayeredScene = settings.backgroundImage === defaults.backgroundImage;
    els.bg.src = backgroundUrl;
    els.scenePerson.src = usesDefaultLayeredScene ? wallpaperFileUrl(defaults.personLayerImage) : backgroundUrl;
    els.sceneDepth.style.backgroundImage = `url("${backgroundUrl}")`;
    els.bg.style.objectFit = settings.backgroundFit;
    els.scenePerson.style.objectFit = settings.backgroundFit;
    els.root.dataset.layeredScene = usesDefaultLayeredScene ? "true" : "false";
    els.root.dataset.panelPosition = settings.panelPosition;
    renderStatus(currentStatus, els.dataHealth.textContent || "sample");
  }

  function applyUserProperties(properties) {
    const backgroundImage = readProp(properties, "background_image");
    const backgroundFit = readProp(properties, "background_fit");
    const panelPosition = readProp(properties, "panel_position");
    const dataUrl = readProp(properties, "agent_data_url");
    const mediaUrl = readProp(properties, "media_data_url");
    const mediaXPercent = readProp(properties, "media_x_percent");
    const mediaYPercent = readProp(properties, "media_y_percent");
    const providerName = readProp(properties, "provider_name");
    const weeklyLimitHours = readProp(properties, "weekly_limit_hours");
    const pollSeconds = readProp(properties, "poll_seconds");
    const showTokens = readProp(properties, "show_tokens");
    const accentColor = readProp(properties, "accent_color");
    const panelOpacity = readProp(properties, "panel_opacity");
    const visualizerIntensity = readProp(properties, "visualizer_intensity");
    const testMode = readProp(properties, "test_mode");

    if (backgroundImage !== undefined) settings.backgroundImage = backgroundImage || defaults.backgroundImage;
    if (backgroundFit !== undefined) settings.backgroundFit = backgroundFit;
    if (panelPosition !== undefined) settings.panelPosition = panelPosition;
    if (dataUrl !== undefined) settings.dataUrl = dataUrl || "";
    if (mediaUrl !== undefined) settings.mediaUrl = mediaUrl || defaults.mediaUrl;
    if (mediaXPercent !== undefined) {
      settings.mediaXPercent = clamp(Number(mediaXPercent) || defaults.mediaXPercent, 10, 32);
    }
    if (mediaYPercent !== undefined) {
      settings.mediaYPercent = clamp(Number(mediaYPercent) || defaults.mediaYPercent, 4, 22);
    }
    if (providerName !== undefined) settings.providerName = providerName || defaults.providerName;
    if (weeklyLimitHours !== undefined) settings.weeklyLimitHours = Number(weeklyLimitHours) || defaults.weeklyLimitHours;
    if (pollSeconds !== undefined) settings.pollSeconds = Number(pollSeconds) || defaults.pollSeconds;
    if (showTokens !== undefined) settings.showTokens = Boolean(showTokens);
    if (accentColor !== undefined) settings.accentRgb = parseWallpaperColor(accentColor);
    if (panelOpacity !== undefined) settings.panelOpacity = clamp(Number(panelOpacity) || defaults.panelOpacity, 0.2, 0.95);
    if (visualizerIntensity !== undefined) {
      settings.visualizerIntensity = clamp(Number(visualizerIntensity) || defaults.visualizerIntensity, 0, 1.5);
    }
    if (testMode !== undefined) settings.testMode = Boolean(testMode);

    applySettings();
    scheduleRefresh();
    scheduleMediaRefresh();
  }

  window.wallpaperPropertyListener = { applyUserProperties };

  if (hasWallpaperAudioApi) {
    window.wallpaperRegisterAudioListener((audioArray) => {
      audio.lastRealFrame = performance.now();
      for (let i = 0; i < audio.raw.length; i += 1) {
        audio.raw[i] = Number(audioArray[i]) || 0;
      }
    });
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(window.innerWidth * dpr);
    const height = Math.floor(window.innerHeight * dpr);
    if (els.canvas.width !== width || els.canvas.height !== height) {
      els.canvas.width = width;
      els.canvas.height = height;
      els.canvas.style.width = `${window.innerWidth}px`;
      els.canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function simulateAudio(now) {
    const time = now / 1000;
    for (let i = 0; i < audio.raw.length; i += 1) {
      const band = i % 64;
      const bass = Math.max(0, 1 - band / 18) * (0.28 + Math.sin(time * 2.2) * 0.18);
      const sweep = Math.max(0, 1 - Math.abs(band - ((time * 10) % 64)) / 16) * 0.26;
      audio.raw[i] = clamp(bass + sweep + Math.random() * 0.035, 0, 1);
    }
  }

  function analyzeBands(now) {
    if (!hasWallpaperAudioApi || settings.testMode) simulateAudio(now);

    const bins = audio.raw;
    let bass = 0;
    let mid = 0;
    let treble = 0;
    for (let i = 0; i < 128; i += 1) {
      const value = bins[i] || 0;
      const band = i % 64;
      if (band < 12) bass += value / 24;
      else if (band < 36) mid += value / 48;
      else treble += value / 56;
    }

    const next = {
      bass: clamp(bass, 0, 1),
      mid: clamp(mid, 0, 1),
      treble: clamp(treble, 0, 1),
      energy: clamp(bass * 0.48 + mid * 0.34 + treble * 0.18, 0, 1),
    };

    for (const key of Object.keys(next)) {
      audio.bands[key] += (next[key] - audio.bands[key]) * 0.18;
    }
  }

  function draw(now) {
    resizeCanvas();
    analyzeBands(now);

    const width = window.innerWidth;
    const height = window.innerHeight;
    const intensity = settings.visualizerIntensity;
    const { bass, mid, energy } = audio.bands;

    ctx.clearRect(0, 0, width, height);

    els.bg.style.filter = `brightness(${1.08 + energy * 0.035 * intensity}) saturate(${1.16 + mid * 0.12 * intensity}) contrast(${1.06 + bass * 0.05 * intensity})`;
    els.sceneDepth.style.opacity = (0.1 + energy * 0.045 * intensity).toFixed(3);
    applyMotion();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const glowStrength = (0.035 + energy * 0.085) * intensity;
    const glow = ctx.createRadialGradient(width * 0.38, height * 0.34, 0, width * 0.38, height * 0.34, width * 0.72);
    glow.addColorStop(0, `rgb(${settings.accentRgb.join(" ")} / ${glowStrength})`);
    glow.addColorStop(0.5, `rgb(246 189 96 / ${glowStrength * 0.34})`);
    glow.addColorStop(1, "rgb(0 0 0 / 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("pointermove", updateMotionFromPointer);
  window.addEventListener("pointerleave", () => {
    motion.tx = 0;
    motion.ty = 0;
  });
  applySettings();
  scheduleRefresh();
  scheduleClock();
  scheduleMediaRefresh();
  requestAnimationFrame(draw);
})();
