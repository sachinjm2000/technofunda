window.GP = window.GP || {tabs: {}};
(async () => {
  const {fmt, esc} = ISC;
  ISC.shell("groups.html");
  const names = ["groups", "rrg", "rrg_msi", "rrg_rank", "rrg_gh", "transitions", "matrix", "group_hist", "stocks", "snapshot"];
  const D = {}; (await Promise.all(names.map(ISC.load))).forEach((v, i) => D[names[i]] = v);
  D.stocks.forEach(s => { s._stg = ISC.msiStage(s); });
  const trim = s => String(s ?? "").trim();
  const dash = (v, d) => (v === null || v === undefined || Number.isNaN(v)) ? "—" : fmt(v, d);
  const sdash = (v, d) => (v === null || v === undefined) ? "—" : (v > 0 ? "+" : "") + fmt(v, d);
  GP.D = D; GP.trim = trim; GP.dash = dash;
  GP.stocksOf = g => D.stocks.filter(s => trim(s.Industry_Group) === g);
  GP.fStocksOf = g => ISC.stockFilter.filter(GP.stocksOf(g));   // shared stock filter applied
  GP.stockRrgOpen = g => { GP.pendingStockGroup = trim(g); GP.show("stockrrg"); };   // replaced by groups-stock-rrg.js once that tab is built
  GP.refresh = {};   // tab key -> redraw fn, called when the shared filter changes
  GP.stockLink = (v, r) => {
    const l = r.has_chart ? `<a href="stock.html?s=${encodeURIComponent(v)}">${esc(v)}</a>` : esc(v), nm = r.Company_Name || r.Company || (D.stocks.find(x => trim(x.Symbol) === trim(v)) || {}).Company_Name;
    return /^\d+$/.test(String(v)) && nm ? `<b>${esc(nm)}</b> <span class="muted small">${l}</span>` : l;
  };
  GP.BC = ["#6E2A8F", "#9b59b6", "#cdb4db", "#e6dff0"];
  GP.drawer = html => { GP._drawerFn = null; const d = document.getElementById("drawer"); d.innerHTML = `<button class="x" aria-label="Close" title="Close (Esc)">✕</button>${html}`; d.classList.add("open"); d.querySelector(".x").onclick = () => { d.classList.remove("open"); GP._drawerFn = null; }; return d; };
  // ---- Ranking tab
  GP.tabs.ranking = el => {
    const G = D.groups, ranked = G.filter(g => g.n_scored >= 8 && g.EMRank != null), unr = G.filter(g => !(g.n_scored >= 8 && g.EMRank != null));
    const hist = D.group_hist;
    G.forEach(g => { g.bnow = g.bucket_path && g.bucket_path.length ? g.bucket_path[g.bucket_path.length - 1] : null; g._spark = g.MsiRank; });
    const spark = (v, r) => {
      const h = hist[r.Group] || hist[trim(r.Group)]; if (!h || !h.rank || h.rank.length < 2) return "—";
      const a = h.rank.slice(-60), mn = Math.min(...a), mx = Math.max(...a), W = 80, H = 22;
      const pts = a.map((x, i) => `${(i / (a.length - 1) * W).toFixed(1)},${(2 + (x - mn) / Math.max(1, mx - mn) * (H - 4)).toFixed(1)}`).join(" ");
      return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><title>MSI rank last ${a.length} sessions (up = better)</title><polyline points="${pts}" fill="none" stroke="#6E2A8F" stroke-width="1.5"/></svg>`;
    };
    const chips = v => (v && v.length) ? v.slice(-8).map(b => `<i class="chip" style="background:${GP.BC[b] || "#ccc"}" title="B${b}"></i>`).join("") : "—";
    const N = (k, l, d, signed) => ({key: k, label: l, d, signed, render: v => signed ? sdash(v, d) : dash(v, d)});
    const cols = [{key: "Group", label: "Group", render: v => ISC.groupLink(v, null, {destination: "stock"}) + ` <a href="#" class="small gl-list" data-g="${esc(trim(v))}" title="Stocks list drawer">stocks list</a>`}, N("n_match", "Matching stocks", 0), N("n_msi", "n_msi", 0), N("n_scored", "n_scored", 0), N("EMRank", "EMRank", 0), N("EMADD", "EMADD", 0), N("EMBreadth", "EMBreadth %", 1),
      N("EMvsMkt", "EMvsMkt", 1, true), {key: "EMStrength", label: "EMStrength", render: v => v || "—"}, N("MsiRank", "MsiRank", 0), N("RankChg", "RankChg", 0, true), N("Rank1w", "Rank1w", 0), N("Rank3m", "Rank3m", 0), N("Rank6m", "Rank6m", 0), N("MsiYTD", "MsiYTD %", 1, true),
      {key: "Category_Label", label: "Category", render: v => v ? `<span class="cat">${esc(v)}</span>` : "—"}, N("Consistency", "Consistency %", 0),
      {key: "bnow", label: "Buckets (last 8)", render: (v, r) => chips(r.bucket_path)}, {key: "_spark", label: "Rank trend", render: spark}];
    const presets = [["Best by ADD", "preset_best"], ["Strong + MSI-confirmed", "preset_strong"], ["Improving", "preset_improving"], ["All", null]];
    el.innerHTML = `<div class="row" id="pb">${presets.map(([l, k], i) => `<button class="pill${i === 3 ? " on" : ""}" data-k="${k || ""}">${l} (${k ? G.filter(g => g[k]).length : G.length})</button>`).join("")}<button class="pill" id="csv">Export CSV</button></div>
      <p class="muted small">ADD = stand-in rebuild, research display — price-vs-exit check is not ExitMantra's. Market-wide ADD ${dash(D.snapshot.mkt_add_pct, 1)}%. Category is shown as its own column (not blended into a score). Buckets: B0 rank 1–20, B1 21–40, B2 41–60, B3 61+ (oldest→newest).</p>
      <div id="cnt" class="small"></div><h2>Ranked groups</h2><div id="tr"></div><h2>Unranked (fewer than 8 scored stocks)</h2><div id="tu"></div>`;
    const mk = (sel, rows, key) => ISC.table(el.querySelector(sel), {cols, rows, sortKey: key, sortDir: -1}); 
    
    let cur = null, tr, tu;
    const apply = k => {
      const SF = ISC.stockFilter, cnt = {}; D.stocks.forEach(s => { if (SF.test(s)) { const g = trim(s.Industry_Group); cnt[g] = (cnt[g] || 0) + 1; } });
      G.forEach(g => { g.n_match = cnt[trim(g.Group)] || 0; });
      const f = r => (!k || r[k]) && (!SF.isActive() || r.n_match > 0);
      const a = ranked.filter(f), b = unr.filter(f);
      tr = mk("#tr", a, "EMBreadth"); tu = mk("#tu", b, "MsiRank");
      el.querySelector("#cnt").innerHTML = `<b id="cntn">${a.length + b.length}</b> groups shown (${a.length} ranked + ${b.length} unranked) of ${D.snapshot.n_groups}${ISC.stockFilter.isActive() ? ` · filters on: only groups with at least one matching stock` : ""}`;
    };
    el.querySelectorAll("#pb .pill[data-k]").forEach(b => b.onclick = () => { el.querySelectorAll("#pb .pill").forEach(x => x.classList.remove("on")); b.classList.add("on"); cur = b.dataset.k || null; apply(cur); });
    el.querySelector("#csv").onclick = () => ISC.downloadCSV("groups.csv", cols.filter(c => c.key !== "_spark" && c.key !== "bnow"), (tr.current || []).concat(tu.current || []));
    GP.refresh.ranking = () => apply(cur);
    apply(null);
  };
  document.addEventListener("keydown", e => { const d = document.getElementById("drawer"); if (e.key === "Escape" && d.classList.contains("open") && !document.querySelector(".gm-ovl")) { d.classList.remove("open"); GP._drawerFn = null; } });
  document.addEventListener("click", e => { const a = e.target.closest && e.target.closest("a.gl-list"); if (a) { e.preventDefault(); GP.openGroup(a.dataset.g); } });
  // ---- shell / tabs
  // a22: first three tabs = reference (Table | RRG | Matrix); earlier views stay reachable as secondary tabs
  const T = [["table", "Table"], ["rrg", "RRG"], ["matrix", "Matrix"]], T2 = [["ranking", "EM ranking"], ["transitions", "Transitions"], ["hist", "Rank history"], ["stockrrg", "Stock RRG"]];
  document.getElementById("app").innerHTML = `${ISC.banner(D.snapshot)}<h1 class="gt-h1" style="font-size:24px;font-weight:700;letter-spacing:-.5px;margin:10px 0 2px">India Group Rankings</h1><p class="muted" style="font-size:12px;margin:0 0 12px">Latest ranking date: ${esc(D.snapshot.asof)}.</p>
    <div class="utabs" id="tabs" role="tablist">${T.map(([k, l]) => `<button data-k="${k}" role="tab">${l}</button>`).join("")}<span style="width:1px;background:var(--line);margin:8px 6px"></span>${T2.map(([k, l]) => `<button data-k="${k}" role="tab" class="sec" style="font-size:12px;text-transform:none;font-weight:500">${l}</button>`).join("")}</div><div id="fb"></div><div id="pane"></div>`;
  const cache = {};
  const NOFILTER = {table: 1, rrg: 1, transitions: 1, hist: 1};   // group-level views: nothing to filter per stock
  const bar = ISC.filterBar(document.getElementById("fb"), {rows: D.stocks, onChange: () => {
    Object.keys(cache).forEach(k => { try { GP.refresh[k] && GP.refresh[k](); } catch (e) { console.error(e); } });
    if (GP._drawerFn && document.getElementById("drawer").classList.contains("open")) GP._drawerFn();
    if (document.querySelector(".gm-ovl") && GP._gmG) GP.openGroup(GP._gmG);
  }});
  function show(k) {
    bar.setDisabled(!!NOFILTER[k], NOFILTER[k] ? "Filters apply to stock lists (EM ranking, Matrix, Stock RRG); this view is group-level." : "");
    document.getElementById("fb").style.display = NOFILTER[k] ? "none" : "";
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.k === k));
    const pane = document.getElementById("pane");
    if (!cache[k]) { cache[k] = document.createElement("div"); GP.tabs[k](cache[k]); }
    pane.replaceChildren(cache[k]);
  }
  document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => { show(b.dataset.k); try { history.replaceState(null, "", "#tab=" + b.dataset.k); } catch (e) {} });
  GP.show = show;
  const fromHash = () => {
    let h = ""; try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
    if (!h) return false; h = trim(h);
    if (/^tab=rrg&g=/i.test(h)) { const nm = trim(h.replace(/^tab=rrg&g=/i, "")); if (GP.rrgFocus && cache.rrg) { show("rrg"); GP.rrgFocus(nm); } else { GP.pendingRrg = nm; show("rrg"); } return true; }
    if (h.startsWith("g=")) { const nm = trim(h.slice(2)), g = D.groups.find(x => trim(x.Group) === nm); if (!cache.table && !cache.rrg) show("table"); if (g) GP.openGroup(trim(g.Group)); return !!g; }
    if (h.startsWith("tab=")) { const k = h.slice(4); if (GP.tabs[k]) { show(k); return true; } return false; }
    if (h.startsWith("stockrrg/")) { GP.pendingStockGroup = trim(h.slice(9)); if (GP.stockRrgOpen && cache.stockrrg) GP.stockRrgOpen(GP.pendingStockGroup); else show("stockrrg"); return true; }
    const g = D.groups.find(x => trim(x.Group) === h); if (!g) return false;
    show("table"); GP.openGroup(trim(g.Group)); return true;
  };
  window.addEventListener("hashchange", fromHash);
  if (!fromHash()) show("table");
})();
