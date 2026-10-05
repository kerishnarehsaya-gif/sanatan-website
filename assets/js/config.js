/* ============================================================
   SITE CONFIG  —  Sirf yahan edit karna hai
   ============================================================ */

window.SITE_CONFIG = {
  /* ---------- 1. YouTube API Key (zoruri) ---------- */
  /* Google Cloud Console se bana lo, neeche README.md me step-by-step hai */
  apiKey: "YAHAN_API_KEY_PASTE_KARO",

  /* ---------- 2. Channel ki jaankari ---------- */
  channelId: "UCGJgOg24mPVJIjc0y-wwkjA",
  handle: "@sanatanrahasyakathaofficial",

  /* ---------- 3. Website ki jaankari ---------- */
  siteName: "Sanatan Rahasya Katha",
  tagline: "Sanatan Dharma ki Prachin Kathayein, Rahasya aur Dharmic Gyan — Simple Hindi me.",
  keywords:
    "sanatan, sanatan dharma, sanatan katha, rahasya katha, hindu katha, puran katha, धर्म, कथा, सनातन, रहस्य",
  themeColor: "#0d0a07",

  /* ---------- 4. Behaviour ---------- */
  videosPerPage: 24,      /* ek page me kitni videos */
  useCache: true,         /* localStorage me data cache rakhna (speed) */
  cacheMinutes: 15,       /* cache kitni der tak chalega */
  theme: "dark"           /* "dark" ya "light" */
};

/* ============================================================
   SESSION KE LIYE CHAHIYE — isko haath mat lagana
   (har baar khud check karega ki content fresh hai ya nahi)
   ============================================================ */
const _cfg = window.SITE_CONFIG;

/* channelId se uploads playlist id nikalna (UU + channelId[2:]) */
function getUploadsPlaylistId(channelId) {
  return "UU" + channelId.slice(2);
}

/* Channel ID nahi pata? Handle se nikaalne ki koshish.
   (Ye browser me kaam karega, YouTube ka internal endpoint use karke) */
async function resolveChannelIdFromHandle(handle) {
  const url =
    "https://www.youtube.com/@" + handle.replace(/^@/, "") + "/videos";
  const res = await fetch(url, { redirect: "follow" });
  const finalUrl = res.url;
  const m = finalUrl.match(/channel\/(UC[A-Za-z0-9_-]{22})/);
  if (m) return m[1];
  const html = await res.text();
  const m2 = html.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/);
  return m2 ? m2 : null;
}

window.getUploadsPlaylistId = getUploadsPlaylistId;
window.resolveChannelIdFromHandle = resolveChannelIdFromHandle;
