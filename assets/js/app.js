/* ==========================================================
   APP  —  UI logic
   Saara data live YouTube API se aata hai.
   Naya video upload karte hi website par apne aap aa jayega.
   ========================================================== */
(() => {
"use strict";

const CFG = window.SITE_CONFIG;
const YT   = window.YT;
const $    = (s, r = document) => r.querySelector(s);
const $$   = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- state ---------- */
const S = {
  channel: null,
  videos: [],            // saari loaded videos
  nextPageToken: null,   // uploads playlist ka agla page
  exhausted: false,      // saari videos load ho gayi?
  loadingMore: false,
  sort: "latest",
  query: "",
  visible: CFG.videosPerPage,
};

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", init);

let _booted = false;
async function init() {
  if (_booted) return;
  _booted = true;
  initTheme();
  initTabs();
  initSearch();
  initSort();
  initButtons();
  wireSubscribe();

  renderSkeletons();

  try {
    await loadChannel();
    await loadVideos(true);
    await loadPlaylists();
    hideLoader();
  } catch (err) {
    hideLoader();
    handleFatal(err);
  }
}

/* ==========================================================
   THEME
   ========================================================== */
function initTheme() {
  const saved = localStorage.getItem("srk_theme");
  const theme = saved || CFG.theme || "dark";
  document.documentElement.dataset.theme = theme;
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("srk_theme", next);
    wireSubscribe();
  });
}

/* ==========================================================
   TABS
   ========================================================== */
function initTabs() {
  $$(".tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  $$("[data-tab-link]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab(a.dataset.tabLink);
      window.scrollTo({ top: $("#tabsWrap").offsetTop - 70, behavior: "smooth" });
    })
  );
  $$("[data-nav]").forEach((a) =>
    a.addEventListener("click", (e) => { e.preventDefault(); switchTab("home"); window.scrollTo({ top: 0, behavior: "smooth" }); })
  );
  window.addEventListener("hashchange", syncHash);
  syncHash();
}

function switchTab(name) {
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + name));
  if (history.replaceState) history.replaceState(null, "", "#" + name);
  window.scrollTo({ top: $("#tabsWrap").offsetTop - 70, behavior: "smooth" });
}
function syncHash() {
  const h = (location.hash || "").replace("#", "");
  if (h && $("#panel-" + h)) switchTab(h);
}

/* ==========================================================
   CHANNEL LOAD
   ========================================================== */
async function loadChannel() {
  let ch = YT.Cache.get("channel");
  if (!ch) {
    if (!YT.hasApiKey()) {
      // Bina API key ke: config se basic info + RSS se videos
      ch = await loadChannelFallback();
      S.viaRss = true;
      showSetupBanner();
    } else {
      ch = await YT.getChannelInfo();
      YT.Cache.set("channel", ch);
    }
  }
  S.channel = ch;
  renderChannel(ch);
}

/* API key na hone par upar warning banner + key paste box */
function showSetupBanner() {
  if (document.getElementById("setupBanner")) return;
  const b = document.createElement("div");
  b.id = "setupBanner";
  b.className = "setup-banner";
  b.innerHTML = `
    <div class="sb-inner">
      <span class="sb-ic">🔑</span>
      <div class="sb-txt">
        <b>YouTube API key abhi set nahi hai.</b>
        Website abhi bhi chal rahi hai (sirf aakhri 15 videos), par views, Shorts, Playlists
        aur search nahi chalenge.
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Key banayein →</a>
        (Google Cloud → YouTube Data API v3 → Enable → Credentials → API key)
      </div>
      <button class="sb-x" title="Band karein" aria-label="Band karein">&times;</button>
    </div>
    <form class="sb-form" novalidate>
      <input class="sb-input" type="password" inputmode="text" autocomplete="off"
             spellcheck="false" placeholder="AIzaSy... yahan paste karein" aria-label="YouTube API key">
      <button class="sb-btn" type="submit">Save</button>
      <span class="sb-msg" role="status"></span>
    </form>`;
  document.body.prepend(b);

  b.querySelector(".sb-x").addEventListener("click", () => b.remove());

  const form = b.querySelector(".sb-form");
  const input = b.querySelector(".sb-input");
  const msg = b.querySelector(".sb-msg");
  const btn = b.querySelector(".sb-btn");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const key = input.value.trim();
    if (key.length < 20) {
      msg.textContent = "Key chhoti lag rahi hai — poora copy karein.";
      msg.className = "sb-msg bad";
      return;
    }
    YT.saveApiKey(key);
    YT.Cache.clear();
    msg.textContent = "Key save ho gayi — website dobara load ho rahi hai…";
    msg.className = "sb-msg ok";
    btn.disabled = true;
    input.disabled = true;
    setTimeout(() => location.reload(), 600);
  });

  input.addEventListener("input", () => { msg.textContent = ""; });
}


async function loadChannelFallback() {
  // Config se pata chalega, YouTube se confirm nahi kar sakte bina key ke
  return {
    id: CFG.channelId,
    title: CFG.siteName,
    handle: CFG.handle,
    description: "",
    avatar: "", avatarSmall: "",
    banner: "",
    publishedAt: "",
    subscribers: null, videosCount: 0, viewsCount: 0,
    uploadsPlaylistId: getUploadsPlaylistId(CFG.channelId),
    url: "https://www.youtube.com/channel/" + CFG.channelId,
    subscribeUrl: "https://www.youtube.com/channel/" + CFG.channelId + "?sub_confirmation=1",
  };
}

function renderChannel(ch) {
  document.title = ch.title + " — " + (CFG.tagline || "Official Channel");
  $("#brandName").textContent  = ch.title;
  $("#footerName").textContent = ch.title;
  $("#brandSubs").textContent  = ch.subscribers ? YT.fmtViews(ch.subscribers) + " subscribers" : "Official Channel";
  $("#channelName").textContent  = ch.title;
  $("#channelHandle").textContent = ch.handle || CFG.handle;

  if (ch.avatar) $("#avatarImg").src = ch.avatar;
  if (ch.banner) {
    const img = new Image();
    img.alt = ch.title + " banner";
    img.addEventListener("error", () => img.remove());
    img.src = ch.banner;
    $("#heroBanner").prepend(img);
  }

  $("#statSubs").textContent   = ch.subscribers != null ? YT.fmtViews(ch.subscribers) : "—";
  $("#statVideos").textContent = ch.videosCount ? ch.videosCount : "—";
  $("#statViews").textContent  = ch.viewsCount ? YT.fmtViews(ch.viewsCount) : "—";
  $("#statJoined").textContent = ch.publishedAt ? new Date(ch.publishedAt).getFullYear() : "—";

  const desc = $("#channelDesc");
  desc.textContent = ch.description || "";
  desc.title = ch.description || "";

  $("#ytLink").href = ch.url;
  $("#footerYt").href = ch.url;
  $("#ytChannelLink").href = ch.url;
  $("#ytSubscribeLink").href = ch.subscribeUrl;

  // About tab
  $("#aboutDesc").textContent = ch.description || "Description abhi available nahi hai.";
  $("#aboutStats").innerHTML = [
    ["Channel", ch.title],
    ["Handle", ch.handle || CFG.handle],
    ["Subscribers", ch.subscribers != null ? ch.subscribers.toLocaleString("hi-IN") : "Chhupa hua"],
    ["Videos", ch.videosCount || "—"],
    ["Total Views", ch.viewsCount ? ch.viewsCount.toLocaleString("hi-IN") : "—"],
    ["Join kiya", ch.publishedAt ? YT.fmtDate(ch.publishedAt) : "—"],
  ].map(([k, v]) => `<div class="item"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join("");

  injectJsonLd(ch);
  wireSubscribe();
}

/* ==========================================================
   VIDEOS LOAD
   ========================================================== */
async function loadVideos(firstRun = false) {
  if (S.loadingMore || (S.exhausted && !firstRun)) return;
  S.loadingMore = true;
  setBtnBusy($("#loadMore"), true);
  setBtnBusy($("#moreLatest"), true);

  try {
    let newItems = [];

    if (S.viaRss || !YT.hasApiKey()) {
      // ── Fallback: RSS feed (bina API key) ──
      if (firstRun && !S.videos.length) {
        S.videos = await YT.getUploadsViaRSS();
      }
      S.exhausted = true;
    } else {
      // ── Normal: YouTube Data API ──
      const page = await YT.getUploadItems(S.nextPageToken);
      if (page.items.length) {
        const details = await YT.getVideoDetails(page.items.map((i) => i.videoId));
        const byId = new Map(page.items.map((i) => [i.videoId, i.publishedAt]));
        details.forEach((d) => { if (!d.publishedAt) d.publishedAt = byId.get(d.videoId) || ""; });
        newItems = details;
        S.videos = S.videos.concat(newItems);
      }
      S.nextPageToken = page.nextPageToken;
      if (!S.nextPageToken || !page.items.length) S.exhausted = true;
    }

    if (firstRun) { S.visible = CFG.videosPerPage; }
    renderAll();
    updateLoadMoreUI();
  } catch (err) {
    if (err.code === "QUOTA" || err.code === "RATE" || err.code === "NETWORK") {
      toast(err.message);
    } else if (firstRun) {
      handleFatal(err);
    } else {
      toast("Videos load nahi ho payi.");
    }
  } finally {
    S.loadingMore = false;
    setBtnBusy($("#loadMore"), false);
    setBtnBusy($("#moreLatest"), false);
    updateLoadMoreUI();
  }
}

function updateLoadMoreUI() {
  const txt = S.exhausted ? "— Saari videos load ho gayi —" : "Aur videos dekhein";
  for (const b of [$("#loadMore"), $("#moreLatest")]) {
    if (!b) continue;
    if (b.dataset.busy === "1") continue;      // loading text mat chhedo
    if (b.textContent !== txt) b.textContent = txt;
  }
  const done = S.exhausted;
  $("#loadMore").classList.toggle("done", done);
  $("#moreLatest").classList.toggle("done", done);
  $("#allLoadedNote").textContent = done && S.videos.length
    ? "Yahi aapki channel ki saari " + S.videos.length + " videos hain." : "";
  if (S.videos.length) {
    $("#videosCountLabel").textContent =
      S.query ? "'" + S.query + "' ke " + filtered().length + " results"
              : "Saari Videos (" + S.videos.length +
                (S.channel && S.channel.videosCount > S.videos.length ? " / " + S.channel.videosCount : "") + ")";
  }
}

/* ==========================================================
   RENDER
   ========================================================== */
function renderAll() {
  const list = filtered();

  renderGrid($("#gridLatest"), list.slice(0, 12));
  renderGrid($("#gridPopular"), list.slice().sort((a, b) => b.views - a.views).slice(0, 8));

  const paged = list.slice(0, S.visible);
  renderGrid($("#gridAll"), paged);

  renderShorts(list);
  updateLoadMoreUI();
}

function filtered() {
  let list = S.videos.slice();
  if (S.query) {
    const q = S.query.toLowerCase().trim();
    const words = q.split(/\s+/);
    list = list.filter((v) => {
      const hay = (v.title + " " + (v.description || "") + " " + (v.tags || []).join(" ")).toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }
  switch (S.sort) {
    case "popular":  list.sort((a, b) => b.views - a.views); break;
    case "oldest":   list.sort((a, b) => (a.publishedAt || "").localeCompare(b.publishedAt || "")); break;
    case "title":    list.sort((a, b) => a.title.localeCompare(b.title, "hi")); break;
    default:         list.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || "")); break;
  }
  return list;
}

function renderGrid(el, videos) {
  if (!el) return;
  if (!videos.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="ico">${S.query ? "🔍" : "📭"}</div>
      <h3>${S.query ? "Kuch nahi mila" : "Abhi koi video nahi"}</h3>
      <p>${S.query ? "'" + esc(S.query) + "' se related koi video nahi mili." : "Jaise hi channel pe video aayegi, wo yahin dikh jayegi."}</p>
      ${S.query ? '<button class="btn btn-outline" onclick="document.getElementById(\'searchInput\').value=\'\';document.getElementById(\'searchInput\').dispatchEvent(new Event(\'input\'))">Search saaf karein</button>' : ""}
    </div>`;
    return;
  }
  el.innerHTML = videos.map(vCard).join("");
}

function vCard(v) {
  const av = S.channel && S.channel.avatarSmall ? S.channel.avatarSmall : "assets/img/avatar-placeholder.svg";
  return `<article class="vcard" data-id="${v.videoId}">
    <div class="vthumb">
      <img src="${v.thumbnail || v.thumbnailHigh || "assets/img/thumb-placeholder.svg"}" alt="${esc(v.title)}" loading="lazy">
      ${v.durationText ? `<span class="dur">${v.durationText}</span>` : ""}
      ${v.isLive ? '<span class="live">LIVE</span>' : v.isShort ? '<span class="short-badge">SHORT</span>' : ""}
      <div class="play-ov"><span><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></div>
    </div>
    <div class="vbody">
      <img class="vic" src="${av}" alt="" loading="lazy">
      <div class="vmeta">
        <h3 class="vtitle">${esc(v.title)}</h3>
        <div class="vsub">
          <span>${v.views ? YT.fmtViews(v.views) + " views" : "Nayi video"}</span>
          ${v.publishedAt ? '<span class="dot">•</span><span>' + YT.timeAgo(v.publishedAt) + '</span>' : ""}
          ${v.likes ? '<span class="dot">•</span><span>👍 ' + YT.fmtViews(v.likes) + "</span>" : ""}
        </div>
      </div>
    </div>
  </article>`;
}

function renderShorts(list) {
  const shorts = list.filter((v) => v.isShort);
  const el = $("#gridShorts");
  if (!shorts.length) {
    el.innerHTML = "";
    $("#shortsEmpty").hidden = false;
    return;
  }
  $("#shortsEmpty").hidden = true;
  el.innerHTML = shorts.map((v) => `<article class="scard" data-id="${v.videoId}">
      <div class="sthumb">
        <img src="${v.thumbnail || "assets/img/thumb-placeholder.svg"}" alt="${esc(v.title)}" loading="lazy">
        <span class="sb">SHORT</span>
        ${v.durationText ? `<span class="sdur">${v.durationText}</span>` : ""}
      </div>
      <h3 class="stitle">${esc(v.title)}</h3>
    </article>`).join("");
}

function renderSkeletons() {
  const sk = `<div class="sk"><div class="sk-thumb"></div><div class="sk-line"></div><div class="sk-line short"></div></div>`;
  $("#gridLatest").innerHTML = sk.repeat(8);
  $("#gridAll").innerHTML = sk.repeat(8);
  $("#gridPopular").innerHTML = sk.repeat(4);
}

/* ==========================================================
   PLAYLISTS
   ========================================================== */
async function loadPlaylists() {
  const el = $("#gridPlaylists");
  if (!YT.hasApiKey() || S.viaRss) {
    $("#playlistsEmpty").hidden = false;
    $("#playlistsEmpty").textContent = "Playlists dekhne ke liye YouTube API key zaroori hai.";
    return;
  }
  let list = YT.Cache.get("playlists");
  if (!list) {
    try { list = await YT.getChannelPlaylists(); YT.Cache.set("playlists", list); }
    catch (e) { $("#playlistsEmpty").hidden = false; return; }
  }
  if (!list.length) {
    $("#playlistsEmpty").hidden = false;
    return;
  }
  $("#playlistsEmpty").hidden = true;
  el.innerHTML = list.map((p) => `<article class="pcard" data-pl="${p.id}">
      <div class="pthumb">
        <img src="${YT.pickThumb(p.thumbnails, "medium") || "assets/img/thumb-placeholder.svg"}" alt="${esc(p.title)}" loading="lazy">
        <div class="cnt"><svg viewBox="0 0 24 24" style="width:22px;height:22px"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>${p.itemCount}<small>videos</small></div>
      </div>
      <h3 class="ptitle">${esc(p.title)}</h3>
      <div class="vsub"><span>Playlist</span></div>
    </article>`).join("");
}

/* ==========================================================
   CLICK HANDLERS (event delegation)
   ========================================================== */
document.addEventListener("click", (e) => {
  const s = e.target.closest(".scard");
  if (s && s.dataset.id) return openShort(s.dataset.id);

  const v = e.target.closest(".vcard, .rcard");
  if (v && v.dataset.id) return openPlayer(v.dataset.id);

  const p = e.target.closest(".pcard");
  if (p && p.dataset.pl)
    return window.open("https://www.youtube.com/playlist?list=" + p.dataset.pl, "_blank", "noopener");

  if (e.target.closest("[data-close]")) return closeModals();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModals();
});

/* ==========================================================
   PLAYER
   ========================================================== */
let lastFocus = null;

async function openPlayer(id) {
  const v = S.videos.find((x) => x.videoId === id) ||
            (await YT.getVideoDetails([id]).catch(() => null))?.[0];
  if (!v) return toast("Video load nahi ho payi.");
  S.videos = S.videos.some((x) => x.videoId === id) ? S.videos : [v, ...S.videos];

  lastFocus = document.activeElement;
  const modal = $("#playerModal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  $("#mTitle").textContent = v.title;
  $("#mDesc").textContent = v.description || "Is video ka description available nahi hai.";
  $("#mDescToggle").textContent = (v.description || "").length > 120 ? "Description dikhayein" : "Description";
  $("#mMeta").innerHTML = [
    v.views ? YT.fmtViews(v.views) + " views" : "Nayi video",
    v.publishedAt ? YT.timeAgo(v.publishedAt) : "",
    v.likes ? YT.fmtViews(v.likes) + " likes" : "",
    v.durationText || "",
  ].filter(Boolean).join(" • ");

  $("#mYtWatch").onclick = () => window.open(v.url, "_blank", "noopener");
  $("#mCopyLink").onclick = () => copyText(v.url);
  $("#mShare").onclick  = () => share(v.title, v.url);

  $("#playerHost").innerHTML = `<iframe src="${v.embedUrl}"
    title="${esc(v.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
    allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;

  const rl = $("#relatedList");
  rl.innerHTML = Array.from({ length: 5 }).map(() =>
    `<div class="rcard"><img src="assets/img/thumb-placeholder.svg" alt=""><div><div class="rt">&nbsp;</div><div class="rm">&nbsp;</div></div></div>`).join("");

  history.replaceState(null, "", "#watch=" + v.videoId);

  /* Related videos */
  YT.getRelated(v.videoId).then((rel) => {
    if (!rel || !rel.length) { rl.innerHTML = `<p class="muted" style="padding:10px 8px">Aur videos nahi mile.</p>`; return; }
    rl.innerHTML = rel.map((r) => `<div class="rcard" data-id="${r.videoId}">
        <img src="${r.thumbnailHigh || r.thumbnail}" alt="${esc(r.title)}" loading="lazy">
        <div><div class="rt">${esc(r.title)}</div>
        <div class="rm">${r.views ? YT.fmtViews(r.views) + " views" : "Nayi"} ${r.durationText ? "• " + r.durationText : ""}</div></div>
      </div>`).join("");
  }).catch(() => {
    const others = S.videos.filter((x) => x.videoId !== v.videoId).slice(0, 6);
    rl.innerHTML = others.length ? others.map((r) => `<div class="rcard" data-id="${r.videoId}">
        <img src="${r.thumbnailHigh || r.thumbnail}" alt="${esc(r.title)}" loading="lazy">
        <div><div class="rt">${esc(r.title)}</div><div class="rm">${r.views ? YT.fmtViews(r.views) + " views" : "Nayi"}</div></div>
      </div>`).join("") : `<p class="muted">Aur videos nahi mile.</p>`;
  });
}

function openShort(id) {
  const v = S.videos.find((x) => x.videoId === id);
  if (!v) return;
  const modal = $("#shortsModal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  $("#shortsHost").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&rel=0&modestbranding=1"
    title="${esc(v.title)}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
  $("#sTitle").textContent = v.title;
  $("#sMeta").textContent = [v.views ? YT.fmtViews(v.views) + " views" : "Nayi", v.durationText].filter(Boolean).join(" • ");
  $("#sYt").href = v.url;
}

function closeModals() {
  $$(".modal.open").forEach((m) => {
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
  });
  $("#playerHost").innerHTML = "";
  $("#shortsHost").innerHTML = "";
  document.body.classList.remove("modal-open");
  lastFocus && lastFocus.focus && lastFocus.focus();
  if (location.hash.startsWith("#watch=")) history.replaceState(null, "", "#videos");
}

/* ==========================================================
   SEARCH
   ========================================================== */
function initSearch() {
  const main = $("#searchInput"), mob = $("#searchInputMobile");
  let timer;

  const run = (val) => {
    clearTimeout(timer);
    timer = setTimeout(() => applySearch(val), 280);
  };

  main.addEventListener("input", (e) => { $("#clearSearch").hidden = !e.target.value; run(e.target.value); });
  mob.addEventListener("input", (e) => { run(e.target.value); });
  $("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); applySearch(main.value); switchTab("videos"); });
  $("#searchFormMobile").addEventListener("submit", (e) => { e.preventDefault(); applySearch(mob.value); switchTab("videos"); });
  $("#clearSearch").addEventListener("click", () => {
    main.value = ""; mob.value = ""; $("#clearSearch").hidden = true;
    applySearch("");
  });

  // Mobile menu
  $("#mobileMenuBtn").addEventListener("click", () => {
    $("#mobileSearchWrap").classList.toggle("show");
    if ($("#mobileSearchWrap").classList.contains("show")) $("#searchInputMobile").focus();
  });
}

async function applySearch(q) {
  S.query = (q || "").trim();
  S.visible = CFG.videosPerPage;
  $("#searchInput").value = S.query;
  $("#searchInputMobile").value = S.query;
  $("#clearSearch").hidden = !S.query;
  renderAll();

  if (!S.query || !YT.hasApiKey() || S.viaRss) return;

  // Load bachi hui videos taaki puri channel search ho sake
  if (!S.exhausted) { try { await loadMoreUntil(3); } catch (e) {} }

  // Deep search (YouTube ka apna search)
  try {
    const res = await YT.searchChannel(S.query);
    if (res.length) {
      const have = new Set(S.videos.map((v) => v.videoId));
      S.videos = S.videos.concat(res.filter((r) => !have.has(r.videoId)));
      renderAll();
    }
  } catch (e) { /* quota — client-side results kaafi hain */ }
}

async function loadMoreUntil(pages) {
  for (let i = 0; i < pages && !S.exhausted; i++) await loadVideos();
}

/* ==========================================================
   SORT + LOAD MORE + BUTTONS
   ========================================================== */
function initSort() {
  $("#sortSelect").addEventListener("change", (e) => {
    S.sort = e.target.value;
    S.visible = CFG.videosPerPage;
    renderAll();
  });
}

function initButtons() {
  const more = () => { S.visible += CFG.videosPerPage; renderAll(); if (!S.exhausted) loadVideos(); };
  $("#loadMore").addEventListener("click", more);
  $("#moreLatest").addEventListener("click", more);

  $("#copyLinkBtn").addEventListener("click", () => {
    if (S.channel) copyText(S.channel.url);
  });
  $("#shareBtn").addEventListener("click", () => {
    share(S.channel ? S.channel.title : CFG.siteName, location.href);
  });
}

/* Infinite scroll */
let ticking = false;
window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    if (!$("#panel-videos").classList.contains("active")) return;
    const r = $("#loadMore").getBoundingClientRect();
    if (r.top < window.innerHeight + 320) {
      if (S.exhausted) {
        S.visible += CFG.videosPerPage;
        renderAll();
      } else {
        loadVideos();
      }
    }
  });
});

/* ==========================================================
   SUBSCRIBE  —  YouTube ka official subscribe iframe
   ========================================================== */
function wireSubscribe() {
  const f = $("#subscribeFrame");
  if (!f || !S.channel) return;
  const src = "https://www.youtube.com/subscribe_button.html?channel=" +
              S.channel.id + "&theme=" + (document.documentElement.dataset.theme === "light" ? "light" : "dark");
  if (f.src !== src) f.src = src;
}

/* ==========================================================
   UTIL
   ========================================================== */
function copyText(text) {
  const done = () => toast("✅ Link copy ho gaya!");
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); done(); } catch (e) { toast("Copy nahi ho paya"); }
  document.body.removeChild(ta);
}

async function share(title, url) {
  if (navigator.share) {
    try { await navigator.share({ title, url }); return; } catch (e) {}
  }
  copyText(url);
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

function setBtnBusy(btn, busy) {
  if (!btn) return;
  btn.dataset.busy = busy ? "1" : "";
  btn.setAttribute("aria-busy", busy ? "true" : "false");
  if (busy) {
    btn.dataset.prev = btn.textContent;
    btn.textContent = "Loading…";
    btn.classList.add("is-loading");
  } else {
    if (btn.dataset.prev != null) btn.textContent = btn.dataset.prev;
    btn.classList.remove("is-loading");
  }
}

function hideLoader() { $("#pageLoader").classList.add("hide"); }

function handleFatal(err) {
  console.error(err);
  const isKeyIssue = ["NO_KEY", "BAD_KEY"].includes(err.code);
  const html = `<div class="empty-state">
      <div class="ico">${isKeyIssue ? "🔑" : "⚠️"}</div>
      <h3>${isKeyIssue ? "YouTube API key daalni hai" : "Kuch gadbad ho gayi"}</h3>
      <p>${esc(err.message || "Error")}</p>
      ${isKeyIssue ? `<p style="text-align:left;max-width:520px;margin:14px auto;line-height:1.9">
        <b>2 minute me fix:</b><br>
        1. <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" style="color:var(--gold-2)">Google Cloud Console</a> kholein<br>
        2. Naya project banayein → <b>YouTube Data API v3</b> enable karein<br>
        3. <b>Credentials → Create Credentials → API key</b><br>
        4. Key copy karke page ke upar 🔑 banner me box me paste karke <b>Save</b> dabayein<br>
        5. Page khud reload ho jayegi — website chal padegi
      </p>` : ""}
      <button class="btn btn-primary" onclick="YT.Cache.clear();location.reload()">🔄 Dobara try karein</button>
    </div>`;
  ["#gridLatest", "#gridAll", "#gridPopular"].forEach((s) => ($(s).innerHTML = html));
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function injectJsonLd(ch) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ch.title,
    alternateName: ch.handle,
    description: ch.description || CFG.tagline,
    url: location.origin + location.pathname,
    publisher: {
      "@type": "Organization",
      name: ch.title,
      logo: { "@type": "ImageObject", url: ch.avatar || "" },
      sameAs: [ch.url, "https://www.youtube.com/" + (ch.handle || "").replace("@", "")],
    },
  };
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
}

/* ---------- page load pe deep link (#watch=ID) support ---------- */
window.addEventListener("load", () => {
  const m = location.hash.match(/watch=([A-Za-z0-9_-]{11})/);
  if (m) setTimeout(() => openPlayer(m[1]), 900);
});

})();
