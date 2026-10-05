# 🕉 Sanatan Rahasya Katha — Official Website

Ye aapke YouTube channel **[@sanatanrahasyakathaofficial](https://www.youtube.com/@sanatanrahasyakathaofficial)** ki poori website hai.

> ⚠️ **Isme koi bhi dummy video ya fake content nahi hai.**
> Saari videos, subscribers, views, likes — sab kuch **seedha aapke YouTube channel se live** aata hai.
> Aap jab bhi nayi video upload karoge, website par **apne aap** aa jayegi.

---

## 📁 Kya kya hai isme

| Feature | Detail |
|---|---|
| 🎬 Channel Hero | Banner, logo, naam, handle, subscribers, video count, total views |
| 🔔 Subscribe | YouTube ka **official subscribe button** (andar hi subscribe) |
| 📺 Videos Tab | Saari videos — nayi pehle, popular, purani, A–Z sort |
| ⚡ Shorts Tab | 60 second se chhoti videos alag grid me, vertical player |
| 📚 Playlists | Aapke channel ke saare playlists |
| 🔍 Search | Channel ke andar hi search (title + description + tags) |
| ▶️ Player | Website par hi video play, uske neeche "isi channel se aur videos" |
| 📖 About | Poora description, channel stats, links |
| 📱 Mobile | Bilkul responsive — phone par bhi sahi chalta hai |
| 🌙 Theme | Dark + Light toggle |
| 🔗 Share / Copy Link | Ek click me link copy ya WhatsApp par share |
| ⚡ Auto update | Koi manual kaam nahi — upload karo, dikh jayega |

---

## 🚀 STEP 1 — YouTube API Key banana (2 minute, FREE)

Bina API key ke YouTube ki videos website par nahi aa sakti. Key banane ke liye:

1. [Google Cloud Console](https://console.cloud.google.com/) kholein
2. Upar **project selector** me **NEW PROJECT** click karke project banayein (koi bhi naam de do)
3. Left menu → **APIs & Services** → **Library**
4. Search karo **YouTube Data API v3** → uspar **Enable** click karo
5. Left menu → **APIs & Services** → **Credentials**
6. Upar **CREATE CREDENTIALS** → **API key**
7. ⚠️ **Referer restriction zaroor lagao** (security ke liye):
   - **Application restrictions** → **HTTP referrers (web sites)**
   - **Add new referrer** me likho:
     ```
     *
     ```
     (Hosting ke baad apni domain bhi daal sakte ho, jaise `https://aapki-site.netlify.app/*`)
8. **Create** dabayein → key copy karein

---

## 🔧 STEP 2 — Key lagana

`assets/js/config.js` kholein aur pehli line me key paste karein:

```js
apiKey: "AIzaSy...aapki-key-yahan",
```

Bas. **Website chalu hai.** 🎉

Baaki sab kuch pehle se set hai:
```js
channelId: "UCGJgOg24mPVJIjc0y-wwkjA",        // aapka channel
handle:    "@sanatanrahasyakathaofficial",   // aapka handle
```

---

## 💻 STEP 3 — Apne computer par test karna

Project folder me terminal kholein aur:

```bash
python3 -m http.server 8000
```

Ab browser me kholein: **http://localhost:8000**

> ⚠️ `index.html` ko double-click karke mat kholein — `file://` par API nahi chalti, hamesha server use karein.

---

## 🌐 STEP 4 — Website LIVE karna (FREE hosting)

### Option A — Netlify (sabse aasan, drag & drop)

1. [app.netlify.com/drop](https://app.netlify.com/drop) kholein
2. Apna `sanatan-website` folder usme **drag kar dein**
3. 5 second me live URL mil jayega, jaise:
   `https://sanatan-website-abc123.netlify.app`
4. Domain connect karna ho to → **Site settings → Domain management → Add custom domain**

### Option B — Vercel

```bash
npm i -g vercel
cd sanatan-website
vercel
```

### Option C — GitHub Pages (free + automatic)

```bash
cd sanatan-website
git init && git add . && git commit -m "Sanatan website"
git branch -M main
git remote add origin https://github.com/AAPKA-USERNAME/sanatan-website.git
git push -u origin main
```

Phir GitHub repo → **Settings → Pages** → Source: `main` / `root` → Save.
URL milegi: `https://AAPKA-USERNAME.github.io/sanatan-website`

---

## ⚙️ Config options (`assets/js/config.js`)

```js
apiKey        : "..."                    // YouTube API key
channelId     : "UC..."                  // Channel ID (badalna ho tabhi)
handle        : "@..."                   // YouTube handle
siteName      : "Sanatan Rahasya Katha"  // Site ka naam
tagline       : "..."                    // Tagline
videosPerPage : 24                       // Ek page me kitni videos
cacheMinutes  : 15                       // Data kitni der cache kare (0 = no cache)
theme         : "dark"                   // "dark" ya "light"
```

---

## ❓ Common Problems aur Solutions

**Key daale bina bhi website chalti hai — kyun?**
→ Bina key ke website YouTube ke **public RSS feed** se aakhri 15 videos dikhati hai.
→ Par **subscribers count, views, likes, duration, Shorts, Playlists aur proper search** tabhi chalte hain jab key ho.
→ Isliye key zaroor daalein — upar 🔑 banner dikhta hai usi ka reminder hai.

**"YouTube API key set nahi hai" dikha raha hai**
→ `config.js` me `apiKey` me asli key paste nahi ki.

**"API quota khatam ho gaya"**
→ Free quota **10,000 units/day** hota hai. Har page visit ~3 units lagte hain.
→ `cacheMinutes: 60` kar do, ya nayi key bana lo.

**"API key galat hai / referrer"**
→ Cloud Console me **HTTP referrers** me `*` add karo, ya restriction hatao
→ 10-15 minute wait karo — nayi key turant active hoti hai

**Subscribe button kaam nahi kar raha**
→ Subscribe iframe tabhi chalta hai jab aap **us browser me YouTube se logged in** ho.
→ Hota hai tabhi jayein, tab chalti hai.

**Videos nahi dikh rahi**
→ Browser me `Ctrl + Shift + R` (hard refresh) dabao
→ Neeche "Dobara try karein" button dabao

---

## 📂 File structure

```
sanatan-website/
├── index.html                 ← main page (sab markup)
├── 404.html                   ← page not found
├── manifest.json              ← PWA (app install)
├── robots.txt
├── README.md                  ← ye guide
└── assets/
    ├── css/style.css          ← pura design
    ├── js/
    │   ├── config.js          ← ⚙️ SIRF yahan edit karna hai
    │   ├── api.js             ← YouTube API connection
    │   └── app.js             ← website ka logic
    └── img/                   ← logo, icons, placeholders
```

**Sirf `assets/js/config.js` ko chhedna hai.** Baaki sab automatic chalega.

---

## 🎨 Design badalna ho?

- **Colors** → `assets/css/style.css` ke upar `:root` me `--gold`, `--saffron`, `--bg`
- **Logo** → `assets/img/logo.svg`, `avatar-placeholder.svg`, `icon-512.png`
- **Theme default** → `config.js` me `theme`

---

## 📌 Jaaan-boojh kar

- Website **har visitor** ke browser me YouTube API call karti hai — iska matlab aapki key ka daily quota wahi consume hota hai.
- Isiliye `cacheMinutes` zyada rakhein (30–60 min). Naya video aate hi max 1 ghante me dikh jayega.
- Chaahein to **refresh button** me bhi force-reload (cache clear) karwa sakte hain.
- Website par sirf **metadata** (title, thumbnail, views, description) dikhta hai — video ki asli copy nahi. Video YouTube ke player me hi chalti hai.

---

**🕉 धन्यवाद! Jai Sanatan.**
