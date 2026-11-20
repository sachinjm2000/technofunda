/* Stock chart (factored out of stock.js, S4b). ISC.stockChart(el, symbol, opts) -> Promise<handle|null>
   Builds toolbar (Daily/Weekly, RS, Patterns, ranges, zoom) + Lightweight Charts candle chart inside `el`.
   opts: {hasChart (false => skip fetch), noChartText, height}. handle: {ch, cs, L, extra, on, render, tf, destroy()}.
   Needs LightweightCharts (CDN) loaded on the page. Resolves null (and shows noChartText) when there is no chart file. */
(function () {
  const CSS = `.isc-sc .ctool{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:6px;position:relative}
.isc-sc .ctool button{font:inherit;font-size:12px;padding:3px 8px;border:1px solid var(--line);background:transparent;color:inherit;border-radius:4px;cursor:pointer}
.isc-sc .ctool button.on{background:#1e5bff;color:#fff;border-color:#1e5bff}.isc-sc .ctool .sep{width:1px;height:18px;background:var(--line);margin:0 4px}
.isc-sc .pmenu{position:absolute;top:30px;z-index:5;background:var(--card,#fff);border:1px solid var(--line);border-radius:6px;padding:8px 10px;box-shadow:0 4px 14px #0003;font-size:13px;display:none}
.isc-sc .pmenu label{display:block;white-space:nowrap;padding:2px 0}.isc-sc .pmenu.open{display:block}
.isc-sc .cwrap{position:relative}.isc-sc .chart{height:480px;width:100%}@media (max-width:600px){.isc-sc .chart{height:380px}}
.isc-sc .ohlc{position:absolute;left:6px;top:6px;z-index:4;background:#1f2329e0;color:#fff;border-radius:12px;padding:3px 10px;font-size:12px;pointer-events:none;max-width:calc(100% - 70px);overflow-wrap:anywhere}
@media (max-width:480px){.isc-sc .ohlc{position:static;display:block;border-radius:6px;margin:0 0 4px;max-width:none;font-size:11px;padding:2px 8px}.isc-sc .ohlc b{margin-left:3px}}
.isc-sc .ohlc b{font-weight:600;color:#bbb;margin-left:6px}.isc-sc .ohlc .up{color:#6fb8ff}.isc-sc .ohlc .dn{color:#ff7bbf}`;
  function injectCss() {
    if (document.getElementById("isc-sc-css")) return;
    const st = document.createElement("style"); st.id = "isc-sc-css"; st.textContent = CSS; document.head.appendChild(st);
  }
  // Packed chart files (isc/export.py build_charts): c = close paise delta-encoded; o/h/l = paise offset from close; v = volume
  // in thousands; e10/e20/e50/ma200 = paise delta; rs = x100 delta; markers = indices; weekly in p.w with chart_wdates.json.
  const und = a => { let p = null; return a.map(v => v === null ? null : (p = (p === null ? v : p + v))); };
  // e10/e20/e50 = [start idx, Pine ta.ema in paise]; later bars by the EMA recurrence. ma200 = 2nd-order delta. RS = close / CNX500
  // (chart_bench.json on the same calendars), normalised to 100 at the first shown bar.
  const unpack = (p, cal, bench) => {
    const cc = und(p.c), P = x => x / 100, rel = k => p[k].map((x, i) => x === null || cc[i] === null ? null : P(x + cc[i]));
    const d = p.d || cal.slice(p.s, p.s + cc.length), c = cc.map(x => x === null ? null : P(x));
    const o = {d, c, o: rel("o"), h: rel("h"), l: rel("l"), v: p.v};
    for (const [k, N] of [["e10", 10], ["e20", 20], ["e50", 50]]) if (p[k]) {
      const a = 2 / (N + 1), out = c.map(() => null); let e = p[k][1] / 100; out[p[k][0]] = e;
      for (let i = p[k][0] + 1; i < c.length; i++) { if (c[i] !== null) e = a * c[i] + (1 - a) * e; out[i] = e; }
      o[k] = out;
    }
    if (p.ma200) o.ma200 = und(und(p.ma200)).map(x => x === null ? null : P(x));
    if (bench && cal) {
      const pos = new Map(cal.map((x, i) => [x, i])), b = d.map(x => pos.has(x) ? bench[pos.get(x)] : null);
      let r0 = null; for (let i = 0; i < c.length && r0 === null; i++) if (c[i] && b[i]) r0 = c[i] / b[i];
      if (r0) o.rs = c.map((x, i) => x && b[i] ? x / b[i] / r0 * 100 : null);
    }
    return o;
  };
  const shared = {};   // calendars / bench cached across charts on one page
  const getShared = f => shared[f] || (shared[f] = fetch(`${ISC.BL()}data/${f}`).then(x => x.ok ? x.json() : null).catch(() => null));
  async function loadChart(sym) {
    const r = await fetch(`${ISC.BL()}data/charts/${encodeURIComponent(sym)}.json`); if (!r.ok) return null;
    const p = await r.json();
    const [cal, wcal, bench] = await Promise.all([getShared("chart_dates.json"), p.w ? getShared("chart_wdates.json") : null, getShared("chart_bench.json")]);
    const D = unpack(p, cal, bench && bench.d); D.pat = p; D.W = p.w ? unpack(p.w, wcal, bench && bench.w) : null;
    return D;
  }

  async function stockChart(el, sym, opts = {}) {
    const {fmt, esc} = ISC;
    injectCss();
    el.classList.add("isc-sc");
    el.innerHTML = `<div class="ctool">
   <button data-tf="d" class="on">Daily</button><button data-tf="w">Weekly</button><span class="sep"></span>
   <button data-b="rs" class="on">RS</button><button data-b="pat">Patterns ▾</button><button data-b="mk" title="Show/hide pattern markers on the candles">Markers</button><span class="sep"></span>
   <button data-r="21">1M</button><button data-r="63">3M</button><button data-r="126">6M</button><button data-r="252">1Y</button><button data-r="0">All</button><span class="sep"></span>
   <button data-z="in" title="Zoom in">+</button><button data-z="out" title="Zoom out">−</button><button data-z="fit" title="Fit all bars">Fit</button>
   <div class="pmenu"></div>
  </div>
  <div class="cwrap"><div class="ohlc"></div><div class="chart"${opts.height ? ` style="height:${esc(opts.height)}"` : ""}></div></div><div class="nochart muted"></div>`;
    const q = s => el.querySelector(s), qa = s => el.querySelectorAll(s);
    let D = null;
    if (opts.hasChart !== false) { try { D = await loadChart(sym); } catch (e) { D = null; } }
    if (!el.isConnected && opts.abortIfDetached) return null;
    if (!D || !D.d || !D.d.length) {
      q(".cwrap").style.display = "none"; q(".ctool").style.display = "none";
      q(".nochart").textContent = opts.noChartText || "No chart for this stock (outside the ~RS≥70 / screen-list set)";
      return null;
    }
    const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    const dark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    const UP = "#1e88e5", DN_ = "#e91e8c", PPC = "#ffd600";
    const narrow = (el.clientWidth || innerWidth) < 480;      // phone width: markers default OFF, no crosshair price label over the axis
    const ch = LightweightCharts.createChart(q(".chart"), {autoSize: true,
      layout: {background: {color: "transparent"}, textColor: dark ? "#ece8f2" : "#212529"},
      grid: {vertLines: {color: css("--line")}, horzLines: {color: css("--line")}},
      rightPriceScale: {borderColor: css("--line"), scaleMargins: {top: 0.08, bottom: 0.22}, autoScale: true},
      timeScale: {borderColor: css("--line"), rightOffset: 3, barSpacing: 6, minBarSpacing: 0.5},
      crosshair: {mode: LightweightCharts.CrosshairMode.Normal, horzLine: {labelVisible: !narrow}},
      handleScroll: true, handleScale: true});
    const cs = ch.addCandlestickSeries({upColor: UP, downColor: DN_, borderVisible: false, wickUpColor: UP, wickDownColor: DN_, priceLineVisible: false});
    const vs = ch.addHistogramSeries({priceFormat: {type: "volume"}, priceScaleId: "vol", lastValueVisible: false, priceLineVisible: false});
    ch.priceScale("vol").applyOptions({scaleMargins: {top: 0.84, bottom: 0}});
    const line = (color, extra) => ch.addLineSeries(Object.assign({color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false}, extra || {}));
    const L = {e10: line(dark ? "#e0e0e0" : "#000000"), e20: line("#1e5bff"), e50: line("#22a722"), ma200: line("#9e9e9e", {visible: false}),
      rs: line("#f5a623", {priceScaleId: "rs", lineWidth: 2})};
    ch.priceScale("rs").applyOptions({scaleMargins: {top: 0.55, bottom: 0.18}, visible: false});
    let extra = [];   // RMVP + prior-high line series

    const LAYERS = [["reclaim", "EMA reclaim +", true], ["inside", "Inside bars ▲▼", true], ["rmv", "RMV circles", true], ["pp", "Pocket pivot candles", true],
      ["rmvp", "RMVP blue lines", true], ["ph", "Prior-high lines", true], ["ma200", "MA 200", false]];
    const on = Object.fromEntries(LAYERS.map(([k, , d]) => [k, d]));
    const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
    let tf = "d", rsOn = true, mkOn = !narrow, range = +(store("isc.stock.range") ?? 126); if (!Number.isFinite(range)) range = 126;
    const ok = v => v !== null && v !== undefined && !Number.isNaN(v);

    function render() {
      const X = tf === "d" ? D : D.W, pat = tf === "d" ? D.pat : null, I = X.d.map((_, i) => i);
      const pp = new Set(pat && on.pp ? pat.pp : []);
      cs.setData(I.filter(i => ok(X.o[i]) && ok(X.h[i]) && ok(X.l[i]) && ok(X.c[i])).map(i => {
        const b = {time: X.d[i], open: X.o[i], high: X.h[i], low: X.l[i], close: X.c[i]};
        if (pp.has(i)) Object.assign(b, {color: PPC, wickColor: PPC});
        return b;
      }));
      vs.setData(I.filter(i => ok(X.v[i])).map(i => ({time: X.d[i], value: X.v[i] * 1000, color: X.c[i] >= X.o[i] ? "rgba(30,136,229,.35)" : "rgba(233,30,140,.35)"})));
      for (const k of ["e10", "e20", "e50", "ma200", "rs"]) L[k].setData(X[k] ? I.filter(i => ok(X[k][i])).map(i => ({time: X.d[i], value: X[k][i]})) : []);
      L.ma200.applyOptions({visible: on.ma200}); L.rs.applyOptions({visible: rsOn});
      const mk = [];
      if (pat && mkOn) {
        const add = (arr, m) => (arr || []).forEach(i => X.d[i] && mk.push(Object.assign({time: X.d[i]}, m)));
        if (on.reclaim) add(pat.reclaim, {position: "belowBar", shape: "text", text: "+", color: "#0e9044", size: 1});
        if (on.inside) { add(pat.in_t, {position: "belowBar", shape: "arrowUp", color: "#f5c518", size: 0.6}); add(pat.in_m, {position: "belowBar", shape: "arrowUp", color: "#0e9044", size: 0.6});
          add(pat.in_l, {position: "aboveBar", shape: "arrowDown", color: "#e53935", size: 0.6}); }
        if (on.rmv) { add(pat.rmv1, {position: "belowBar", shape: "circle", color: "#81c784", size: 0.5}); add(pat.rmv2, {position: "belowBar", shape: "circle", color: "#2e7d32", size: 0.5});
          add(pat.rmv3, {position: "belowBar", shape: "circle", color: "#1b5e20", size: 0.5}); }
      }
      mk.sort((a, b) => a.time < b.time ? -1 : a.time > b.time ? 1 : 0); cs.setMarkers(mk);
      extra.forEach(x => ch.removeSeries(x)); extra = [];
      const seg = (x1, x2, y, color) => { x2 = Math.min(x2, X.d.length - 1); if (!(x2 > x1) || !X.d[x1]) return;
        const l = line(color, {lineWidth: 2}); l.setData([{time: X.d[x1], value: y}, {time: X.d[x2], value: y}]); extra.push(l); };
      if (pat && on.rmvp) (pat.rmvp || []).forEach(([a, b, y]) => seg(a, b, y / 100, "#2962ff"));
      if (pat && on.ph) [...(pat.in_t || []), ...(pat.in_m || []), ...(pat.in_l || [])].forEach(i => i >= 1 && seg(i - 1, i + 1, X.h[i - 1], "#3b6fd6"));
      setRange(range, false); head(null);
    }
    function setRange(r, save = true) {
      range = r; if (save) store("isc.stock.range", String(r));
      const X = tf === "d" ? D : D.W, N = X.d.length, bars = r === 0 ? N : Math.min(N, tf === "d" ? r : Math.max(4, Math.round(r / 5)));
      ch.timeScale().setVisibleLogicalRange({from: N - bars - 0.5, to: N - 1 + 3});
      qa(".ctool [data-r]").forEach(b => b.classList.toggle("on", +b.dataset.r === r));
    }
    const ohlc = q(".ohlc");
    function head(t) {
      const X = tf === "d" ? D : D.W; let i = t ? X.d.indexOf(t) : -1; if (i < 0) i = X.d.length - 1;
      const pc = i > 0 ? X.c[i - 1] : null, ch_ = ok(pc) && pc ? (X.c[i] / pc - 1) * 100 : null, c = X.c[i] >= X.o[i] ? "up" : "dn";
      ohlc.innerHTML = `${esc(X.d[i])} <b>O</b> <span class="${c}">${fmt(X.o[i], 2)}</span> <b>H</b> <span class="${c}">${fmt(X.h[i], 2)}</span> <b>L</b> <span class="${c}">${fmt(X.l[i], 2)}</span> <b>C</b> <span class="${c}">${fmt(X.c[i], 2)}</span>${ch_ === null ? "" : ` <span class="${ch_ >= 0 ? "up" : "dn"}">${ch_ >= 0 ? "+" : ""}${fmt(ch_, 2)}%</span>`}`;
    }
    ch.subscribeCrosshairMove(p => head(p && p.time ? (typeof p.time === "string" ? p.time : `${p.time.year}-${String(p.time.month).padStart(2, "0")}-${String(p.time.day).padStart(2, "0")}`) : null));

    const pm = q(".pmenu"), bPat = q('[data-b="pat"]');
    pm.innerHTML = LAYERS.map(([k, t]) => `<label><input type="checkbox" data-l="${k}" ${on[k] ? "checked" : ""}> ${esc(t)}</label>`).join("");
    pm.addEventListener("change", e => { const k = e.target.dataset.l; if (k) { on[k] = e.target.checked; render(); } });
    bPat.onclick = e => { e.stopPropagation(); pm.style.left = bPat.offsetLeft + "px"; pm.classList.toggle("open"); };
    const docClick = e => { if (!pm.contains(e.target) && e.target !== bPat) pm.classList.remove("open"); };
    document.addEventListener("click", docClick);
    qa(".ctool [data-tf]").forEach(b => b.onclick = () => {
      if (b.dataset.tf === "w" && !D.W) return; tf = b.dataset.tf;
      qa(".ctool [data-tf]").forEach(x => x.classList.toggle("on", x === b)); render(); });
    const bMk = q('[data-b="mk"]'); bMk.classList.toggle("on", mkOn); bMk.onclick = () => { mkOn = !mkOn; bMk.classList.toggle("on", mkOn); render(); };
    q('[data-b="rs"]').onclick = e => { rsOn = !rsOn; e.target.classList.toggle("on", rsOn); L.rs.applyOptions({visible: rsOn}); };
    qa(".ctool [data-r]").forEach(b => b.onclick = () => setRange(+b.dataset.r));
    const zoom = f => { const ts = ch.timeScale(), sp = ts.options().barSpacing; ts.applyOptions({barSpacing: Math.max(0.5, Math.min(60, sp * f))}); };
    q('[data-z="in"]').onclick = () => zoom(1.4); q('[data-z="out"]').onclick = () => zoom(1 / 1.4);
    q('[data-z="fit"]').onclick = () => { ch.timeScale().fitContent(); qa(".ctool [data-r]").forEach(b => b.classList.remove("on")); };
    render();
    return {ch, cs, L, get extra() { return extra; }, on, render, get tf() { return tf; },
      destroy() { document.removeEventListener("click", docClick); try { ch.remove(); } catch (e) {} el.innerHTML = ""; }};
  }
  window.ISC.stockChart = stockChart;
})();
