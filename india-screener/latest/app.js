window.ISC = (() => {
  const NAV = [["index.html","Daily"],["scan.html","Scanner"],["breadth.html","Breadth"],["groups.html","Groups"]];
  const fmt = (v, d = 1) => (v === null || v === undefined || Number.isNaN(v)) ? "[DATA NEEDED]"
    : (typeof v === "number" ? v.toLocaleString("en-IN", {maximumFractionDigits: d, minimumFractionDigits: d}) : String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])));
  const cls = v => (typeof v === "number") ? (v > 0 ? "up" : v < 0 ? "down" : "") : "";
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const groupKey = s => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  const groupHref = name => "groups.html#stockrrg/" + encodeURIComponent(String(name ?? "").trim());
  const groupRrgHref = name => "groups.html#tab=rrg&g=" + encodeURIComponent(String(name ?? "").trim());
  // destination: 'rrg' (default; MSI group RRG with the group pinned) | 'stock' (Stock RRG directly, used inside the Groups tables)
  // groups that have an MSI rank row in groups.json; filled when groups.json is loaded (null = unknown -> always link)
  let KNOWN_GROUPS = null;
  const gkStrip = x => groupKey(String(x ?? "").replace(/\s+IN\s*$/i, ""));
  const setKnownGroups = list => { try { KNOWN_GROUPS = Array.isArray(list) && list.length ? new Set(list.map(g => gkStrip(g && g.Group))) : null; } catch (e) { KNOWN_GROUPS = null; } };
  const groupKnown = name => !KNOWN_GROUPS || KNOWN_GROUPS.has(gkStrip(name));
  function groupLink(name, label, opts) {
    if (label && typeof label === "object") { opts = label; label = null; }
    const dest = (opts && opts.destination) || "rrg";
    const n = String(name ?? "").trim(), t = label == null ? n : String(label);
    if (!n) return esc(t);
    if (!groupKnown(n)) return `<span class="gnl" title="no MSI rank for this group">${esc(t)}</span>`;
    const href = dest === "stock" ? groupHref(n) : groupRrgHref(n);
    return `<a class="gl" href="${esc(href)}" title="${dest === "stock" ? "Open Stock RRG for " : "Open MSI group plot (RRG) for "}${esc(n)}" onclick="event.stopPropagation()">${esc(t)}</a>`;
  }
  // Simple Weinstein-style stage from MSI price-vs-DMA fields (not the reference project's classifier). null => true missing.
  function msiStage(s) {
    const p50 = s && s.Pct_Chg_vs_50DMA, p200 = s && s.Pct_Chg_vs_200DMA;
    if (p50 === null || p50 === undefined || p200 === null || p200 === undefined || Number.isNaN(p50) || Number.isNaN(p200)) return null;
    const r50 = 1 + p50 / 100, r200 = 1 + p200 / 100, m = r200 / r50;   // price/MA ratios; MA50/MA200
    if (r50 > 1 && r200 > 1 && m > 1) return 2;
    if (r50 < 1 && r200 < 1 && m < 1) return 4;
    if (r50 < 1 && m > 1) return 3;
    return 1;
  }
  async function load(name) {
    const r = await fetch(`data/${name}.json`);
    if (!r.ok) { document.body.insertAdjacentHTML("afterbegin", `<div class="err">Could not load ${esc(name)} (${r.status})</div>`); throw new Error(name); }
    const j = await r.json();
    if (name === "groups") setKnownGroups(j);
    return j;
  }
  // charts/ and stock_rrg/ live only under latest/; dated copies set window.ISC_BASE_LATEST="../latest/"
  const BL = () => window.ISC_BASE_LATEST || "";
  async function loadLatest(name) {
    const r = await fetch(`${BL()}data/${name}.json`);
    if (!r.ok) { document.body.insertAdjacentHTML("afterbegin", `<div class="err">Could not load ${esc(name)} (${r.status})</div>`); throw new Error(name); }
    return r.json();
  }
  function shell(active) {
    try { const t = localStorage.getItem("isc-theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
    document.getElementById("shell").innerHTML =
      `<header class="top"><div class="wrap"><a class="brand" href="index.html">MarketSmith-style · India Screener</a>
       <nav>${NAV.map(([h, n]) => `<a href="${h}" class="${h === active ? "on" : ""}">${n}</a>`).join("")}${BL() ? "" : `<a href="app/index.html" class="newapp" title="The new India Screener app">Try the new app →</a>`}</nav>
       <button id="theme" aria-label="Toggle theme">◐</button></div></header>`;
    document.getElementById("theme").onclick = () => {
      const n = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = n; try { localStorage.setItem("isc-theme", n); } catch (e) {}
    };
  }
  // MSI market-condition code -> banner class (checked by tests/test_isc_banner_map.py)
  const MARKET_CLASS = {R: "mk-up", U: "mk-pressure", A: "mk-down", C: "mk-down"};
  function marketClass(m) {
    if (MARKET_CLASS[m.code]) return MARKET_CLASS[m.code];
    const d = String(m.description || "");
    return /pressure/i.test(d) ? "mk-pressure" : /uptrend/i.test(d) ? "mk-up" : "mk-down";
  }
  function banner(s) {
    const m = s.market || {}, c = marketClass(m);
    const note = c !== "mk-down" ? "" : (/downtrend/i.test(m.description) || m.code === "C" ? " · No new entries in a Downtrend" : " · No new entries until a Confirmed Uptrend");
    return `<div class="mkt ${c}"><b>${esc(m.description)}</b> since ${esc(m.since)} · Nifty ${fmt(m.nifty_pct, 2)}%${note}
            <span class="asof">Data as of ${esc(s.price_date)} · MSI snapshot ${esc(s.asof)}</span></div>`;
  }
  function downloadCSV(name, cols, rows) {
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const txt = [cols.map(c => q(c.label)).join(",")].concat(rows.map(r => cols.map(c => q(r[c.key])).join(","))).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], {type: "text/csv"})); a.download = name; a.click();
  }
  const plain = h => String(h ?? "").replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const HELP = "Numbers: >=80 · <5 · 80-90 · 99. Text: part of the word · =A exact · !x excludes · commas = OR (=A,=A+). Boxes combine with AND.";
  const PH_NUM = "≥80 · <5 · 80-90", PH_TXT = "text · =A · !x";
  // state: optional {key, dir, fv} from a previous table's api.state() (keeps sort + column-filter boxes across rebuilds)
  function table(el, {cols, rows, sortKey = null, sortDir = -1, onRow = null, limit = 500, filters = true, state = null}) {
    let data = rows, key = state && state.key !== undefined ? state.key : sortKey, dir = state && state.dir ? state.dir : sortDir;
    if (key && !cols.some(c => c.key === key)) { key = sortKey; dir = sortDir; }
    const isNum = {}, fv = Object.assign({}, state && state.fv || {}), CF = window.ColFilter, useF = filters !== false && !!CF;
    function calcNum() { cols.forEach(c => { let seen = 0, num = 0; for (const r of data) { const v = r[c.key]; if (v === null || v === undefined) continue; seen++; if (typeof v === "number") num++; if (seen >= 40) break; } isNum[c.key] = c.num ?? (c.text ? false : (seen > 0 && num === seen)); }); }
    calcNum();
    const cellTxt = (c, r) => { const raw = r[c.key]; return c.render ? plain(c.render(raw, r)) : (raw === null || raw === undefined ? "" : String(raw)); };
    function filtered() {
      if (!useF) return data;
      const act = cols.map(c => [c, CF.parse(fv[c.key])]).filter(x => x[1]);
      if (!act.length) return data;
      return data.filter(r => act.every(([c, p]) => { const raw = r[c.key]; return CF.test(p, typeof raw === "number" ? raw : (raw ?? null), cellTxt(c, r)); }));
    }
    const nAct = () => useF ? cols.filter(c => CF.parse(fv[c.key])).length : 0;
    let built = false, tb, cnt, clr;
    function buildHead() {
      el.innerHTML = `<div class="tablewrap"><table class="sticky1"><thead><tr class="hrow">${cols.map(c => `<th class="${isNum[c.key] ? "num" : "txt"}" data-k="${esc(c.key)}"${c.tip ? ` title="${esc(c.tip)}"` : ""}>${esc(c.label)}${c.tag ? `<small class="stag">${esc(c.tag)}</small>` : ""}<span class="sarr"></span></th>`).join("")}</tr>
        ${useF ? `<tr class="frow">${cols.map(c => `<th class="${isNum[c.key] ? "num" : "txt"}"><input class="cf" type="text" data-k="${esc(c.key)}" placeholder="${isNum[c.key] ? PH_NUM : PH_TXT}" aria-label="Filter ${esc(c.label)}" autocomplete="off" spellcheck="false"></th>`).join("")}</tr>` : ""}</thead>
        <tbody></tbody></table></div>
        <div class="tfoot muted small"><span class="tcnt"></span> <button type="button" class="tclr" hidden>Clear filters</button>${useF ? ` <button type="button" class="thelp">Filter help</button>` : ""}</div>${useF ? `<div class="muted small tfhelp" hidden>${esc(HELP)}</div>` : ""}`;
      tb = el.querySelector("tbody"); cnt = el.querySelector(".tcnt"); clr = el.querySelector(".tclr");
      el.querySelectorAll("tr.hrow th").forEach(th => th.onclick = () => { const k = th.dataset.k; dir = (k === key) ? -dir : -1; key = k; draw(); });
      if (useF) {
        const timers = {};
        el.querySelectorAll("input.cf").forEach(inp => {
          inp.value = fv[inp.dataset.k] || ""; inp.classList.toggle("on", !!CF.parse(inp.value));
          ["click", "keydown", "mousedown"].forEach(ev => inp.addEventListener(ev, e => e.stopPropagation()));
          inp.addEventListener("input", () => { clearTimeout(timers[inp.dataset.k]); timers[inp.dataset.k] = setTimeout(() => { fv[inp.dataset.k] = inp.value; inp.classList.toggle("on", !!CF.parse(inp.value)); draw(); }, 120); });
        });
        clr.onclick = () => { cols.forEach(c => { fv[c.key] = ""; }); el.querySelectorAll("input.cf").forEach(i => { i.value = ""; i.classList.remove("on"); }); draw(); };
        const h = el.querySelector(".thelp"), hb = el.querySelector(".tfhelp"); h.onclick = () => { hb.hidden = !hb.hidden; };
      }
      built = true;
    }
    function draw() {
      if (!built) buildHead();
      const fr = filtered();
      const sk = ((cols.find(c => c.key === key) || {}).sortBy) || key;
      const sorted = key ? [...fr].sort((a, b) => {
        const x = a[sk], y = b[sk];
        if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1;
        return (x > y ? 1 : x < y ? -1 : 0) * dir; }) : fr;
      el.querySelectorAll("tr.hrow th").forEach(th => { th.querySelector(".sarr").textContent = th.dataset.k === key ? (dir < 0 ? " ▼" : " ▲") : ""; });
      tb.innerHTML = sorted.slice(0, limit).map((r, i) => `<tr data-i="${i}">${cols.map(c => {
        const raw = r[c.key], txt = c.render ? c.render(raw, r) : (typeof raw === "number" ? fmt(raw, c.d ?? 1) : (raw === null || raw === undefined ? "" : esc(raw)));
        return `<td class="${isNum[c.key] ? "num" : "txt"} ${c.signed ? cls(raw) : ""}${c.tdClass ? " " + c.tdClass : ""}">${txt}</td>`; }).join("")}</tr>`).join("");
      const M = data.length, na = nAct();
      cnt.textContent = (na ? `showing ${sorted.length.toLocaleString("en-IN")} of ${M.toLocaleString("en-IN")}` : `all ${M.toLocaleString("en-IN")} rows`) + (sorted.length > limit ? ` (first ${limit} shown; export CSV for all)` : "");
      if (clr) clr.hidden = !na;
      if (onRow) tb.querySelectorAll("tr").forEach(tr => tr.onclick = () => onRow(sorted[+tr.dataset.i]));
      api.current = sorted; api.total = M;
    }
    const api = {current: rows, total: rows.length, state: () => ({key, dir, fv: Object.assign({}, fv)}), setRows(r) { const was = data.length; data = r; if (!was && r.length) { calcNum(); built = false; } draw(); }, csv(name) { downloadCSV(name, cols, api.current); }};
    draw(); return api;
  }

  // ---------- shared stock filter (group rank, A/D, base type, base status) ----------
  const SF_KEY = "isc-filters-v1", SF_PARAMS = ["gr", "ad", "bt", "bs"];
  const AD_FAMS = ["A", "B", "C", "D", "E"], AD_BMINUS = "B-", BMINUS_SET = new Set(["A+", "A", "A-", "B+", "B", "B-"]);
  const BASE_TYPES = ["Consolidation", "Cup With Handle", "Cup Without Handle", "Flat Base", "Double Bottom", "IPO Base", "Ascending Base", "Saucer With Handle", "Saucer Without Handle"];
  const BASE_STATUS = ["Complete", "Forming", "Failed", "MaxOut"], NONE = "none";
  const NOT_COMPLETE = ["Forming", "Failed", "MaxOut", NONE];
  const GR_CHIPS = [["Top 20", 1, 20], ["Top 40", 1, 40], ["Top 60", 1, 60], ["61+", 61, null]];
  const sfEmpty = () => ({grMin: null, grMax: null, ad: [], bt: [], bs: []});
  const toInt = v => { if (v === null || v === undefined || v === "") return null; const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 1 ? n : null; };
  const keep = (a, ok) => [...new Set((Array.isArray(a) ? a : []).filter(x => ok.includes(x)))];
  function sfNorm(o) {
    o = o || {}; const st = sfEmpty();
    st.grMin = toInt(o.grMin); st.grMax = toInt(o.grMax);
    if (st.grMin !== null && st.grMax !== null && st.grMin > st.grMax) [st.grMin, st.grMax] = [st.grMax, st.grMin];
    st.ad = keep(o.ad, AD_FAMS.concat([AD_BMINUS])); st.bt = keep(o.bt, BASE_TYPES.concat([NONE])); st.bs = keep(o.bs, BASE_STATUS.concat([NONE]));
    return st;
  }
  const sfActive = st => st.grMin !== null || st.grMax !== null || st.ad.length > 0 || st.bt.length > 0 || st.bs.length > 0;
  const sfCount = st => (st.grMin !== null || st.grMax !== null ? 1 : 0) + (st.ad.length ? 1 : 0) + (st.bt.length ? 1 : 0) + (st.bs.length ? 1 : 0);
  function sfFromQuery(search) {
    const q = new URLSearchParams(search);
    if (!SF_PARAMS.some(k => q.has(k))) return null;
    const st = {}, m = /^(\d*)-(\d*)$/.exec(q.get("gr") || "");
    if (m) { st.grMin = m[1]; st.grMax = m[2]; }
    const list = k => (q.get(k) || "").split(",").map(x => x.trim()).filter(Boolean);
    st.ad = list("ad"); st.bt = list("bt"); st.bs = list("bs");
    return sfNorm(st);
  }
  function sfToQuery(st, base) {
    const q = new URLSearchParams(base || "");
    SF_PARAMS.forEach(k => q.delete(k));
    if (st.grMin !== null || st.grMax !== null) q.set("gr", `${st.grMin ?? ""}-${st.grMax ?? ""}`);
    if (st.ad.length) q.set("ad", st.ad.join(",")); if (st.bt.length) q.set("bt", st.bt.join(",")); if (st.bs.length) q.set("bs", st.bs.join(","));
    return q.toString();
  }
  // pure predicate: row (stocks.json shape) vs normalised state; null/unranked values never match an active filter on that field
  function sfMatch(st, r) {
    if (!r) return !sfActive(st);
    if (st.grMin !== null || st.grMax !== null) {
      const g = r.Industry_Group_Rank;
      if (typeof g !== "number" || !(g >= 1)) return false;
      if (st.grMin !== null && g < st.grMin) return false; if (st.grMax !== null && g > st.grMax) return false;
    }
    if (st.ad.length) {
      const a = r.AD_Rating == null ? "" : String(r.AD_Rating).trim();
      if (!a || !(st.ad.includes(a[0]) || (st.ad.includes(AD_BMINUS) && BMINUS_SET.has(a)))) return false;
    }
    if (st.bt.length && !st.bt.includes(r.Base_Type_Daily == null || r.Base_Type_Daily === "" ? NONE : r.Base_Type_Daily)) return false;
    if (st.bs.length && !st.bs.includes(r.Base_Status_Daily == null || r.Base_Status_Daily === "" ? NONE : r.Base_Status_Daily)) return false;
    return true;
  }
  function sfDescribe(st) {
    const o = [];
    if (st.grMin !== null || st.grMax !== null) o.push(`group rank ${st.grMin !== null && st.grMax !== null ? `${st.grMin}–${st.grMax}` : st.grMin !== null ? `≥${st.grMin}` : `≤${st.grMax}`}`);
    if (st.ad.length) o.push("A/D " + st.ad.map(x => x === AD_BMINUS ? "B- or better" : x).join("/"));
    if (st.bt.length) o.push("base " + st.bt.map(x => x === NONE ? "No base" : x).join("/"));
    if (st.bs.length) o.push("status " + st.bs.map(x => x === NONE ? "No base" : x).join("/"));
    return o;
  }
  let sfState = sfEmpty(); const sfSubs = [];
  (function sfInit() {
    let fromUrl = null; try { fromUrl = sfFromQuery(location.search); } catch (e) {}
    if (fromUrl) sfState = fromUrl;
    else { try { const raw = localStorage.getItem(SF_KEY); if (raw) sfState = sfNorm(JSON.parse(raw)); } catch (e) {} }
  })();
  function sfWriteUrl() {
    try { const qs = sfToQuery(sfState, location.search); history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash); } catch (e) {}
  }
  function sfSet(patch) {
    sfState = sfNorm({...sfState, ...patch});
    try { sfActive(sfState) ? localStorage.setItem(SF_KEY, JSON.stringify(sfState)) : localStorage.removeItem(SF_KEY); } catch (e) {}
    sfWriteUrl(); sfSubs.slice().forEach(fn => { try { fn(sfState); } catch (e) { console.error(e); } });
  }
  const stockFilter = {
    state: () => sfState, set: sfSet, clear: () => sfSet(sfEmpty()), isActive: () => sfActive(sfState), describe: () => sfDescribe(sfState),
    test: r => sfMatch(sfState, r), match: sfMatch, normalize: sfNorm, filter: rows => sfActive(sfState) ? rows.filter(r => sfMatch(sfState, r)) : rows,
    subscribe: fn => { sfSubs.push(fn); return () => { const i = sfSubs.indexOf(fn); if (i >= 0) sfSubs.splice(i, 1); }; },
    toQuery: sfToQuery, fromQuery: sfFromQuery, BASE_TYPES, BASE_STATUS, NONE
  };
  // filterBar(el, {rows, onChange, disabled, note}) -> {setDisabled(flag, note), sync()}; mirrors the shared state, shows "N of M stocks match"
  function filterBar(el, opts = {}) {
    const rows = opts.rows || [];
    const chip = (k, v, label, extra = "") => `<button type="button" class="fchip" data-k="${k}" data-v="${esc(v)}" ${extra}>${esc(label)}</button>`;
    el.classList.add("fbar");
    el.innerHTML = `<div class="fhead"><button type="button" class="ftog" aria-expanded="false">Filters <span class="fbadge"></span></button>
      <b class="fcount" aria-live="polite"></b><button type="button" class="fclear">Clear filters</button><span class="fnote muted small"></span></div>
      <div class="fbody">
      <div class="fgrp"><span class="flbl">Group rank</span><input type="number" min="1" max="200" inputmode="numeric" data-in="grMin" placeholder="min" aria-label="Group rank min"><input type="number" min="1" max="200" inputmode="numeric" data-in="grMax" placeholder="max" aria-label="Group rank max">${GR_CHIPS.map(([l, a, b]) => chip("gr", `${a}-${b ?? ""}`, l)).join("")}</div>
      <div class="fgrp"><span class="flbl">A/D</span>${AD_FAMS.map(f => chip("ad", f, f)).join("")}${chip("ad", AD_BMINUS, "B- or better")}</div>
      <div class="fgrp"><span class="flbl">Base type</span>${BASE_TYPES.map(b => chip("bt", b, b)).join("")}${chip("bt", NONE, "No base")}</div>
      <div class="fgrp"><span class="flbl">Base status</span>${BASE_STATUS.map(b => chip("bs", b, b)).join("")}${chip("bs", NONE, "No base")}<span class="fsep"></span>${chip("bsq", "complete", "Complete only")}${chip("bsq", "not", "Not complete")}</div></div>`;
    const $ = sel => el.querySelector(sel), all = sel => [...el.querySelectorAll(sel)];
    const sameSet = (a, b) => a.length === b.length && b.every(x => a.includes(x));
    let disabled = !!opts.disabled, note = opts.note || "";
    const toggle = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : arr.concat([v]);
    all(".fchip").forEach(b => b.onclick = () => {
      const st = sfState, k = b.dataset.k, v = b.dataset.v;
      if (k === "gr") { const [a, z] = v.split("-"), on = st.grMin === toInt(a) && st.grMax === toInt(z); sfSet(on ? {grMin: null, grMax: null} : {grMin: toInt(a), grMax: toInt(z)}); }
      else if (k === "bsq") sfSet({bs: sameSet(st.bs, v === "complete" ? ["Complete"] : NOT_COMPLETE) ? [] : (v === "complete" ? ["Complete"] : NOT_COMPLETE.slice())});
      else sfSet({[k]: toggle(st[k], v)});
    });
    all("input[data-in]").forEach(i => i.oninput = () => sfSet({grMin: $('[data-in="grMin"]').value, grMax: $('[data-in="grMax"]').value}));
    $(".fclear").onclick = () => stockFilter.clear();
    $(".ftog").onclick = () => { const o = el.classList.toggle("open"); $(".ftog").setAttribute("aria-expanded", o ? "true" : "false"); };
    function sync() {
      const st = sfState;
      all(".fchip").forEach(b => {
        const k = b.dataset.k, v = b.dataset.v; let on;
        if (k === "gr") { const [a, z] = v.split("-"); on = st.grMin === toInt(a) && st.grMax === toInt(z); }
        else if (k === "bsq") on = sameSet(st.bs, v === "complete" ? ["Complete"] : NOT_COMPLETE);
        else on = st[k].includes(v);
        b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); b.disabled = disabled;
      });
      all("input[data-in]").forEach(i => { i.disabled = disabled; if (document.activeElement !== i) i.value = st[i.dataset.in] ?? ""; });
      const act = sfActive(st), n = rows.length ? rows.filter(r => sfMatch(st, r)).length : 0;
      $(".fcount").textContent = disabled ? "" : (act ? `${n.toLocaleString("en-IN")} of ${rows.length.toLocaleString("en-IN")} stocks match` : `${rows.length.toLocaleString("en-IN")} stocks · no filters`);
      $(".fclear").hidden = !act || disabled; $(".fclear").disabled = disabled;
      $(".fbadge").textContent = act ? String(sfCount(st)) : ""; $(".fbadge").hidden = !act;
      $(".fnote").textContent = note; el.classList.toggle("dis", disabled);
    }
    if (sfActive(sfState)) sfWriteUrl();   // restore-from-storage also mirrors into the URL (shareable)
    sfSubs.push(st => { if (!el.isConnected) return; sync(); });
    if (opts.onChange) sfSubs.push(st => opts.onChange(st));
    sync();
    return {sync, setDisabled(flag, n) { disabled = !!flag; note = n || ""; sync(); }};
  }
  return {groupLink, groupKnown, setKnownGroups, groupHref, groupRrgHref, msiStage, groupKey, load, loadLatest, BL, shell, banner, marketClass, fmt, cls, esc, table, downloadCSV, stockFilter, filterBar};
})();
