/* ============================================================
   YOUTUBE DATA API v3  —  Wrapper layer
   Saara data asli channel se aata hai, koi dummy nahi.
   ============================================================ */

const YT_API = "https://www.googleapis.com/youtube/v3/";
const CFG = window.SITE_CONFIG;

class YouTubeError extends Error {
  constructor(msg, code) {
    super(msg);
    this.name = "YouTubeError";
    this.code = code;
  }
}

/* ---------- API key ----------
   Pehle localStorage me user ki pasted key, warna config.js wali.
   Note: key ka naam "yt_" se start nahi hota, warna Cache.clear() use mita dega. */
const KEY_STORE = "srk_apikey";
const PLACEHOLDER_KEY = "YAHAN_API_KEY_PASTE_KARO";

const getApiKey = () => {
  try {
    const saved = (localStorage.getItem(KEY_STORE) || "").trim();
    if (saved) return saved;
  } catch (e) {}
  const k = (CFG.apiKey || "").trim();
  return k === PLACEHOLDER_KEY ? "" : k;
};

const hasApiKey = () => getApiKey().length > 20;

const saveApiKey = (k) => {
  const v = (k || "").trim();
  if (!v) return false;
  localStorage.setItem(KEY_STORE, v);
  return true;
};

const clearApiKey = () => {
  try { localStorage.removeItem(KEY_STORE); } catch (e) {}
};

/* ---------- low level fetch + quota/error handling ---------- */
async function ytFetch(endpoint, params = {}) {
  if (!hasApiKey()) {
    throw new YouTubeError(
      "YouTube API key set nahi hai. Website par 🔑 banner me key paste karein.",
      "NO_KEY"
    );
  }
  const url = new URL(YT_API + endpoint);
  url.searchParams.set("key", getApiKey());
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  let res;
  try {
    res = await fetch(url.toString());
  } catch (e) {
    throw new YouTubeError("Internet connection check karein.", "NETWORK");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const reason = (data.error && data.error.errors && data.error.errors[0] && data.error.errors[0].reason) || "";
    if (reason === "quotaExceeded" || res.status === 403)
      throw new YouTubeError("API quota khatam ho gaya. Kal dubara try karein ya nayi key banayein.", "QUOTA");
    if (reason === "dailyLimitExceeded" || reason === "rateLimitExceeded")
      throw new YouTubeError("API request limit cross ho gaya. Thodi der baad try karein.", "RATE");
    if (reason === "keyInvalid" || reason === "badRequest")
      throw new YouTubeError("API key galat hai ya referrer restriction laga hua hai.", "BAD_KEY");
    throw new YouTubeError("YouTube API error: " + ((data.error && data.error.message) || res.status), "API");
  }
  return data;
}

/* ---------- helpers ---------- */
function pickThumb(t, prefer = "maxres") {
  if (!t) return "";
  const order = [prefer, "standard", "high", "medium", "default"];
  for (const k of order) if (t[k] && t[k].url) return t[k].url;
  const keys = Object.keys(t);
  return keys.length ? t[keys[keys.length - 1]].url : "";
}

function parseDuration(iso) {
  if (!iso) return 0;
  const m = String(iso).match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, d, h, mi, s] = m.map((x) => (x ? parseInt(x, 10) : 0));
  return d * 86400 + h * 3600 + mi * 60 + s;
}

function fmtDuration(sec) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/* Indian numbering: 1,00,000 = 1 L, 1,00,00,000 = 1 Cr */
function fmtViews(n) {
  n = Number(n) || 0;
  const cut = (v, keep) => {
    const s = v.toFixed(keep);
    return s.replace(/\.0+$/, "");
  };
  if (n >= 1e7) return cut(n / 1e7, n / 1e7 < 10 ? 2 : 1) + " Cr";
  if (n >= 1e5) return cut(n / 1e5, n / 1e5 < 100 ? 2 : 1) + " L";
  if (n >= 1000) return cut(n / 1000, n / 1000 < 100 ? 1 : 0) + "K";
  return String(n);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("hi-IN", { year: "numeric", month: "short", day: "numeric" });
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "abhi";
  if (diff < 3600) return Math.floor(diff / 60) + " minute pehle";
  if (diff < 86400) return Math.floor(diff / 3600) + " ghante pehle";
  if (diff < 2592000) return Math.floor(diff / 86400) + " din pehle";
  if (diff < 31536000) return Math.floor(diff / 2592000) + " mahine pehle";
  return Math.floor(diff / 31536000) + " saal pehle";
}

/* ============================================================
   1. CHANNEL INFO  (name, avatar, banner, subs, video count)
   ============================================================ */
async function getChannelInfo() {
  const d = await ytFetch("channels", {
    part: "snippet,statistics,contentDetails,brandingSettings,topicDetails",
    id: CFG.channelId,
  });
  if (!d.items || !d.items.length)
    throw new YouTubeError("Channel nahi mila. config.js me channelId check karein.", "NO_CHANNEL");
  const it = d.items[0];
  const st = it.statistics || {};
  const sn = it.snippet || {};

  return {
    id: it.id,
    title: (it.brandingSettings && it.brandingSettings.channel && it.brandingSettings.channel.title) || sn.title || CFG.siteName,
    handle: sn.customUrl ? "@" + sn.customUrl.replace(/^@/, "") : CFG.handle,
    description: sn.description || "",
    avatar: pickThumb(sn.thumbnails, "high"),
    avatarSmall: pickThumb(sn.thumbnails, "medium"),
    banner: (sn.banner && (sn.banner.desktop || sn.banner.ytBanner)) || "",
    publishedAt: sn.publishedAt || "",
    country: sn.country || "",
    keywords: (it.topicDetails && it.topicDetails.keywords) || [],
    subscribers: st.hiddenSubscriberCount ? null : Number(st.subscriberCount || 0),
    videosCount: Number(st.videoCount || 0),
    viewsCount: Number(st.viewCount || 0),
    uploadsPlaylistId:
      (it.contentDetails && it.contentDetails.relatedPlaylists && it.contentDetails.relatedPlaylists.uploads) ||
      getUploadsPlaylistId(it.id),
    url: "https://www.youtube.com/channel/" + it.id,
    subscribeUrl: "https://www.youtube.com/channel/" + it.id + "?sub_confirmation=1",
  };
}

/* ============================================================
   2. UPLOADS PLAYLIST se video IDs  (newest pehle)
   ============================================================ */
async function getUploadItems(pageToken) {
  const d = await ytFetch("playlistItems", {
    part: "contentDetails,snippet,status",
    playlistId: getUploadsPlaylistId(CFG.channelId),
    maxResults: 50,
    pageToken: pageToken || undefined,
  });
  const items = (d.items || [])
    .filter((x) => x.status && x.status.privacyStatus !== "private")
    .filter((x) => x.contentDetails && x.contentDetails.videoId)
    .filter((x) => x.snippet && x.snippet.title !== "Private video")
    .map((x) => ({
      videoId: x.contentDetails.videoId,
      title: x.snippet.title,
      publishedAt: x.snippet.publishedAt,
    }));
  return { items, nextPageToken: d.nextPageToken || null, total: (d.pageInfo && d.pageInfo.totalResults) || 0 };
}

/* ============================================================
   3. VIDEO DETAILS  (views, likes, duration, description)
   ============================================================ */
async function getVideoDetails(ids) {
  if (!ids.length) return [];
  const d = await ytFetch("videos", {
    part: "snippet,statistics,contentDetails",
    id: ids.join(","),
  });
  return (d.items || []).map((v) => {
    const sn = v.snippet || {}, st = v.statistics || {}, cd = v.contentDetails || {};
    const dur = parseDuration(cd.duration);
    return {
      videoId: v.id,
      title: sn.title || "",
      description: sn.description || "",
      thumbnail: pickThumb(sn.thumbnails, "maxres") || pickThumb(sn.thumbnails, "high"),
      thumbnailHigh: pickThumb(sn.thumbnails, "high"),
      thumbnailSmall: pickThumb(sn.thumbnails, "medium"),
      publishedAt: sn.publishedAt || "",
      channelTitle: sn.channelTitle || CFG.siteName,
      tags: sn.tags || [],
      views: Number(st.viewCount || 0),
      likes: Number(st.likeCount || 0),
      comments: Number(st.commentCount || 0),
      duration: dur,
      durationText: fmtDuration(dur),
      width: Number(cd.width || 0),
      height: Number(cd.height || 0),
      isShort: dur > 0 && dur <= 61,
      isLive: sn.liveBroadcastContent === "live" || sn.liveBroadcastContent === "upcoming",
      url: "https://www.youtube.com/watch?v=" + v.id,
      embedUrl: "https://www.youtube-nocookie.com/embed/" + v.id + "?autoplay=1&rel=0",
    };
  });
}

/* ============================================================
   4. CHANNEL KE PLAYLISTS
   ============================================================ */
async function getChannelPlaylists() {
  const d = await ytFetch("playlists", {
    part: "snippet,contentDetails",
    channelId: CFG.channelId,
    maxResults: 50,
  });
  return (d.items || [])
    .filter((x) => x.snippet)
    .map((p) => ({
      id: p.id,
      title: p.snippet.title,
      description: p.snippet.description || "",
      thumbnails: p.snippet.thumbnails || {},
      itemCount: p.contentDetails ? Number(p.contentDetails.itemCount || 0) : 0,
    }));
}

/* ============================================================
   5. VIDEO KE andar se related videos (sirf hamare channel)
   ============================================================ */
async function getRelated(videoId) {
  const d = await ytFetch("search", {
    part: "snippet",
    relatedToVideoId: videoId,
    type: "video",
    maxResults: 20,
    channelId: CFG.channelId,
  });
  const ids = (d.items || [])
    .map((i) => i.id.videoId)
    .filter((id) => id && id !== videoId);
  return getVideoDetails(ids.slice(0, 12));
}

/* ============================================================
   6. CHANNEL KE ANDAR SEARCH  (videos + playlists)
   ============================================================ */
async function searchChannel(q) {
  const d = await ytFetch("search", {
    part: "snippet",
    q: q,
    type: "video",
    channelId: CFG.channelId,
    maxResults: 50,
  });
  const ids = (d.items || []).map((i) => i.id.videoId).filter(Boolean);
  return getVideoDetails(ids);
}

/* ============================================================
   7. FALLBACK: YouTube RSS  (bina key ke, last 15 videos)
   ============================================================ */
async function getUploadsViaRSS() {
  const url = "https://www.youtube.com/feeds/videos.xml?channel_id=" + CFG.channelId;
  const res = await fetch(url);
  if (!res.ok) throw new YouTubeError("RSS feed nahi mila.", "RSS");
  const xml = new DOMParser().parseFromString(await res.text(), "application/xml");

  if (xml.querySelector("parsererror")) throw new YouTubeError("RSS feed parse nahi hui.", "RSS");

  /* Namespaced tags (yt:videoId, media:thumbnail) ke liye localName se dhoondte hain */
  const byName = (root, name) => {
    const list = root.getElementsByTagNameNS("*", name);
    return list.length ? list[0] : null;
  };

  const channelTitle = (byName(xml, "title") || {}).textContent || CFG.siteName;
  const entries = [...xml.getElementsByTagNameNS("*", "entry")];
  if (!entries.length) throw new YouTubeError("RSS feed khaali hai.", "RSS");

  const out = [];
  for (const e of entries) {
    const vid = (byName(e, "videoId") || {}).textContent || "";
    if (!vid) continue;
    const thumbEl = byName(e, "thumbnail");
    const thumb = thumbEl ? thumbEl.getAttribute("url") || "" : "";
    out.push({
      videoId: vid,
      title: (byName(e, "title") || {}).textContent || "",
      description: (byName(e, "description") || {}).textContent || "",
      publishedAt: (byName(e, "published") || {}).textContent || "",
      thumbnail: thumb, thumbnailHigh: thumb, thumbnailSmall: thumb,
      views: 0, likes: 0, comments: 0,
      duration: 0, durationText: "", width: 0, height: 0,
      isShort: false, isLive: false,
      channelTitle,
      tags: [],
      url: "https://www.youtube.com/watch?v=" + vid,
      embedUrl: "https://www.youtube-nocookie.com/embed/" + vid + "?autoplay=1&rel=0",
    });
  }
  if (!out.length) throw new YouTubeError("RSS feed me koi video nahi mili.", "RSS");
  return out;
}

/* ---------- localStorage cache ---------- */
const Cache = {
  get(key) {
    if (!CFG.useCache) return null;
    try {
      const raw = localStorage.getItem("yt_" + key);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (Date.now() - o.t > CFG.cacheMinutes * 60000) return null;
      return o.v;
    } catch (e) { return null; }
  },
  set(key, val) {
    if (!CFG.useCache) return;
    try { localStorage.setItem("yt_" + key, JSON.stringify({ t: Date.now(), v: val })); } catch (e) {}
  },
  clear() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith("yt_")).forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
  },
};

/* ---------- expose ---------- */
window.YT = {
  YouTubeError, hasApiKey, getApiKey, saveApiKey, clearApiKey,
  getChannelInfo, getUploadItems, getVideoDetails,
  getChannelPlaylists, getRelated, searchChannel, getUploadsViaRSS, Cache,
  fmtDuration, fmtViews, fmtDate, timeAgo, pickThumb,
};
