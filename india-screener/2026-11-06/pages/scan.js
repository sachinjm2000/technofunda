/* Scanner v2 (Addendum 9). S4a: chip row from scan_presets.json, grouped columns, lazy sparklines.
   S4b: Filters panel (Fundamental / Technical / Rating / MSI) -> one filter expression (ScanEval), Active chips,
   Logic builder (groups x conditions), user presets, URL/localStorage state, chart pop-up with metrics sidebar.
   Composite-style scores are display columns only; default sort = MSI RS desc. */
(async () => {
  const {fmt, esc} = ISC, EV = window.ScanEval, SF = ISC.stockFilter;
  const T0 = performance.now();
  ISC.shell("scan.html");
  const [scan, pre, snap] = await Promise.all([ISC.load("scan"), ISC.load("scan_presets"), ISC.load("snapshot"), ISC.load("groups").catch(() => null)]);
  const SS = window.ScanState;
  const keys = scan.columns, D = scan.data, M = scan.n, meta = scan.meta || {};
  const BMINUS = new Set(["A+", "A", "A-", "B+", "B", "B-"]);
  // columnar -> row objects; aliases let the shared stock filter (stocks.json field names) work on scan rows;
  // virtual columns (_q search text, _ad A/D tags, _bt/_bs base type/status with "none", _tt MSI TT list) feed the evaluator
  const rows = new Array(M);
  for (let i = 0; i < M; i++) {
    const r = {};
    for (const k of keys) r[k] = D[k][i];
    r.Industry_Group_Rank = r.group_rank; r.AD_Rating = r.ad_rating; r.Base_Type_Daily = r.base_type; r.Base_Status_Daily = r.base_status;
    r._nohist = r.chg_1d === null && r.adr_pct === null;      // MSI-only / BSE row: no own price history
    r._q = `${r.symbol} ${r.name || ""}`.toLowerCase();
    const a = r.ad_rating ? String(r.ad_rating).trim() : "";
    r._ad = a ? [a[0]].concat(BMINUS.has(a) ? ["B-"] : []) : null;
    r._bt = r.base_type || "none"; r._bs = r.base_status || "none"; r._tt = null;
    r.has_chart = null; rows[i] = r;
  }
  const presets = (pre.presets || []), chipN = {};
  presets.forEach(p => { if (!p.disabled) chipN[p.id] = rows.reduce((n, r) => n + (EV.presetMatch(r, p) ? 1 : 0), 0); });
  let chip = "all", spark = null, nCharts = null;
  const n0 = v => v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
  const nIN = v => Number(v).toLocaleString("en-IN");

  // ---------- columns ----------
  const L = scan.labels, TIP = scan.tips, SRC = scan.src, TY = scan.types || {};
  const tagOf = k => SRC[k] === "msi" ? "(MSI)" : SRC[k] ? "(own)" : "";
  const dash = (t = "no price history") => `<span class="muted" title="${esc(t)}">—</span>`;
  const priceCol = new Set(Object.keys(SRC).filter(k => SRC[k] === "price" || SRC[k] === "own" || SRC[k] === "ref-port"));
  const nullCell = (k, r) => (r._nohist && priceCol.has(k)) ? dash() : `<span class="muted" title="no value">—</span>`;
  const heat = v => `<span class="heat" style="background:rgba(41,127,2,${(Math.max(0, Math.min(100, v)) / 100 * 0.5).toFixed(2)})">${fmt(v, 0)}</span>`;
  const bool = v => v === 1 ? "✓" : `<span class="muted">·</span>`;
  function sparkSvg(a, cls) {
    if (!a || a.length < 2) return "";
    let lo = Infinity, hi = -Infinity; for (const x of a) { if (x < lo) lo = x; if (x > hi) hi = x; }
    const w = 64, h = 18, sp = hi - lo || 1;
    const pts = a.map((x, i) => `${(i / (a.length - 1) * w).toFixed(1)},${(h - 1 - (x - lo) / sp * (h - 2)).toFixed(1)}`).join(" ");
    return `<svg class="spk ${cls}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>`;
  }
  const skel = `<span class="skel" aria-label="loading"></span>`;
  const col = (k, extra = {}) => ({key: k, label: L[k] || k, tip: TIP[k], tag: tagOf(k), grp: scan.groups[k], ...extra});
  const num = (k, d, extra = {}) => col(k, {d, render: (v, r) => v === null || v === undefined ? nullCell(k, r) : fmt(v, d), ...extra});
  const score = (k, extra = {}) => col(k, {grp: "scores", num: true, render: (v, r) => v === null || v === undefined ? nullCell(k, r) : heat(v), ...extra});
  const bcol = (k, extra = {}) => col(k, {num: false, render: (v, r) => v === null || v === undefined ? nullCell(k, r) : bool(v), ...extra});
  const txt = (k, extra = {}) => col(k, {text: true, render: v => v === null || v === undefined ? `<span class="muted">—</span>` : esc(v), ...extra});
  const ALL = [
    col("symbol", {label: "SYM", grp: "identity", fixed: true, text: true, render: (v, r) => {
      const big = /^\d+$/.test(String(v)) ? `<b>${esc(r.name || v)}</b> <span class="muted small">${esc(v)}</span>` : `<b>${esc(v)}</b>`;
      return `<span class="cico" title="Open chart pop-up" aria-hidden="true">▦</span> ${big} <span class="xb">${esc(r.exchange || "")}</span><div class="cn muted">${esc(r.name || "")}</div>`; }}),
    {key: "_rst", label: "RS TREND", grp: "identity", tip: "RS line vs CNX500, last 30 sessions; arrow = 30d RS-line trend", tag: "(own)", sortBy: "rs_trend", num: true,
      render: (v, r) => { if (r.rs_trend === null) return dash(); const a = r.rs_trend > 0 ? `<b class="up">↑</b>` : r.rs_trend < 0 ? `<b class="down">↓</b>` : `<b class="muted">→</b>`;
        return (spark ? sparkSvg(spark.r[r.symbol], "muted") : skel) + " " + a; }},
    {key: "_pspk", label: "PRICE", grp: "identity", tip: "Close, last 30 sessions + 1-day change %", tag: "(own)", sortBy: "chg_1d", num: true,
      render: (v, r) => r.chg_1d === null ? dash() : (spark ? sparkSvg(spark.p[r.symbol], "muted") : skel) + ` <span class="${ISC.cls(r.chg_1d)}">${fmt(r.chg_1d, 1)}%</span>`},
    col("industry_group", {label: "IBD INDUSTRY", text: true, render: v => v ? ISC.groupLink(v, null, {destination: "rrg"}) : `<span class="muted">—</span>`}),
    num("group_rank", 0),
    num("composite_msi", 0, {label: "MSI COMPOSITE"}),
    score("composite", {label: "BLEND"}), score("minervini"), score("canslim"), score("ipo"), score("custom"), score("volb"), score("vcp_score"), bcol("vcp_detected", {grp: "scores"}),
    num("rs", 0), num("rs1m_own", 0), num("rs3m", 0), num("rs12m_own", 0), num("beta", 2), num("beta_adj_rs", 0),
    num("stage", 0), num("msi_stage", 0), bcol("ma_align"), num("adr_pct", 1), num("v50", 2), num("bb_width_pctile_252", 0),
    bcol("rs_line_new_high"), bcol("rs_blue_dot", {label: "RSBD"}), bcol("msi_blue_dot", {label: "MBD"}),
    num("price", 2, {render: (v, r) => v === null ? dash("no price") : (r._nohist ? `<span title="MSI price (no own price history)">${fmt(v, 2)}<sup class="muted">M</sup></span>` : fmt(v, 2))}),
    num("avg_dollar_vol_cr", 1, {label: "₹VOL Cr"}), num("mcap_cr", 0, {label: "MCAP Cr"}), num("ipo_months", 0, {label: "IPO age (mo)"}),
    num("eps_rating", 0, {label: "EPS RTG"}), num("eps_growth_qq", 0, {signed: true}), num("sales_growth_qq", 0, {signed: true}),
    txt("ad_rating"), txt("base_type"), txt("base_status"),
    num("pct_to_pivot", 1, {label: "% TO PIVOT", render: (v, r) => v !== null && v !== undefined ? fmt(v, 1)
      : r.base_status === "Forming" ? "[DATA NEEDED]" : `<span class="muted" title="${r.base_status ? "no open base" : "no base"}">—</span>`}),
    bcol("tier1", {grp: "fundamental", label: "TIER1", render: (v, r) => v === null || v === undefined ? nullCell("tier1", r) : v === 1
      ? "\u2713" + (r.tier1_fallback === 1 ? `<sup class="t1f" title="200-DMA from our prices (MSI field empty)">\u2020</sup>` : "") : `<span class="muted">\u00b7</span>`}),
  ];
  const GROUPS = ["identity", "scores", "technical", "fundamental"];
  const CK = "isc-scan-hidden-v1"; let hidden = new Set();
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  try { hidden = new Set(JSON.parse(lsGet(CK) || "[]")); } catch (e) {}
  const saveHidden = () => lsSet(CK, JSON.stringify([...hidden]));
  const visCols = () => ALL.filter(c => c.fixed || !hidden.has(c.key));

  // ---------- filter panel model ----------
  // kinds: txt (contains), sel (op + option list), chips (sel rendered as chips), rng (between), gte (>=), yn (is_true/is_false),
  // multi (in; list with search), mchips (in; chips), dis (disabled, data not available)
  const STAGES = [[1, "S1 - Basing"], [2, "S2 - Advancing"], [3, "S3 - Topping"], [4, "S4 - Declining"]];
  const uniq = k => [...new Set(rows.map(r => r[k]).filter(v => !n0(v) && v !== ""))].sort();
  const INDUSTRIES = uniq("industry_group");
  const C = (id, sec, label, kind, colk, x = {}) => ({id, sec, label, kind, col: colk, ...x});
  const CTRL = [
    C("q", "fund", "Symbol / name", "txt", "_q"),
    C("mcap", "fund", "Mkt Cap", "sel", "mcap_cr", {op: ">=", opts: [500, 1000, 5000, 20000].map(v => [v, `≥ ${nIN(v)}`]), unit: "₹ Cr", lab: v => `Mkt Cap ≥ ₹${nIN(v)} Cr`}),
    C("adv", "fund", "Avg daily value", "sel", "avg_dollar_vol_cr", {op: ">=", opts: [1, 5, 8, 25, 100].map(v => [v, `≥ ${nIN(v)}`]), unit: "₹ Cr", lab: v => `Avg daily value ≥ ₹${nIN(v)} Cr`}),
    C("price", "fund", "Price", "rng", "price", {unit: "₹"}),
    C("epsg", "fund", "EPS Growth", "gte", "eps_growth_qq", {unit: "%"}),
    C("salesg", "fund", "Sales Growth", "gte", "sales_growth_qq", {unit: "%"}),
    C("epsr", "fund", "EPS Rating", "gte", "eps_rating"),
    C("ind", "fund", "IBD Industry", "multi", "industry_group", {opts: INDUSTRIES.map(v => [v, v]), max: 100}),
    C("ipoage", "fund", "IPO Age", "chips", "ipo_months", {op: "<=", opts: [[6, "6M"], [12, "1Y"], [24, "2Y"], [36, "3Y"], [60, "5Y"]], lab: (v, c) => `IPO Age ≤ ${c.opts.find(o => o[0] === v)[1]}`}),
    C("gics", "fund", "GICS Sector", "dis", null, {tip: "not in our data [DATA NEEDED]"}),
    C("adr", "tech", "ADR %", "rng", "adr_pct", {unit: "%"}),
    C("stage", "tech", "Stage (Weinstein, own prices)", "sel", "stage", {op: "=", opts: STAGES, lab: v => `Stage = S${v}`}),
    C("mstage", "tech", "MSI stage (DMA fields)", "sel", "msi_stage", {op: "=", opts: STAGES, lab: v => `MSI stage = S${v}`}),
    C("rs", "tech", "RS Rating", "gte", "rs"),
    C("rs1m", "tech", "RS 1M", "gte", "rs1m_own"),
    C("rs3m", "tech", "RS 3M", "gte", "rs3m"),
    C("rs12m", "tech", "RS 12M", "gte", "rs12m_own"),
    C("rsbd", "tech", "RS Blue Dot", "yn", "rs_blue_dot"),
    C("mbd", "tech", "MSI Blue Dot", "yn", "msi_blue_dot"),
    C("beta", "tech", "Beta", "rng", "beta"),
    C("brs", "tech", "β-adj RS", "gte", "beta_adj_rs"),
    C("ma", "tech", "MA Align", "yn", "ma_align"),
    C("pp", "tech", "Pkt Pivot", "yn", "pocket_pivot", {tip: "display only; no edge on NSE"}),
    C("pwr", "tech", "Pwr Trend", "yn", "power_trend"),
    C("c1d", "tech", "1D Chg", "gte", "chg_1d", {unit: "%"}),
    C("c1w", "tech", "1W Chg", "gte", "chg_1w", {unit: "%"}),
    C("c1m", "tech", "1M Chg", "gte", "chg_1m", {unit: "%"}),
    C("c3m", "tech", "3M Chg", "gte", "chg_3m", {unit: "%"}),
    C("c6m", "tech", "6M Chg", "gte", "chg_6m", {unit: "%"}),
    C("gap", "tech", "Gap %", "rng", "gap_pct", {unit: "%"}),
    C("vsrg", "tech", "Vol Surge", "rng", "vol_surge", {unit: "×"}),
    C("e10", "tech", "% vs EMA10", "gte", "pct_vs_ema10", {unit: "%"}),
    C("e20", "tech", "% vs EMA20", "gte", "pct_vs_ema20", {unit: "%"}),
    C("e50", "tech", "% vs EMA50", "gte", "pct_vs_ema50", {unit: "%"}),
    C("h52", "tech", "% from 52W Hi", "rng", "from_52w_high", {unit: "%"}),
    C("l52", "tech", "% from 52W Lo", "rng", "from_52w_low", {unit: "%"}),
    C("comp", "rate", "Composite", "gte", "composite"),
    C("min", "rate", "Minervini", "gte", "minervini"),
    C("can", "rate", "CANSLIM (MSI composite)", "gte", "canslim"),
    C("ipos", "rate", "IPO", "gte", "ipo"),
    C("cust", "rate", "Custom", "gte", "custom"),
    C("volb", "rate", "Vol BT", "gte", "volb"),
    C("sqz", "rate", "Squeeze (BB width pctile)", "rng", "bb_width_pctile_252"),
    C("v50", "rate", "Vol/50d", "rng", "v50", {unit: "×"}),
    C("ud", "rate", "U/D Vol", "rng", "ud_vol_10d"),
    C("rsh", "rate", "RS Hi", "yn", "rs_line_new_high"),
    C("vcps", "rate", "VCP Score", "gte", "vcp_score"),
    C("vcp", "rate", "VCP", "yn", "vcp_detected"),
    C("vrdy", "rate", "VCP Ready", "yn", "vcp_ready"),
    C("t1", "rate", "Tier 1", "yn", "tier1", {tip: "RS≥80, EPS≥70, above 200-DMA"}),
    C("ses", "rate", "SE Score", "dis", null, {tip: "setup engine = phase 3"}),
    C("sepd", "rate", "Pvt Dist", "dis", null, {tip: "setup engine = phase 3"}),
    C("ser", "rate", "SE Ready", "dis", null, {tip: "setup engine = phase 3"}),
    C("sep", "rate", "SE Pattern", "dis", null, {tip: "setup engine = phase 3"}),
    C("tt", "msi", "MSI TT list", "mchips", "_tt", {opts: [["1M", "1M list"], ["5M", "5M list"], ["none", "none"]], tip: "MSI Minervini Trend Template list (joined from stocks.json after load)"}),
  ];
  const BYID = Object.fromEntries(CTRL.map(c => [c.id, c]));
  const SECS = [["fund", "Fundamental"], ["tech", "Technical"], ["rate", "Rating / Score"], ["msi", "MSI"]];
  const DEFAULTS = () => ({adv: 8});
  const empty = (c, v) => v === null || v === undefined || v === "" || (Array.isArray(v) && (c.kind === "rng" ? v.every(x => n0(x)) : !v.length));
  function condOf(c, v) {
    if (c.kind === "dis" || empty(c, v)) return null;
    switch (c.kind) {
      case "txt": return {col: c.col, op: "contains", value: String(v).toLowerCase()};
      case "sel": case "chips": return {col: c.col, op: c.op, value: v};
      case "gte": return {col: c.col, op: ">=", value: v};
      case "rng": return {col: c.col, op: "between", value: [n0(v[0]) ? null : v[0], n0(v[1]) ? null : v[1]]};
      case "yn": return {col: c.col, op: v === "y" ? "is_true" : "is_false"};
      case "multi": case "mchips": return {col: c.col, op: "in", value: v.slice()};
    }
    return null;
  }
  const u = c => c.unit && c.unit !== "₹ Cr" ? (c.unit === "%" ? "%" : c.unit === "₹" ? "" : c.unit) : "";
  function condLabel(c, v) {
    if (c.lab) return c.lab(v, c);
    switch (c.kind) {
      case "txt": return `Search: "${v}"`;
      case "gte": return `${c.label} ≥ ${v}${u(c)}`;
      case "rng": return n0(v[0]) ? `${c.label} ≤ ${v[1]}${u(c)}` : n0(v[1]) ? `${c.label} ≥ ${v[0]}${u(c)}` : `${c.label} ${v[0]}–${v[1]}${u(c)}`;
      case "yn": return `${c.label}: ${v === "y" ? "Yes" : "No"}`;
      case "multi": case "mchips": return `${c.label}: ${v.slice(0, 2).join(", ")}${v.length > 2 ? ` (+${v.length - 2})` : ""}`;
      case "sel": case "chips": return `${c.label} ${c.op} ${v}`;
    }
    return c.label;
  }
  // shared stock filter (MSI section) <-> evaluator conditions (virtual columns _ad/_bt/_bs)
  function sfConds(st) {
    const o = [];
    if (st.grMin !== null || st.grMax !== null) o.push({col: "group_rank", op: "between", value: [st.grMin, st.grMax]});
    if (st.ad.length) o.push({col: "_ad", op: "in", value: st.ad.slice()});
    if (st.bt.length) o.push({col: "_bt", op: "in", value: st.bt.slice()});
    if (st.bs.length) o.push({col: "_bs", op: "in", value: st.bs.slice()});
    return o;
  }
  // expression -> {vals, sf} when it is a plain AND of panel-representable conditions; else null (=> "Custom logic active")
  function exprToPanel(e) {
    const gs = ((e && e.groups) || []).filter(g => g && g.enabled !== false);
    let cs = [];
    if (gs.length > 1 && e.join === "any") return null;
    for (const g of gs) { const gc = g.conditions || []; if (gc.length > 1 && (g.combine || g.match) === "any") return null; cs = cs.concat(gc); }
    const vals = {}, sf = {grMin: null, grMax: null, ad: [], bt: [], bs: []}, seen = new Set();
    for (const k of cs) {
      if (!k || !k.col) return null;
      const once = id => { if (seen.has(id)) return false; seen.add(id); return true; };
      if (k.col === "group_rank") {
        if (!once("gr")) return null;
        if (k.op === "between") { const x = Array.isArray(k.value) ? k.value : [k.value && k.value.min, k.value && k.value.max]; sf.grMin = x[0] ?? null; sf.grMax = x[1] ?? null; }
        else if (k.op === ">=") sf.grMin = k.value; else if (k.op === "<=") sf.grMax = k.value; else return null;
        continue;
      }
      if (["_ad", "_bt", "_bs"].includes(k.col)) {
        if (k.op !== "in" || !once(k.col)) return null;
        sf[k.col.slice(1)] = (Array.isArray(k.value) ? k.value : [k.value]).slice(); continue;
      }
      const c = CTRL.find(x => x.col === k.col && x.kind !== "dis");
      if (!c || !once(c.id)) return null;
      const v = k.value;
      if (c.kind === "gte" && k.op === ">=" && typeof v === "number") vals[c.id] = v;
      else if (c.kind === "rng" && k.op === "between") vals[c.id] = Array.isArray(v) ? [v[0] ?? null, v[1] ?? null] : [v && v.min, v && v.max];
      else if (c.kind === "rng" && k.op === ">=") vals[c.id] = [v, null];
      else if (c.kind === "rng" && k.op === "<=") vals[c.id] = [null, v];
      else if ((c.kind === "sel" || c.kind === "chips") && k.op === c.op && c.opts.some(o => o[0] === v)) vals[c.id] = v;
      else if (c.kind === "yn" && (k.op === "is_true" || k.op === "is_false")) vals[c.id] = k.op === "is_true" ? "y" : "n";
      else if ((c.kind === "multi" || c.kind === "mchips") && k.op === "in") vals[c.id] = (Array.isArray(v) ? v : [v]).filter(x => c.opts.some(o => o[0] === x));
      else if (c.kind === "txt" && k.op === "contains") vals[c.id] = String(v ?? "");
      else return null;
    }
    const n = SF.normalize(sf);
    if (n.ad.length !== sf.ad.length || n.bt.length !== sf.bt.length || n.bs.length !== sf.bs.length) return null;
    return {vals, sf: n};
  }

  // ---------- state: panel values, custom expression, quick chip; URL ?f= (base64 JSON) + localStorage ----------
  const SK = "isc-scan-state-v2", UPK = "isc-scan-user-presets-v1";
  let vals = DEFAULTS(), custom = null;
  const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
  // untrusted input (URL ?f=, localStorage): sanitised against the known columns / operators / controls before use
  const ENUM_COLS = new Set(["base_type", "base_status", "ad_rating", "exchange", "industry_group", "_ad", "_bt", "_bs", "_tt"]);
  const STATE_TYPES = (() => {
    const t = {_q: "str"};
    for (const k of keys) { if (k === "name" || k === "symbol") continue; t[k] = TY[k] === "bool" ? "bool" : ENUM_COLS.has(k) ? "enum" : TY[k] === "str" ? "str" : "num"; }
    for (const k of ENUM_COLS) t[k] = "enum";
    return t;
  })();
  const STATE_ENUMS = {industry_group: INDUSTRIES, base_type: uniq("base_type"), base_status: uniq("base_status"), ad_rating: uniq("ad_rating"), exchange: uniq("exchange"),
    _ad: ["A", "B", "C", "D", "E", "B-"], _bt: SF.BASE_TYPES.concat(["none"]), _bs: SF.BASE_STATUS.concat(["none"]), _tt: ["1M", "5M", "none"]};
  const SCTX = {types: STATE_TYPES, enums: STATE_ENUMS, ctrls: Object.fromEntries(CTRL.filter(c => c.kind !== "dis").map(c => [c.id, {kind: c.kind, opts: c.opts, max: c.max}]))};
  let restoredFrom = null;
  function loadState(o) {
    const st = SS.sanitizeState(o, SCTX);
    if (!st) return false;
    const has = Object.keys(st.v).length || st.x || st.c !== "all";
    if (st.dropped && !has) return false;          // nothing valid survived: treat as poisoned
    vals = st.v; custom = st.x;
    chip = presets.some(p => p.id === st.c && !p.disabled) ? st.c : "all";
    return true;
  }
  (function initState() {
    let ok = false;
    try { const f = new URLSearchParams(location.search).get("f"); if (f) { ok = loadState(JSON.parse(b64d(f))); if (ok) restoredFrom = "link"; } } catch (e) {}
    if (!ok) {
      let s = null; try { s = lsGet(SK); } catch (e) {}
      if (s) { try { ok = loadState(JSON.parse(s)); } catch (e) { ok = false; } if (ok) restoredFrom = "visit"; else lsSet(SK, null); }   // clear a poisoned entry
    }
    if (!ok) { vals = DEFAULTS(); custom = null; chip = "all"; }
  })();
  function saveState() {
    const o = {v: {}, x: custom, c: chip};
    for (const [k, v] of Object.entries(vals)) if (!empty(BYID[k], v)) o.v[k] = v;
    const js = JSON.stringify(o); lsSet(SK, js);
    try {
      const q = new URLSearchParams(location.search); q.set("f", b64e(js));
      history.replaceState(null, "", location.pathname + "?" + q.toString() + location.hash);
    } catch (e) {}
  }
  const panelExpr = () => ({join: "all", groups: [{combine: "all", conditions: CTRL.map(c => condOf(c, vals[c.id])).filter(Boolean)}]});
  const effExpr = () => custom || panelExpr();

  // ---------- layout ----------
  const $ = id => document.getElementById(id);
  const wide = innerWidth >= 768;
  let panelOpen = (lsGet("isc-scan-panel-open") ?? (wide ? "1" : "0")) === "1";
  document.getElementById("app").innerHTML = `${ISC.banner(snap)}
    <h1 class="sh">Daily Scan <span class="muted">— Run as of ${esc(scan.asof)}</span></h1>
    <div class="muted small" id="cntl"></div>
    <div class="chips" id="chips" role="toolbar" aria-label="Quick scans"></div>
    <div class="rnote" id="rnote" hidden role="status"><span id="rnotet"></span><button type="button" class="lnk" id="rnr">Reset</button><span class="sp"></span><button type="button" class="x" id="rnx" aria-label="Dismiss">\u00d7</button></div>
    <section class="fpanel${panelOpen ? " open" : ""}" id="fp" aria-label="Filters">
      <div class="fph"><button type="button" class="fptog" id="fptog" aria-expanded="${panelOpen}"><span class="chev">▸</span> Filters <span class="fpb" id="fpb"></span></button>
        <button type="button" class="fpbtn" id="lbtn">Logic builder</button><button type="button" class="fpbtn" id="prst">Reset</button></div>
      <div class="fpbody" id="fpbody"></div>
    </section>
    <div class="actv"><span class="muted small">Active:</span> <span id="act"></span></div>
    <div class="sbar"><details class="cmenu" id="cm"><summary>Columns</summary><div class="cmb" id="cmb"></div></details>
      <button type="button" id="csv">Export CSV (all columns)</button></div>
    <div id="tbl"></div>
    <div class="card small muted" id="foot"></div>
    <div id="lb"></div><div id="mdl"></div>`;

  // ---------- chips (scan_presets + user presets) ----------
  const userPresets = () => { try { const a = JSON.parse(lsGet(UPK) || "[]"); if (!Array.isArray(a)) return [];
      return a.map(p => { const x = p && typeof p === "object" ? SS.sanitizeExpr(p.expr, SCTX) : null; return x && typeof p.label === "string" ? {label: p.label.slice(0, 60), expr: x} : null; }).filter(Boolean); } catch (e) { return []; } };
  const saveUserPresets = a => lsSet(UPK, JSON.stringify(a));
  function chipsHtml() {
    const VCPN = "reference VCP detector rarely fires (volume leg inactive)";
    const b = (id, label, n, dis, tip) => { const low = id === "vcp" && !dis && n !== null && n <= 5;
      return `<button type="button" class="qchip${chip === id ? " on" : ""}" data-id="${esc(id)}" ${dis ? "disabled" : ""} aria-pressed="${chip === id}" title="${esc(low ? VCPN : tip || "")}">${esc(label)} <span class="qn">${n === null ? "" : nIN(n)}</span>${low ? ` <span class="qs">\u00b7 rarely fires</span>` : ""}</button>`; };
    const ups = userPresets();
    $("chips").innerHTML = b("all", "All Stocks", M, false, "No preset") + presets.map(p => b(p.id, p.label, p.disabled ? null : chipN[p.id], !!p.disabled,
      (p.disabled ? "Unavailable: " : "") + [p.desc, p.note].filter(Boolean).join(" · "))).join("")
      + ups.map((p, i) => `<span class="qchip user" title="Your saved logic preset"><button type="button" class="upl" data-u="${i}">★ ${esc(p.label)}</button><button type="button" class="upx" data-ux="${i}" aria-label="Delete preset ${esc(p.label)}">×</button></span>`).join("");
    $("chips").querySelectorAll("button.qchip").forEach(x => x.onclick = () => { chip = (chip === x.dataset.id || x.dataset.id === "all") ? "all" : x.dataset.id; chipsHtml(); update(); });
    $("chips").querySelectorAll("button.upl").forEach(x => x.onclick = () => { const p = userPresets()[+x.dataset.u]; if (p) applyExpr(p.expr); });
    $("chips").querySelectorAll("button.upx").forEach(x => x.onclick = () => { const a = userPresets(); a.splice(+x.dataset.ux, 1); saveUserPresets(a); chipsHtml(); });
  }

  // ---------- filters panel ----------
  function ctrlHtml(c) {
    const lab = `<label class="pcl" for="pc-${c.id}"${c.tip ? ` title="${esc(c.tip)}"` : ""}>${esc(c.label)}${c.unit ? ` <span class="muted">(${esc(c.unit)})</span>` : ""}${c.col && tagOf(c.col) ? ` <small class="stag">${tagOf(c.col)}</small>` : ""}</label>`;
    const ni = (i, ph) => `<input type="number" step="any" inputmode="decimal" ${i === 1 ? "" : `id="pc-${c.id}" `}data-id="${c.id}" data-i="${i}" placeholder="${ph}" aria-label="${esc(c.label)} ${ph}">`;
    let body = "";
    switch (c.kind) {
      case "dis": return `<div class="pc dis" title="${esc(c.tip)}"><label class="pcl">${esc(c.label)}</label><select disabled aria-label="${esc(c.label)} (${esc(c.tip)})"><option>${esc(c.tip)}</option></select></div>`;
      case "txt": body = `<input type="search" id="pc-${c.id}" data-id="${c.id}" placeholder="e.g. TATA" autocomplete="off">`; break;
      case "sel": body = `<select id="pc-${c.id}" data-id="${c.id}"><option value="">Any</option>${c.opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select>`; break;
      case "gte": body = ni(0, "≥ min"); break;
      case "rng": body = `<span class="rng">${ni(0, "min")}<span class="muted">–</span>${ni(1, "max")}</span>`; break;
      case "yn": body = `<span class="seg" role="group" aria-label="${esc(c.label)}">${[["", "All"], ["y", "Yes"], ["n", "No"]].map(([v, l]) => `<button type="button" data-id="${c.id}" data-v="${v}">${l}</button>`).join("")}</span>`; break;
      case "chips": case "mchips": body = `<span class="pchips">${c.opts.map(([v, l]) => `<button type="button" class="fchip2" data-id="${c.id}" data-v="${esc(v)}">${esc(l)}</button>`).join("")}</span>`; break;
      case "multi": body = `<div class="ms"><input type="search" id="pc-${c.id}" data-ms="${c.id}" placeholder="Search groups…" autocomplete="off"><div class="msl" data-msl="${c.id}"></div><div class="small muted"><span data-msn="${c.id}"></span> <button type="button" class="lnk" data-msc="${c.id}">clear</button></div></div>`; break;
    }
    return `<div class="pc pc-${c.kind}" data-pc="${c.id}">${lab}${body}</div>`;
  }
  function panelHtml() {
    $("fpbody").innerHTML = `<div class="cust" id="custnote" hidden>Custom logic active — the controls below (except MSI) are not applied; edit it in the Logic builder or remove the chip.</div>`
      + SECS.map(([s, t]) => `<details class="fsec" data-sec="${s}" open><summary>${esc(t.toUpperCase())} <span class="fsb" data-fsb="${s}"></span></summary><div class="fsgrid">${
        s === "msi" ? `<div class="pc pc-wide"><div id="sfbar"></div></div>` : ""}${CTRL.filter(c => c.sec === s).map(ctrlHtml).join("")}</div></details>`).join("");
    const body = $("fpbody");
    const timers = {};
    const later = (k, fn) => { clearTimeout(timers[k]); timers[k] = setTimeout(fn, 180); };
    body.addEventListener("input", e => {
      const t = e.target, id = t.dataset.id;
      if (t.dataset.ms) { drawMulti(t.dataset.ms); return; }
      if (!id) return; const c = BYID[id];
      if (c.kind === "txt") later(id, () => { vals[id] = t.value.trim(); update(); });
      else if (c.kind === "gte") later(id, () => { vals[id] = t.value === "" ? null : +t.value; update(); });
      else if (c.kind === "rng") later(id, () => { const ins = body.querySelectorAll(`input[data-id="${id}"]`); vals[id] = [...ins].map(i => i.value === "" ? null : +i.value); update(); });
    });
    body.addEventListener("change", e => {
      const t = e.target, id = t.dataset.id;
      if (t.dataset.mi) { const c = BYID[t.dataset.mi], a = (vals[c.id] || []).slice(), v = t.value;
        if (t.checked) { if (a.length >= c.max) { t.checked = false; return; } a.push(v); } else a.splice(a.indexOf(v), 1);
        vals[c.id] = a; update(); return; }
      if (id && BYID[id].kind === "sel") { vals[id] = t.value === "" ? null : +t.value; update(); }
    });
    body.addEventListener("click", e => {
      const t = e.target.closest("button"); if (!t || !body.contains(t)) return;
      if (t.dataset.msc) { vals[t.dataset.msc] = []; update(); drawMulti(t.dataset.msc); return; }
      const id = t.dataset.id; if (!id) return; const c = BYID[id];
      if (c.kind === "yn") vals[id] = t.dataset.v || null;
      else if (c.kind === "chips") { const v = +t.dataset.v; vals[id] = vals[id] === v ? null : v; }
      else if (c.kind === "mchips") { const a = (vals[id] || []).slice(), v = t.dataset.v; vals[id] = a.includes(v) ? a.filter(x => x !== v) : a.concat([v]); }
      update();
    });
    // MSI section = the shared stock filter bar (same state as the Groups pages), embedded without its own header
    const sfb = $("sfbar"); ISC.filterBar(sfb, {rows, onChange: () => update()}); sfb.classList.add("open", "inpanel");
    CTRL.filter(c => c.kind === "multi").forEach(c => drawMulti(c.id));
  }
  function drawMulti(id) {
    const c = BYID[id], q = ($(`pc-${id}`).value || "").toLowerCase(), sel = new Set(vals[id] || []);
    const list = c.opts.filter(([v]) => sel.has(v) || !q || v.toLowerCase().includes(q));
    list.sort((a, b) => (sel.has(b[0]) - sel.has(a[0])) || (a[1] < b[1] ? -1 : 1));
    document.querySelector(`[data-msl="${id}"]`).innerHTML = list.map(([v, l]) => `<label><input type="checkbox" data-mi="${id}" value="${esc(v)}" ${sel.has(v) ? "checked" : ""}> ${esc(l)}</label>`).join("") || `<span class="muted small">no match</span>`;
    document.querySelector(`[data-msn="${id}"]`).textContent = `${sel.size} selected (max ${c.max})`;
  }
  function syncPanel() {
    const body = $("fpbody"), act = document.activeElement;
    for (const c of CTRL) {
      const v = vals[c.id];
      if (c.kind === "txt" || c.kind === "gte") { const i = body.querySelector(`input[data-id="${c.id}"]`); if (i !== act) i.value = n0(v) ? "" : v; }
      else if (c.kind === "rng") body.querySelectorAll(`input[data-id="${c.id}"]`).forEach(i => { if (i !== act) { const x = (v || [])[+i.dataset.i]; i.value = n0(x) ? "" : x; } });
      else if (c.kind === "sel") body.querySelector(`select[data-id="${c.id}"]`).value = n0(v) ? "" : String(v);
      else if (c.kind === "yn") body.querySelectorAll(`button[data-id="${c.id}"]`).forEach(b => { const on = (b.dataset.v || null) === (v || null); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      else if (c.kind === "chips" || c.kind === "mchips") body.querySelectorAll(`button[data-id="${c.id}"]`).forEach(b => { const on = c.kind === "chips" ? v === +b.dataset.v : (v || []).includes(b.dataset.v); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      else if (c.kind === "multi" && !body.contains(act) ) drawMulti(c.id);
      const pc = body.querySelector(`[data-pc="${c.id}"]`); if (pc) pc.classList.toggle("act", !empty(c, v) && c.kind !== "dis");
    }
    const cnt = {};
    for (const c of CTRL) if (!empty(c, vals[c.id]) && c.kind !== "dis") cnt[c.sec] = (cnt[c.sec] || 0) + 1;
    cnt.msi = (cnt.msi || 0) + sfConds(SF.state()).length;
    SECS.forEach(([s]) => { const b = body.querySelector(`[data-fsb="${s}"]`); b.textContent = cnt[s] ? `${cnt[s]} active` : ""; });
    const tot = Object.values(cnt).reduce((a, b) => a + b, 0) + (custom ? 1 : 0);
    $("fpb").textContent = tot ? `${tot} active` : "";
    $("custnote").hidden = !custom; body.classList.toggle("custom", !!custom);
  }
  $("fptog").onclick = () => { panelOpen = !panelOpen; $("fp").classList.toggle("open", panelOpen); $("fptog").setAttribute("aria-expanded", panelOpen); lsSet("isc-scan-panel-open", panelOpen ? "1" : "0"); };
  function resetAll() { vals = DEFAULTS(); custom = null; chip = "all"; SF.clear(); chipsHtml(); update(); }
  $("prst").onclick = resetAll;

  // ---------- Active chips ----------
  function activeHtml() {
    const out = [], x = (k, label, title) => out.push(`<span class="achip" title="${esc(title || label)}">${esc(label)} <button type="button" data-rm="${esc(k)}" aria-label="Remove ${esc(label)}">×</button></span>`);
    const p = presets.find(q => q.id === chip);
    if (p) x("chip", `Quick scan: ${p.label}`, p.desc);
    if (custom) { const t = `Custom logic: ${exprText(custom)}`; x("custom", t.length > 110 ? t.slice(0, 108) + "…" : t, exprText(custom)); }
    else for (const c of CTRL) if (c.kind !== "dis" && !empty(c, vals[c.id])) x("v:" + c.id, condLabel(c, vals[c.id]));
    const st = SF.state(), d = SF.describe();
    let i = 0;
    if (st.grMin !== null || st.grMax !== null) x("sf:gr", "MSI " + d[i++]);
    if (st.ad.length) x("sf:ad", d[i++]);
    if (st.bt.length) x("sf:bt", "Base type: " + d[i++].replace(/^base /, ""));
    if (st.bs.length) x("sf:bs", "Base status: " + d[i++].replace(/^status /, ""));
    $("act").innerHTML = (out.length ? out.join(" ") : `<span class="muted small">none</span>`) + ` <button type="button" class="lnk" id="rst">Reset</button>`;
    $("act").querySelectorAll("[data-rm]").forEach(b => b.onclick = () => {
      const k = b.dataset.rm;
      if (k === "chip") { chip = "all"; chipsHtml(); }
      else if (k === "custom") custom = null;
      else if (k.startsWith("v:")) vals[k.slice(2)] = null;
      else if (k === "sf:gr") { SF.set({grMin: null, grMax: null}); return; }
      else if (k.startsWith("sf:")) { SF.set({[k.slice(3)]: []}); return; }
      update();
    });
    $("rst").onclick = resetAll;
  }
  const opTxt = {">=": "≥", "<=": "≤", "!=": "≠", "between": "in", "in": "∈", "not_in": "∉", "contains": "~"};
  const SHORTL = {_q: "Search", _ad: "A/D", _bt: "Base type", _bs: "Base status", _tt: "MSI TT", group_rank: "MSI group rank", ad_rating: "A/D grade"};
  const fieldLabel = k => SHORTL[k] || (CTRL.find(c => c.col === k) || {}).label || L[k] || k;
  const condText = k => SS.condText(k, fieldLabel);   // plain text; every caller escapes it before innerHTML
  const exprText = e => (e.groups || []).filter(g => g.enabled !== false).map(g => "(" + (g.conditions || []).map(condText).join(g.combine === "any" ? " OR " : " AND ") + ")").join(e.join === "any" ? " OR " : " AND ");

  // ---------- table ----------
  function menuHtml() {
    $("cmb").innerHTML = GROUPS.map(g => { const cs = ALL.filter(c => c.grp === g && !c.fixed); if (!cs.length) return "";
      const allOn = cs.every(c => !hidden.has(c.key));
      return `<div class="cmg"><label class="cmh"><input type="checkbox" data-g="${g}" ${allOn ? "checked" : ""}> ${g.toUpperCase()}</label>${cs.map(c =>
        `<label><input type="checkbox" data-k="${esc(c.key)}" ${hidden.has(c.key) ? "" : "checked"}> ${esc(c.label)}</label>`).join("")}</div>`; }).join("")
      + `<button type="button" class="lnk" id="cmall">Show all</button>`;
    $("cmb").querySelectorAll("input[data-k]").forEach(i => i.onchange = () => { i.checked ? hidden.delete(i.dataset.k) : hidden.add(i.dataset.k); colsChanged(); });
    $("cmb").querySelectorAll("input[data-g]").forEach(i => i.onchange = () => { ALL.filter(c => c.grp === i.dataset.g && !c.fixed).forEach(c => i.checked ? hidden.delete(c.key) : hidden.add(c.key)); colsChanged(); });
    $("cmall").onclick = () => { hidden.clear(); colsChanged(); };
  }
  let tbl = null, cur = [];
  function mkTable() {
    const state = tbl ? tbl.state() : null;     // keep sort + column-filter boxes across column toggles
    tbl = ISC.table($("tbl"), {cols: visCols(), rows: cur, sortKey: "rs", sortDir: -1, limit: 500, onRow: r => r && openModal(r.symbol), state});
  }
  function colsChanged() { saveHidden(); menuHtml(); mkTable(); }
  function apply() {
    const p = presets.find(x => x.id === chip), e = effExpr();
    cur = rows.filter(r => (!p || EV.presetMatch(r, p)) && EV.evalExpression(r, e) && SF.test(r));
    if (!tbl) mkTable(); else tbl.setRows(cur);
    const ch = nCharts === null ? "" : ` · ${nIN(cur.filter(r => r.has_chart).length)} charts`;
    $("cntl").innerHTML = `<b>${nIN(cur.length)} of ${nIN(M)} rows</b>${ch} · chip: ${esc(p ? p.label : "All Stocks")}`
      + ` <span class="muted">(chip counts are over all ${nIN(M)} rows; the table also applies the Filters panel / Active filters)</span>`;
  }
  function update() { syncPanel(); activeHtml(); saveState(); apply(); }
  // apply an expression from the Logic builder / a user preset: panel-representable => panel + MSI state, else custom
  function applyExpr(e) {
    const pr = exprToPanel(e);
    if (pr) { vals = pr.vals; custom = null; SF.set(pr.sf); }     // SF.set triggers update via subscription
    else { custom = JSON.parse(JSON.stringify(e)); vals = {}; if (SF.isActive()) SF.clear(); }
    update();
  }
  $("csv").onclick = () => {
    const all = keys.map(k => ({key: k, label: L[k] || k}));
    ISC.downloadCSV(`scan_${scan.asof}.csv`, all, tbl ? tbl.current : cur);
  };
  const pc = meta.price_src || {};
  $("foot").innerHTML = `<p><b>Composite/Min/CAN/IPO/Cust/VolB are display columns, not recommendations; Tier 1 (RS≥80, EPS≥70, above 200-DMA) is the authority.</b> Default sort is MSI RS (descending).</p>
    <p>VCP: ${esc(meta.vcp_note || "[DATA NEEDED]")}. IPO score: ${esc(meta.ipo_score_note || "[DATA NEEDED]")}.</p>
    <p>Price source: own ${pc.own ?? "?"} · MSI fallback ${pc.msi_fallback ?? "?"} (marked <sup>M</sup>; technical columns show — "no price history"). Source tags: (MSI) = MarketSmith India snapshot, (own) = computed here from prices / ported reference scores.</p>
    <p>Not in our data: GICS sector [DATA NEEDED]; setup-engine fields (SE Score, Pvt Dist, SE Ready, SE Pattern) = phase 3.</p>`;

  // ---------- Logic builder ----------
  const ENUMS = {stage: STAGES, msi_stage: STAGES, base_type: uniq("base_type").map(v => [v, v]), base_status: uniq("base_status").map(v => [v, v]),
    ad_rating: uniq("ad_rating").map(v => [v, v]), exchange: uniq("exchange").map(v => [v, v]), industry_group: INDUSTRIES.map(v => [v, v]),
    _ad: [["A", "A family"], ["B", "B family"], ["C", "C family"], ["D", "D family"], ["E", "E"], ["B-", "B- or better"]],
    _bt: SF.BASE_TYPES.map(v => [v, v]).concat([["none", "No base"]]), _bs: SF.BASE_STATUS.map(v => [v, v]).concat([["none", "No base"]]),
    _tt: [["1M", "1M list"], ["5M", "5M list"], ["none", "none"]]};
  const FIELDS = {};
  {
    const pl = {}; CTRL.forEach(c => { if (c.col && !pl[c.col]) pl[c.col] = c.label; });
    for (const k of keys) {
      if (["name", "symbol"].includes(k)) continue;
      const t = TY[k] === "bool" ? "bool" : TY[k] === "str" ? "str" : "num";
      FIELDS[k] = {label: pl[k] ? `${pl[k]} [${L[k]}]` : `${L[k]} · ${TIP[k] || ""}`.slice(0, 60), type: ENUMS[k] && t === "str" ? "enum" : t, tag: tagOf(k), enum: ENUMS[k]};
    }
    FIELDS._q = {label: "Symbol / name (search)", type: "str", tag: ""};
    FIELDS._ad = {label: "A/D rating (MSI chips: family / B- or better)", type: "enum", tag: "(MSI)", enum: ENUMS._ad};
    FIELDS._bt = {label: "Base type incl. No base", type: "enum", tag: "(MSI)", enum: ENUMS._bt};
    FIELDS._bs = {label: "Base status incl. No base", type: "enum", tag: "(MSI)", enum: ENUMS._bs};
    FIELDS._tt = {label: "MSI TT list", type: "enum", tag: "(MSI)", enum: ENUMS._tt};
  }
  const OPS_BY = {num: [">=", "<=", ">", "<", "=", "!=", "between"], bool: ["is_true", "is_false"], str: ["contains", "=", "!=", "in", "not_in"], enum: ["in", "not_in"]};
  const opsFor = k => { const f = FIELDS[k] || {type: "num"}; return f.enum && f.type === "num" ? OPS_BY.num.concat(["in", "not_in"]) : OPS_BY[f.type]; };
  const OPL = {">=": "≥", "<=": "≤", ">": ">", "<": "<", "=": "=", "!=": "≠", between: "between", in: "is any of", not_in: "is none of", contains: "contains", is_true: "is Yes", is_false: "is No"};
  const MAXG = SS.MAXG, MAXC = SS.MAXC;
  let bx = null;
  function cleanExpr(e) {
    const okv = k => {
      const t = (FIELDS[k.col] || {}).type;
      if (k.op === "is_true" || k.op === "is_false") return true;
      if (k.op === "between") return Array.isArray(k.value) && k.value.some(v => typeof v === "number" && !Number.isNaN(v));
      if (k.op === "in" || k.op === "not_in") return Array.isArray(k.value) && k.value.length > 0;
      if (t === "num" || (["=", "!="].includes(k.op) && typeof k.value === "number")) return typeof k.value === "number" && !Number.isNaN(k.value);
      return k.value !== "" && k.value !== null && k.value !== undefined;
    };
    return {join: e.join, groups: e.groups.map(g => ({combine: g.combine, conditions: g.conditions.filter(k => k.col && okv(k))})).filter(g => g.conditions.length)};
  }
  function openBuilder() {
    const base = custom || {join: "all", groups: [{combine: "all", conditions: panelExpr().groups[0].conditions.concat(sfConds(SF.state()))}]};
    bx = JSON.parse(JSON.stringify(base));
    bx.groups = bx.groups.map(g => ({combine: g.combine || "all", conditions: g.conditions || []}));
    if (!bx.groups.length) bx.groups.push({combine: "all", conditions: []});
    drawBuilder(); document.addEventListener("keydown", lbKey);
  }
  const closeBuilder = () => { $("lb").innerHTML = ""; bx = null; document.removeEventListener("keydown", lbKey); $("lbtn").focus(); };
  const lbKey = e => { if (e.key === "Escape") closeBuilder(); };
  const valHtml = (gi, ci, k) => SS.valHtml(k, `data-g="${+gi}" data-c="${+ci}"`, FIELDS[k.col] || {});
  function drawBuilder() {
    const fopts = sel => Object.entries(FIELDS).map(([k, f]) => `<option value="${esc(k)}" ${k === sel ? "selected" : ""}>${esc(f.label)} ${esc(f.tag)}</option>`).join("");
    $("lb").innerHTML = `<div class="ovl" id="lbo"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="lbt">
      <div class="dlh"><b id="lbt">Logic builder</b> <span class="muted small">up to ${MAXG} groups × ${MAXC} conditions</span><button type="button" class="x" id="lbx" aria-label="Close">×</button></div>
      <div class="dlb">
        <div class="lbj">Groups joined by <select id="lbjoin"><option value="all" ${bx.join !== "any" ? "selected" : ""}>ALL (AND)</option><option value="any" ${bx.join === "any" ? "selected" : ""}>ANY (OR)</option></select></div>
        ${bx.groups.map((g, gi) => `<div class="lbg"><div class="lbgh"><b>Group ${gi + 1}</b> match <select data-gm="${gi}"><option value="all" ${g.combine !== "any" ? "selected" : ""}>all (AND)</option><option value="any" ${g.combine === "any" ? "selected" : ""}>any (OR)</option></select>
          <button type="button" class="lnk" data-gx="${gi}">remove group</button></div>
          ${g.conditions.map((k, ci) => `<div class="lbc"><select data-g="${gi}" data-c="${ci}" data-f="1" aria-label="field"><option value="">— field —</option>${fopts(k.col)}</select>
            <select data-g="${gi}" data-c="${ci}" data-o="1" aria-label="operator">${(k.col ? opsFor(k.col) : []).map(o => `<option value="${o}" ${o === k.op ? "selected" : ""}>${esc(OPL[o])}</option>`).join("")}</select>
            <span class="lbv">${k.col ? valHtml(gi, ci, k) : ""}</span><button type="button" class="x" data-cx="${gi}:${ci}" aria-label="Remove condition">×</button></div>`).join("")}
          <button type="button" class="lnk" data-ca="${gi}" ${g.conditions.length >= MAXC ? "disabled" : ""}>+ condition</button></div>`).join("")}
        <button type="button" class="lnk" id="lbga" ${bx.groups.length >= MAXG ? "disabled" : ""}>+ group</button>
      </div>
      <div class="dlf"><b id="lbn" aria-live="polite"></b><span class="sp"></span>
        <input type="text" id="lbpn" placeholder="preset name" aria-label="Preset name"><button type="button" id="lbps">Save as preset</button>
        <button type="button" id="lbc">Cancel</button><button type="button" class="pri" id="lba">Apply</button></div>
    </div></div>`;
    lbCount();
    const root = $("lb");
    $("lbx").onclick = $("lbc").onclick = closeBuilder;
    $("lbo").onclick = e => { if (e.target.id === "lbo") closeBuilder(); };
    $("lbjoin").onchange = e => { bx.join = e.target.value; lbCount(); };
    root.querySelectorAll("[data-gm]").forEach(s => s.onchange = () => { bx.groups[+s.dataset.gm].combine = s.value; lbCount(); });
    root.querySelectorAll("[data-gx]").forEach(b => b.onclick = () => { bx.groups.splice(+b.dataset.gx, 1); if (!bx.groups.length) bx.groups.push({combine: "all", conditions: []}); drawBuilder(); });
    root.querySelectorAll("[data-ca]").forEach(b => b.onclick = () => { bx.groups[+b.dataset.ca].conditions.push({col: "", op: "", value: null}); drawBuilder(); });
    root.querySelectorAll("[data-cx]").forEach(b => b.onclick = () => { const [g, c] = b.dataset.cx.split(":").map(Number); bx.groups[g].conditions.splice(c, 1); drawBuilder(); });
    $("lbga").onclick = () => { bx.groups.push({combine: "all", conditions: [{col: "", op: "", value: null}]}); drawBuilder(); };
    const K = el => bx.groups[+el.dataset.g].conditions[+el.dataset.c];
    root.querySelectorAll("[data-f]").forEach(s => s.onchange = () => { const k = K(s); k.col = s.value; k.op = s.value ? opsFor(s.value)[0] : ""; k.value = null; drawBuilder(); });
    root.querySelectorAll("[data-o]").forEach(s => s.onchange = () => { const k = K(s); const was = k.op; k.op = s.value;
      if ((was === "between") !== (k.op === "between") || (["in", "not_in"].includes(was) !== ["in", "not_in"].includes(k.op))) k.value = null; drawBuilder(); });
    root.querySelectorAll(".lbv input, .lbv select").forEach(el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
      const k = K(el), f = FIELDS[k.col] || {};
      if (el.dataset.vi !== undefined) { const v = Array.isArray(k.value) ? k.value.slice() : [null, null]; v[+el.dataset.vi] = el.value === "" ? null : +el.value; k.value = v; }
      else if (el.dataset.vm) { k.value = [...el.selectedOptions].map(o => f.type === "num" || (f.enum && typeof f.enum[0][0] === "number") ? +o.value : o.value); }
      else if (el.dataset.vs) k.value = el.value === "" ? null : +el.value;
      else if (el.dataset.vl) k.value = el.value.split(",").map(x => x.trim()).filter(Boolean).map(x => f.type === "num" && !Number.isNaN(+x) ? +x : x);
      else if (el.dataset.vn) k.value = el.value === "" ? null : +el.value;
      else k.value = k.op === "contains" ? el.value.toLowerCase() : el.value;
      lbCount();
    }));
    $("lba").onclick = () => { const e = cleanExpr(bx); closeBuilder(); applyExpr(e); };
    $("lbps").onclick = () => {
      const name = $("lbpn").value.trim(); if (!name) { $("lbpn").focus(); return; }
      const a = userPresets().filter(p => p.label !== name); a.push({label: name, expr: cleanExpr(bx)}); saveUserPresets(a); chipsHtml();
      $("lbps").textContent = "Saved ✓"; setTimeout(() => { if ($("lbps")) $("lbps").textContent = "Save as preset"; }, 1200);
    };
    const first = root.querySelector("select,input"); if (first) first.focus();
  }
  let lbT = null;
  function lbCount() { clearTimeout(lbT); lbT = setTimeout(() => { if (!bx || !$("lbn")) return; const e = cleanExpr(bx);
    $("lbn").textContent = `${nIN(EV.count(rows, e))} of ${nIN(M)} rows match`; $("lbn").title = exprText(e) + " (before the quick-scan chip)"; }, 60); }
  $("lbtn").onclick = openBuilder;

  // ---------- chart pop-up ----------
  let groupsP = null, mdl = null;
  const getGroups = () => groupsP || (groupsP = ISC.load("groups").catch(() => []));
  const DN = "[DATA NEEDED]";
  function side(r, groups) {
    const miss = k => SRC[k] === "msi" ? DN : r._nohist && priceCol.has(k) ? dash() : dash("no value");
    const v = (k, d = 0, suf = "") => n0(r[k]) ? miss(k) : fmt(r[k], d) + suf;
    const yn = k => n0(r[k]) ? miss(k) : r[k] ? "Yes" : "No";
    const row = (l, h, k) => `<div class="kv"><span class="k">${esc(l)}${k && tagOf(k) ? ` <small class="stag">${tagOf(k)}</small>` : ""}</span><span class="v">${h}</span></div>`;
    const sec = (t, body) => `<div class="msec"><h3>${esc(t)}</h3>${body}</div>`;
    const gk = x => ISC.groupKey(String(x ?? "").replace(/\s+IN\s*$/i, ""));
    const g = (groups || []).find(x => gk(x.Group) === gk(r.industry_group));
    const bp = g && Array.isArray(g.bucket_path) && g.bucket_path.length ? g.bucket_path[g.bucket_path.length - 1] : null;
    const rank = g && !n0(g.MsiRank) ? g.MsiRank : r.group_rank;
    const stg = x => n0(x) ? null : `S${x}`;
    return `<div class="mhd"><div class="mname">${esc(r.name || r.symbol)}</div><div class="muted small">${esc(r.symbol)} · ${esc(r.exchange || "")}
        ${r.tier1 === 1 ? `<span class="t1b">Tier 1</span>` : r.tier1 === 0 ? `<span class="t1n">not Tier 1</span>` : ""}</div></div>`
      + sec("About", row("MSI group", r.industry_group ? ISC.groupLink(r.industry_group, null, {destination: "rrg"}) : DN, "industry_group")
        + row("MSI group rank", n0(rank) ? DN : `${fmt(rank, 0)}${g && !n0(g.Rank1w) ? ` <span class="muted">(1w ${fmt(g.Rank1w, 0)})</span>` : ""}${n0(bp) ? "" : ` <span class="bchip b${bp}">B${bp}</span>`}`, "group_rank"))
      + sec("Scores", `<div class="muted small" style="margin-bottom:4px">Display columns, not recommendations; Tier 1 is the authority.</div>` + [["Composite", "composite"], ["Minervini", "minervini"], ["CANSLIM", "canslim"], ["IPO", "ipo"], ["Custom", "custom"], ["Vol BT", "volb"]].map(([l, k]) => row(l, v(k), k)).join(""))
      + sec("Relative strength", row("RS Rating", v("rs"), "rs") + row("RS 1M", v("rs1m_own"), "rs1m_own") + row("RS 3M", v("rs3m"), "rs3m") + row("RS 12M", v("rs12m_own"), "rs12m_own")
        + row("Beta", v("beta", 2), "beta") + row("β-adj RS", v("beta_adj_rs"), "beta_adj_rs"))
      + sec("Growth", row("EPS Q/Q", v("eps_growth_qq", 0, "%"), "eps_growth_qq") + row("Sales Q/Q", v("sales_growth_qq", 0, "%"), "sales_growth_qq") + row("EPS Y/Y", v("eps_chg_yr", 0, "%"), "eps_chg_yr")
        + row("Sales Y/Y", v("sales_chg_yr", 0, "%"), "sales_chg_yr") + row("ROE", v("roe", 1, "%"), "roe") + row("ROIC", v("roic", 1, "%"), "roic"))
      + sec("Setup", row("Base type", r.base_type ? esc(r.base_type) : `<span class="muted">No base</span>`, "base_type") + row("Base status", r.base_status ? esc(r.base_status) : `<span class="muted">—</span>`, "base_status")
        + row("% to pivot", !n0(r.pct_to_pivot) ? fmt(r.pct_to_pivot, 1) + "%" : r.base_status === "Forming" ? DN : dash(r.base_status ? "no open base" : "no base"), "pct_to_pivot")
        + row("VCP score", v("vcp_score"), "vcp_score") + row("VCP ready", yn("vcp_ready"), "vcp_ready"))
      + sec("Price & technical", row("Price", n0(r.price) ? dash("no price") : fmt(r.price, 2) + (r._nohist ? `<sup class="muted" title="MSI price">M</sup>` : ""), "price")
        + row("Stage", stg(r.stage) || miss("stage"), "stage") + row("MSI stage", stg(r.msi_stage) || dash("MSI DMA fields missing"), "msi_stage") + row("MA align", yn("ma_align"), "ma_align")
        + row("ADR", v("adr_pct", 1, "%"), "adr_pct") + row("% vs EMA10", v("pct_vs_ema10", 1, "%"), "pct_vs_ema10") + row("% vs EMA20", v("pct_vs_ema20", 1, "%"), "pct_vs_ema20")
        + row("% vs EMA50", v("pct_vs_ema50", 1, "%"), "pct_vs_ema50") + row("% from 52W high", v("from_52w_high", 1, "%"), "from_52w_high") + row("% from 52W low", v("from_52w_low", 1, "%"), "from_52w_low"));
  }
  const bySym = new Map(rows.map(r => [r.symbol, r]));
  let mTok = 0, mChart = null;
  function setHash(sym) { try { history.replaceState(null, "", location.pathname + location.search + (sym ? "#s=" + encodeURIComponent(sym) : "")); } catch (e) {} }
  async function openModal(sym) {
    const r = bySym.get(sym); if (!r) return;
    const list = tbl ? tbl.current : cur, idx = list.findIndex(x => x.symbol === sym);
    const tok = ++mTok;
    if (!mdl) {
      $("mdl").innerHTML = `<div class="ovl mov" id="mo"><div class="mdlg" role="dialog" aria-modal="true" aria-labelledby="mt">
        <div class="mh vhead"><span id="mpos" class="vpos"></span><span class="vpill" title="Static build from MSI data">MSI data</span><b id="mt"></b><span class="sp"></span><button type="button" id="mp" aria-label="Previous stock">←</button><button type="button" id="mn" aria-label="Next stock">→</button>
          <a id="mfull" class="small" href="#">Full page →</a><button type="button" class="x vx" id="mx" aria-label="Close" title="Close (Esc)">✕</button></div>
        <div class="mb"><aside class="mside" id="ms"></aside><div class="mch" id="mc"></div></div></div></div>`;
      mdl = {sym: null};
      $("mx").onclick = closeModal; $("mo").onclick = e => { if (e.target.id === "mo") closeModal(); };
      $("mp").onclick = () => step(-1); $("mn").onclick = () => step(1);
      document.addEventListener("keydown", mKey);
    }
    mdl.sym = sym;
    $("mt").textContent = r.symbol;
    $("mpos").textContent = idx >= 0 ? `Stock ${nIN(idx + 1)} of ${nIN(list.length)}` : `Stock – of ${nIN(list.length)}`;
    $("mp").disabled = idx <= 0; $("mn").disabled = idx < 0 || idx >= list.length - 1;
    $("mfull").href = "stock.html?s=" + encodeURIComponent(r.symbol);
    setHash(r.symbol);
    $("ms").innerHTML = side(r, null);
    if (mChart) { mChart.destroy(); mChart = null; }
    const box = document.createElement("div"); $("mc").innerHTML = ""; $("mc").appendChild(box);
    getGroups().then(g => { if (tok === mTok) $("ms").innerHTML = side(r, g); });
    const h = await ISC.stockChart(box, r.symbol, {hasChart: r.has_chart !== false, noChartText: "No chart (outside charted set)", abortIfDetached: true});
    if (tok !== mTok || !box.isConnected) { if (h) h.destroy(); return; }
    mChart = h;
  }
  function step(d) {
    if (!mdl) return; const list = tbl ? tbl.current : cur, i = list.findIndex(x => x.symbol === mdl.sym), j = i + d;
    if (i >= 0 && j >= 0 && j < list.length) openModal(list[j].symbol);
  }
  const mKey = e => {
    if (!mdl || bx) return;
    if (e.key === "Escape") closeModal();
    else if (e.key === "ArrowLeft" && !/INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || "")) { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowRight" && !/INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || "")) { e.preventDefault(); step(1); }
  };
  function closeModal() { mTok++; if (mChart) { mChart.destroy(); mChart = null; } $("mdl").innerHTML = ""; mdl = null; document.removeEventListener("keydown", mKey); setHash(null); }

  // ---------- boot ----------
  chipsHtml(); panelHtml(); menuHtml();
  update();
  if (restoredFrom && (custom || chip !== "all" || SF.isActive() || JSON.stringify(vals) !== JSON.stringify(DEFAULTS()))) {
    $("rnotet").textContent = restoredFrom === "visit" ? "Filters restored from your last visit \u2014" : "Filters restored from the link \u2014";
    $("rnote").hidden = false;
    $("rnr").onclick = () => { $("rnote").hidden = true; resetAll(); };
    $("rnx").onclick = () => { $("rnote").hidden = true; };
  }
  const tPaint = performance.now() - T0;
  window.ISC_SCAN_PERF = {firstPaintMs: Math.round(tPaint)};
  window.__iscScan = {rows, effExpr, exprToPanel, applyExpr, openModal, get current() { return tbl ? tbl.current : cur; }};
  const hs = /^#s=(.+)$/.exec(location.hash); if (hs) openModal(decodeURIComponent(hs[1]));
  // ---------- lazy: sparklines + has_chart / MSI TT join ----------
  requestAnimationFrame(() => setTimeout(async () => {
    try { spark = await ISC.load("scan_spark"); tbl.setRows(cur); window.ISC_SCAN_PERF.sparkMs = Math.round(performance.now() - T0); } catch (e) { spark = {p: {}, r: {}}; tbl.setRows(cur); }
    try {
      const st = await ISC.load("stocks"), hc = new Map(st.map(s => [String(s.Symbol).trim(), s]));
      rows.forEach(r => { const s = hc.get(r.symbol); r.has_chart = s ? !!s.has_chart : false; r._tt = s ? (s.Minervini_Stage || "none") : "none"; });
      nCharts = rows.filter(r => r.has_chart).length; apply();
    } catch (e) {}
  }, 0));
})();
