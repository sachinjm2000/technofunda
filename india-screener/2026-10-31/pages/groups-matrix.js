window.GP = window.GP || {tabs: {}};
GP.tabs.matrix = el => {
  const {esc, fmt} = ISC, D = GP.D, MX = D.matrix, trim = GP.trim;
  const COL7 = ["#b3202e", "#d9545f", "#f0a3a9", "#e4e1e8", "#a8d49a", "#5fae45", "#1f7a02"];
  const COL5 = ["#b3202e", "#f0a3a9", "#e4e1e8", "#a8d49a", "#1f7a02"];
  const EDGES = {d1: [-2.5, -1.5, -.5, .5, 1.5, 2.5], w1: [-5, -3, -1, 1, 3, 5], m1: [-10, -6, -2, 2, 6, 10]};
  const LBL = {d1: "1D %", w1: "1W %", m1: "1M %", rs: "RS"};
  const IDX = {rs: 1, d1: 2, w1: 3, m1: 4};
  const band = m => m == null ? null : m >= 20000 ? "Large" : m >= 5000 ? "Mid" : m >= 1000 ? "Small" : "Micro";
  const bin = (k, v) => { if (v == null || Number.isNaN(v)) return null;
    if (k === "rs") return v <= 20 ? 0 : v <= 30 ? 1 : v < 70 ? 2 : v < 80 ? 3 : 4;
    return EDGES[k].filter(e => e <= v).length; };
  const colour = (k, v) => { const b = bin(k, v); return b == null ? null : (k === "rs" ? COL5 : COL7)[b]; };
  let metric = "d1", layout = "grid";
  const legend = () => {
    const k = metric, cs = k === "rs" ? COL5 : COL7;
    const lb = k === "rs" ? ["≤20", "20–30", "30–<70", "70–<80", "≥80"] : (() => { const e = EDGES[k]; return [`<${e[0]}`, `${e[0]}…${e[1]}`, `${e[1]}…${e[2]}`, `${e[2]}…${e[3]}`, `${e[3]}…${e[4]}`, `${e[4]}…${e[5]}`, `>${e[5]}`]; })();
    return cs.map((c, i) => `<span class="lgd"><i style="background:${c}"></i>${esc(lb[i])}</span>`).join("") + `<span class="lgd"><i class="t miss" style="width:14px;height:14px;margin:0"></i>— missing</span>`;
  };
  const order = [...D.groups].sort((a, b) => (a.MsiRank ?? 1e9) - (b.MsiRank ?? 1e9)).map(g => trim(g.Group));
  const tile = (t) => { const v = t[IDX[metric]], c = colour(metric, v), tip = `${t[0]}\nRS ${t[1] ?? "—"} · 1D ${t[2] ?? "—"}% · 1W ${t[3] ?? "—"}% · 1M ${t[4] ?? "—"}%`;
    const s = D.stocks.__m ? D.stocks.__m[t[0]] : null;
    return `<a class="t${c ? "" : " miss"}" ${c ? `style="background:${c}"` : ""} title="${esc(tip)}" ${s && s.has_chart ? `href="stock.html?s=${encodeURIComponent(t[0])}"` : ""}>${c ? "" : "—"}</a>`; };
  D.stocks.__m = {}; D.stocks.forEach(s => D.stocks.__m[s.Symbol] = s);
  function openList(g, b) {
    const rows = GP.fStocksOf(g).filter(s => band(s.MCap_Cr) === b);
    const d = GP.drawer(`<h2>${esc(g)} · ${b}</h2><p class="muted small">${rows.length} stocks${ISC.stockFilter.isActive() ? " (filtered)" : ""}</p><div id="dt"></div>`);
    ISC.table(d.querySelector("#dt"), {cols: [{key: "Symbol", label: "Symbol", render: GP.stockLink}, {key: "MCap_Cr", label: "MCap Cr", d: 0, render: v => GP.dash(v, 0)}, {key: "RS_Rating", label: "RS", render: v => GP.dash(v, 0)}, {key: "Price_Pct_Change", label: "1D %", d: 2, signed: true, render: v => GP.dash(v, 2)}], rows, sortKey: "MCap_Cr"});
  }
  // cell for group g / band b: matrix.json when unfiltered, else rebuilt from filtered stocks.json rows (same tile shape, RS-sorted)
  const cellOf = (g, b) => {
    if (!ISC.stockFilter.isActive()) return (MX.groups[g] || {})[b] || null;
    const rows = GP.fStocksOf(g).filter(s => s.MCap_Cr != null && band(s.MCap_Cr) === b).sort((x, y) => (y.RS_Rating ?? -1) - (x.RS_Rating ?? -1));
    return rows.length ? {n: rows.length, tiles: rows.slice(0, 12).map(s => [s.Symbol, s.RS_Rating, s.Price_Pct_Change, s.ret5 ?? null, s.ret21 ?? null])} : null;
  };
  function grid(h) {
    const act = ISC.stockFilter.isActive(), gl = act ? order.filter(g => MX.bands.some(b => cellOf(g, b))) : order;
    h.innerHTML = `<div class="tablewrap"><table class="mx"><thead><tr><th>Group (MSI rank order)</th>${MX.bands.map(b => `<th style="text-align:left">${b}</th>`).join("")}</tr></thead><tbody>
      ${gl.map(g => { return `<tr><td class="g">${ISC.groupLink(g, null, {destination: "stock"})}</td>${MX.bands.map(b => { const c = cellOf(g, b); if (!c) return `<td class="muted">—</td>`;
        return `<td><div class="tw">${c.tiles.slice(0, 12).map(tile).join("")}</div>${c.n > 12 ? `<a href="#" class="more small" data-g="${esc(g)}" data-b="${b}">+${c.n - 12} more</a>` : ""}</td>`; }).join("")}</tr>`; }).join("")}</tbody></table></div>`;
    if (act) h.insertAdjacentHTML("afterbegin", `<p class="muted small">${gl.length} groups with matching stocks; tile counts reflect the filter.</p>`);
    h.querySelectorAll(".more").forEach(a => a.onclick = ev => { ev.preventDefault(); openList(a.dataset.g, a.dataset.b); });
  }
  function pack(g) {
    const rows = GP.fStocksOf(g).filter(s => s.MCap_Cr != null).sort((a, b) => b.MCap_Cr - a.MCap_Cr).slice(0, 64);
    if (!rows.length) return ISC.stockFilter.isActive() ? "" : `<div class="lbl">${ISC.groupLink(g, null, {destination: "stock"})}</div><div class="muted small">No MCap data</div>`;
    const val = s => metric === "d1" ? s.Price_Pct_Change : metric === "rs" ? s.RS_Rating : metric === "w1" ? s.ret5 ?? null : s.ret21 ?? null;
    const items = rows.map(s => ({s, v: val(s), r: Math.max(3, Math.sqrt(s.MCap_Cr) / 9)}));
    const score = i => i.v == null ? -1e9 : (metric === "rs" ? i.v - 50 : i.v);
    items.sort((a, b) => score(b) - score(a));
    const placed = [];
    items.forEach(it => { let ang = 0, rad = 0; for (let n = 0; n < 4000; n++) { const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
        if (placed.every(p => (p.x - x) ** 2 + (p.y - y) ** 2 >= (p.r + it.r + 0.8) ** 2)) { it.x = x; it.y = y; placed.push(it); return; }
        ang += 0.5; rad += 0.12; } it.x = rad; it.y = 0; placed.push(it); });
    const ext = Math.max(10, ...placed.map(p => Math.hypot(p.x, p.y) + p.r));
    const sh = placed.map(p => { const c = colour(metric, p.v); return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r.toFixed(1)}" fill="${c || "#c9c5cf"}" ${c ? "" : 'stroke="#888" stroke-dasharray="2 1"'}><title>${esc(p.s.Symbol)} · MCap ${fmt(p.s.MCap_Cr, 0)} Cr · ${LBL[metric]} ${p.v == null ? "—" : fmt(p.v, metric === "rs" ? 0 : 2)}</title></circle>`; }).join("");
    return `<div class="lbl">${ISC.groupLink(g, null, {destination: "stock"})} <span class="muted">(${rows.length})</span></div><svg viewBox="${(-ext).toFixed(1)} ${(-ext).toFixed(1)} ${(2 * ext).toFixed(1)} ${(2 * ext).toFixed(1)}">${sh}</svg>`;
  }
  function clusters(h) {
    h.innerHTML = `<p class="muted small">Circle area ∝ MCap (top 64 by MCap per group; stocks without MCap omitted). Best metric at the centre, worst at the perimeter, missing values grey at the edge. 1W/1M = 5/21-session price return from stocks.json (missing only for stocks without price history).</p><div class="clus" id="cl"></div>`;
    const box = h.querySelector("#cl"); let i = 0;
    (function chunk() { const end = Math.min(order.length, i + 12); let s = ""; for (; i < end; i++) { const pk = pack(order[i]); if (pk) s += `<div class="card">${pk}</div>`; } box.insertAdjacentHTML("beforeend", s); if (i < order.length) setTimeout(chunk, 0); })();
  }
  el.innerHTML = `<div class="row" id="lm"><button class="pill on" data-l="grid">Grid</button><button class="pill" data-l="clusters">Clusters</button><span class="muted small">Metric:</span>
    ${Object.entries(LBL).map(([k, l]) => `<button class="pill${k === metric ? " on" : ""}" data-m="${k}">${l.replace(" %", "")}</button>`).join("")}</div>
    <div class="small" id="lg"></div><p class="muted small" id="cov"></p><div id="mh"></div>`;
  const c = MX.coverage;
  el.querySelector("#cov").textContent = `Coverage: missing values — 1D ${c.d1_missing}, 1W ${c.w1_missing}, 1M ${c.m1_missing}, RS ${c.rs_missing} (shown as hatched "—", never as 0). ${MX.skipped} stocks skipped (no MCap/group), ${MX.skipped_unmapped} with unmapped groups. Tiles: up to 12 per cell, sorted by RS; bands Large ≥₹20,000 Cr, Mid ≥5,000, Small ≥1,000, Micro below.`;
  const render = () => { el.querySelector("#lg").innerHTML = legend(); (layout === "grid" ? grid : clusters)(el.querySelector("#mh")); };
  el.querySelectorAll("#lm .pill").forEach(b => b.onclick = () => {
    if (b.dataset.l) layout = b.dataset.l; else metric = b.dataset.m;
    el.querySelectorAll("#lm .pill").forEach(x => x.classList.toggle("on", x.dataset.l ? x.dataset.l === layout : x.dataset.m === metric)); render(); });
  GP.refresh.matrix = render;
  render();
};
