(() => {
  "use strict";
  const SRC_W = 1456, SRC_H = 816;
  const FOCUS = { top: "50% 18%", center: "50% 50%", bottom: "50% 85%" };

  // Tear positions measured from the painting (px in 1456×816)
  const SLOTS = [
    { x:573, y:288, w:48, h:117, shape:"images/tear1.png", fall:520, hold:[3800,6200] },
    { x:813, y:419, w:44, h:120, shape:"images/tear2.png", fall:420, hold:[4600,7200] },
  ];

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const src = p => !p ? "" : /^(https?:)?\/\//.test(p) ? p : p.replace(/^\/+/, "");
  const pad = n => String(n).padStart(2, "0");
  const slugify = s => String(s).toLowerCase().normalize("NFKD")
    .replace(/ı/g,"i").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "project";
  const safeUrl = u => /^(https?:|mailto:)/i.test(u || "") ? u : (u ? "https://" + u.replace(/^\/+/, "") : "");

  let PROJECTS = [], SITE = {}, STORE = [], STORE_META = {};
  let cursor = 0, paused = false, hoverEl = null;
  const tearsEl = $("tears"), tag = $("tag");

  /* ---------------- data ---------------- */
  async function load() {
    const get = u => fetch(u, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
    const [site, work, shop] = await Promise.all([
      get("content/site.json"), get("content/projects.json"),
      get("content/store.json").catch(() => ({})),   // store is optional
    ]);
    SITE = site || {};
    STORE = (shop.products || []).filter(p => p && !p.hidden && p.title);
    STORE_META = shop || {};
    const seen = new Set();
    PROJECTS = (work.projects || []).filter(p => p && !p.hidden && p.cover && p.title).map(p => {
      let slug = slugify(p.title), k = 2;
      while (seen.has(slug)) slug = slugify(p.title) + "-" + k++;
      seen.add(slug);
      return { ...p, slug };
    });
  }

  /* ---------------- home chrome ---------------- */
  function renderChrome() {
    const socials = (SITE.socials || []).filter(s => s.url);
    const linkHTML = s => `<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">${esc(s.label)}</a>`;
    const homeSocials = socials.filter(s => s.homepage !== false);
    $("socials").innerHTML = homeSocials.map(s => `<li>${linkHTML(s)}</li>`).join("");
    $("m-socials").innerHTML = homeSocials.map(linkHTML).join("");
    const navP = SITE.nav_projects || "Projects";
    $("nav-projects").textContent = navP;
    $("nav-info").textContent = SITE.nav_info || "Info";
    $("count").textContent = " " + pad(PROJECTS.length);
    $("count").hidden = !SITE.show_count;
    if (SITE.name) { $("mark").textContent = SITE.name; }
    if (SITE.list_title || SITE.list_subtitle) {
      const t = esc(SITE.list_title || ""), u = esc(SITE.list_subtitle || "");
      $("now-label").innerHTML = t + (u ? ` <span>${t ? "· " : ""}${u}</span>` : "");
    }
    if (SITE.hint) {
      const parts = SITE.hint.split(/(?<=\.)\s+/);
      $("hint").innerHTML = parts.map(esc).join("<br>");
    }
    const mail = SITE.email ? "mailto:" + SITE.email : "";
    const eh = $("email-home");
    if (mail) { eh.href = mail; eh.textContent = SITE.email; } else eh.remove();

    // Info page
    $("info-title").textContent = SITE.name || "";
    $("info-role").textContent = SITE.role || "";
    $("info-about").textContent = SITE.about || "";
    const ie = $("info-email");
    if (mail) { ie.href = mail; ie.textContent = SITE.email; } else ie.parentElement.querySelector("h2").remove(), ie.remove();
    $("info-loc").textContent = SITE.location || "";
    $("info-socials").innerHTML = socials.map(s => `<li>${linkHTML(s)}</li>`).join("");
    const links = (SITE.links || []).filter(l => l.url);
    $("info-links").innerHTML = links.map(s => `<li>${linkHTML(s)}</li>`).join("");
    if (!links.length) $("info-links-wrap").remove();
    const clients = (SITE.clients || []).filter(c => c.logo);
    if (clients.length) {
      $("clients-title").textContent = SITE.clients_title || "Clients";
      $("clients").innerHTML = clients.map(c => {
        const st = Number(c.height) ? ` style="max-height:${Number(c.height)}px"` : "";
        const img = `<img src="${esc(c.logo)}" alt="${esc(c.name || "")}"${st} loading="lazy">`;
        return `<li>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${img}</a>` : img}</li>`;
      }).join("");
    } else $("clients-wrap").remove();

    // Store
    if (STORE.length) {
      const title = STORE_META.title || "Store";
      $("nav-store").textContent = title;
      $("nav-store").hidden = false;
      $("store-title").textContent = `${title} — ${pad(STORE.length)}`;
      if (STORE_META.intro) { $("store-intro").textContent = STORE_META.intro; $("store-intro").hidden = false; }
      $("store-grid").innerHTML = STORE.map((p, i) => `
        <li><a href="${esc(safeUrl(p.url || STORE_META.store_url))}" target="_blank" rel="noopener" aria-label="${esc(p.title)}${p.price ? ", " + esc(p.price) : ""}">
          <div class="thumb">${p.image ? `<img src="${esc(src(p.image))}" alt="" loading="lazy" decoding="async">` : ""}</div>
          <div class="cap"><span>${esc(p.title)}</span><span class="y">${esc(p.price || "")}</span></div>
        </a></li>`).join("");
    }

    // Index grid
    $("index-title").textContent = `${SITE.nav_projects || "Projects"} — ${pad(PROJECTS.length)}`;
    $("grid").innerHTML = PROJECTS.map((p, i) => `
      <li><button data-i="${i}" aria-label="Open ${esc(p.title)}">
        <div class="thumb"><img src="${esc(src(p.cover))}" alt="" loading="lazy" decoding="async" style="object-position:${FOCUS[p.tear_focus] || FOCUS.center}"></div>
        <div class="cap"><span class="n">${pad(i + 1)}</span><span>${esc(p.title)}</span><span class="y">${esc(p.year || "")}</span></div>
      </button></li>`).join("");
    $("grid").addEventListener("click", e => {
      const b = e.target.closest("button[data-i]"); if (!b) return;
      go("p/" + PROJECTS[+b.dataset.i].slug, b);
    });
  }

  const LIST_SIZE = 4;
  function upcoming(live, count) {
    const n = PROJECTS.length, out = [];
    for (let k = 0; k < n && out.length < count; k++) {
      const i = (cursor + k) % n;
      if (!live.includes(i) && !out.includes(i)) out.push(i);
    }
    return out;
  }
  function renderNow() {
    const live = SLOTS.filter(s => s.current != null).map(s => s.current);
    const next = upcoming(live, LIST_SIZE - live.length);
    const row = (i, on) => `<li class="${on ? "live" : "next"}"><button data-i="${i}"><span class="n">${pad(i + 1)}</span><span class="t">${esc(PROJECTS[i].title)}</span><span class="dot"></span></button></li>`;
    $("now").innerHTML = live.map(i => row(i, true)).join("") + next.map(i => row(i, false)).join("");
  }
  $("now").addEventListener("click", e => {
    const b = e.target.closest("button[data-i]"); if (!b) return;
    go("p/" + PROJECTS[+b.dataset.i].slug, b);
  });

  /* ---------------- tears ---------------- */
  function preload(i) { if (PROJECTS[i]) { const im = new Image(); im.decoding = "async"; im.src = src(PROJECTS[i].cover); } }

  function nextProject(exclude) {
    const n = PROJECTS.length;
    for (let k = 0; k < n; k++) {
      const i = (cursor + k) % n;
      if (!exclude.includes(i)) { cursor = i + 1; preload(cursor % n); return i; }
    }
    return cursor++ % n;
  }

  function timer(ms, fn) {
    let remain = ms, start = 0, id = null, done = false;
    return {
      run(){ if (done || id !== null) return; start = performance.now(); id = setTimeout(() => { done = true; fn(); }, remain); },
      stop(){ if (done || id === null) return; clearTimeout(id); id = null; remain -= performance.now() - start; },
    };
  }

  function makeTear(slot, pi) {
    const p = PROJECTS[pi];
    const el = document.createElement("div");
    el.className = "tear"; el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `Open project: ${p.title}`);
    el.style.cssText = `left:${slot.x/SRC_W*100}%;top:${slot.y/SRC_H*100}%;width:${slot.w/SRC_W*100}%;height:${slot.h/SRC_H*100}%;--shape:url(${slot.shape})`;
    el.innerHTML = `<div class="inner"><div class="rim"></div><div class="pic"></div><div class="gloss"></div></div>`;
    const pic = el.querySelector(".pic");
    pic.style.backgroundImage = `url("${src(p.cover)}")`;
    pic.style.setProperty("--pos", FOCUS[p.tear_focus] || FOCUS.center);
    const open = () => go("p/" + p.slug, el);
    el.addEventListener("click", open);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    el.addEventListener("mouseenter", () => { hoverEl = el; el._timer && el._timer.stop(); tag.textContent = p.title; tag.classList.add("on"); trackTag(); });
    el.addEventListener("mouseleave", () => { hoverEl = null; tag.classList.remove("on"); if (!paused && el._timer) el._timer.run(); });
    el.addEventListener("focus", () => el._timer && el._timer.stop());
    el.addEventListener("blur", () => { if (!paused && el._timer) el._timer.run(); });
    return el;
  }

  function trackTag() {
    if (!hoverEl) return;
    const r = hoverEl.getBoundingClientRect();
    tag.style.left = (r.left + r.width / 2) + "px";
    tag.style.top = (r.top - 34) + "px";
    requestAnimationFrame(trackTag);
  }

  function spawn(slot) {
    const other = SLOTS.filter(s => s !== slot).map(s => s.current);
    const pi = nextProject([...other, slot.current].filter(v => v != null));
    const el = makeTear(slot, pi);
    slot.el = el; slot.current = pi;
    tearsEl.appendChild(el);
    renderNow();
    el._anim = el.animate(reduce ? [{opacity:0},{opacity:1}] : [
      { transform:"translateY(-6%) scale(.08,.04)", opacity:0 },
      { transform:"translateY(-3%) scale(.55,.32)", opacity:1, offset:.35 },
      { transform:"translateY(0) scale(1.06,.9)", offset:.75 },
      { transform:"translateY(0) scale(1)" }
    ], { duration: reduce ? 600 : 1500, easing:"cubic-bezier(.3,.7,.3,1)", fill:"both" });
    if (paused) el._anim.pause();
    const [a, b] = slot.hold;
    el._timer = timer(a + Math.random() * (b - a) + 1500, () => fall(slot, el));
    if (!paused && hoverEl !== el) el._timer.run();
  }

  function fall(slot, el) {
    if (PROJECTS.length < 2 && SLOTS.indexOf(slot) > 0) return;
    const d = slot.fall;
    el._anim = el.animate(reduce ? [{opacity:1},{opacity:0}] : [
      { transform:"translateY(0) scale(1)", easing:"cubic-bezier(.5,0,.8,.6)" },
      { transform:"translateY(28%) scale(.98,1.04)", offset:.34, easing:"cubic-bezier(.55,0,1,.45)" },
      { transform:`translateY(${d*.9}%) scale(.86,1.22)`, opacity:1, offset:.9 },
      { transform:`translateY(${d}%) scale(.8,1.3)`, opacity:0 }
    ], { duration: reduce ? 700 : 2600, fill:"forwards" });
    el._anim.onfinish = () => { if (hoverEl === el) { hoverEl = null; tag.classList.remove("on"); } el.remove(); };
    slot.pending = timer(reduce ? 300 : 700, () => { slot.pending = null; spawn(slot); });
    if (!paused) slot.pending.run();
  }

  function pauseAll(v) {
    if (paused === v) return;
    paused = v;
    document.querySelectorAll(".tear").forEach(el => {
      if (el._anim) v ? el._anim.pause() : el._anim.play();
      if (el._timer) v ? el._timer.stop() : (hoverEl !== el && el._timer.run());
    });
    SLOTS.forEach(s => s.pending && (v ? s.pending.stop() : s.pending.run()));
    document.querySelector(".grain").style.animationPlayState = v ? "paused" : "running";
  }

  /* ---------------- overlays + routing ---------------- */
  let openSheet = null, origin = null, projIdx = -1, lastFocus = null;

  function titleHTML(t) {
    const w = String(t).trim().split(/\s+/);
    if (w.length < 2) return `<i>${esc(t)}</i>`;
    const last = w.pop();
    return `${esc(w.join(" "))} <i>${esc(last)}</i>`;
  }

  function fillProject(i) {
    const p = PROJECTS[i]; projIdx = i;
    $("p-num").textContent = `${pad(i + 1)} / ${pad(PROJECTS.length)}`;
    $("p-title").innerHTML = titleHTML(p.title);
    $("p-desc").textContent = p.description || "";
    const meta = [["Year", p.year], ["Medium", p.category], ["Client", p.client]].filter(m => m[1]);
    $("p-meta").innerHTML = meta.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("");
    const link = $("p-link");
    if (p.link_url) { link.href = safeUrl(p.link_url); link.textContent = (p.link_label || "View project") + " ↗"; link.hidden = false; }
    else link.hidden = true;
    const imgs = [{ image: p.cover, caption: "" }, ...(p.images || []).filter(x => x && (x.image || x.video))];
    $("p-media").innerHTML = imgs.map((m, k) => `
      <figure>${m.video
        ? `<video src="${esc(src(m.video))}" ${m.image ? `poster="${esc(src(m.image))}"` : ""} controls playsinline preload="none" aria-label="${esc(m.caption || p.title)}"></video>`
        : `<img src="${esc(src(m.image))}" alt="${esc(m.caption || p.title)}" ${k ? 'loading="lazy"' : ""} decoding="async">`}
      ${m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : ""}</figure>`).join("");
    document.title = `${p.title} — ${SITE.name || "Gizem Akdağ"}`;
  }

  function radius(x, y) { return Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)); }

  function show(sheet, from) {
    let x = innerWidth / 2, y = innerHeight / 2;
    if (from && from.getBoundingClientRect) { const r = from.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    const prev = openSheet;
    const swap = prev && prev !== sheet;
    const fresh = !prev;
    if (fresh) { lastFocus = from || document.activeElement; origin = { x, y }; }
    openSheet = sheet;
    pauseAll(true); tag.classList.remove("on");
    sheet.hidden = false;
    if (fresh || sheet.id !== "index") sheet.scrollTop = 0;
    if (swap) {
      sheet.style.zIndex = 21;
      sheet.classList.remove("open");
      const a = sheet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 1 : 380, easing: "ease-out" });
      requestAnimationFrame(() => sheet.classList.add("open"));
      a.onfinish = () => { if (prev === openSheet) return; prev.hidden = true; prev.classList.remove("open"); sheet.style.zIndex = ""; };
      const c = sheet.querySelector("[data-close]"); c && c.focus({ preventScroll: true });
    } else if (fresh) {
      sheet.animate([{ clipPath:`circle(0px at ${x}px ${y}px)` }, { clipPath:`circle(${radius(x,y)}px at ${x}px ${y}px)` }],
        { duration: reduce ? 1 : 750, easing:"cubic-bezier(.7,0,.2,1)" });
      requestAnimationFrame(() => sheet.classList.add("open"));
      const c = sheet.querySelector("[data-close]"); c && c.focus({ preventScroll: true });
    } else {
      sheet.classList.remove("open");
      requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add("open")));
    }
  }

  function hide() {
    if (!openSheet) return;
    const sheet = openSheet; openSheet = null; projIdx = -1;
    let { x, y } = origin || { x: innerWidth / 2, y: innerHeight / 2 };
    if (lastFocus && lastFocus.isConnected && lastFocus.getBoundingClientRect) {
      const r = lastFocus.getBoundingClientRect(); if (r.width) { x = r.left + r.width / 2; y = r.top + r.height / 2; }
    }
    sheet.classList.remove("open");
    const a = sheet.animate([{ clipPath:`circle(${radius(x,y)}px at ${x}px ${y}px)` }, { clipPath:`circle(0px at ${x}px ${y}px)` }],
      { duration: reduce ? 1 : 600, easing:"cubic-bezier(.6,0,.3,1)", fill:"forwards" });
    a.onfinish = () => {
      sheet.hidden = true; a.cancel();
      pauseAll(false);
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    };
    document.title = `${SITE.name || "Gizem Akdağ"} — ${SITE.role || "Portfolio"}`;
  }

  // Closing a project returns to the Index; closing Index or Info returns home.
  function closeCurrent() {
    if (openSheet && openSheet.id === "sheet") go("index"); else go("");
  }

  let pendingFrom = null;
  function go(route, from) {
    pendingFrom = from || null;
    const h = "#/" + route;
    if (location.hash === h) route_(); else location.hash = h;
  }

  function route_() {
    const r = location.hash.replace(/^#\/?/, "");
    const from = pendingFrom; pendingFrom = null;
    if (r.startsWith("p/")) {
      const i = PROJECTS.findIndex(p => p.slug === r.slice(2));
      if (i < 0) return go("");
      fillProject(i); show($("sheet"), from);
    } else if (r === "index") { show($("index"), from); }
    else if (r === "store" && STORE.length) { show($("store"), from); }
    else if (r === "info") { show($("info"), from); }
    else hide();
  }
  addEventListener("hashchange", route_);

  document.addEventListener("click", e => {
    const o = e.target.closest("[data-open]"); if (o) { go(o.dataset.open, o); return; }
    const c = e.target.closest("[data-close]"); if (c) { closeCurrent(); }
  });
  $("p-next").addEventListener("click", () => go("p/" + PROJECTS[(projIdx + 1) % PROJECTS.length].slug));
  $("p-prev").addEventListener("click", () => go("p/" + PROJECTS[(projIdx - 1 + PROJECTS.length) % PROJECTS.length].slug));
  addEventListener("keydown", e => {
    if (!openSheet) return;
    if (e.key === "Escape") closeCurrent();
    if (openSheet.id === "sheet" && e.key === "ArrowRight") $("p-next").click();
    if (openSheet.id === "sheet" && e.key === "ArrowLeft") $("p-prev").click();
  });
  document.addEventListener("visibilitychange", () => { if (!openSheet) pauseAll(document.hidden); });

  /* ---------------- boot ---------------- */
  load().then(() => {
    renderChrome();
    if (PROJECTS.length) {
      spawn(SLOTS[0]);
      if (PROJECTS.length > 1) setTimeout(() => spawn(SLOTS[1]), reduce ? 0 : 900);
    }
    route_();
  }).catch(err => {
    console.error(err);
    $("hint").textContent = "Projects could not load. Please refresh.";
  });
})();
