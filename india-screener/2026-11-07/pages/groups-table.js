// a22: reference-style Groups "Table" tab + group detail modal (Overview | Charts).
// Layout/columns mirror xang1234/stock-screener StaticGroupsPage + StaticGroupDetailModal; colours stay MarketSmith purple.
window.GP = window.GP || {tabs: {}};
(() => {
  const esc = s => ISC.esc(s);
  const num = v => typeof v === "number" && Number.isFinite(v);
  const gapTip = n => `[DATA NEEDED] only ${n} sessions ingested`;
  // groupRsTone bands (reference groupRsVisualEncoding.js)
  const rsTone = v => { if (!num(v)) return ""; const d = Number(v.toFixed(1)); return d >= 80 ? "up-strong" : d >= 70 ? "up-soft" : d <= 20 ? "down-strong" : d <= 30 ? "down-soft" : ""; };
  const rsCell = (v, n) => num(v) ? `<td class="num rs ${rsTone(v)}" data-rs-tone="${rsTone(v) || "neutral"}">${v.toFixed(1)}</td>` : `<td class="num muted" title="${esc(gapTip(n))}">—</td>`;
  GP.rankChg = (v, n) => {
    if (!num(v)) return `<span class="rkc flat" title="${esc(gapTip(n))}">—</span>`;
    if (v > 0) return `<span class="rkc up" title="Rank improved by ${v}">↗ +${v}</span>`;
    if (v < 0) return `<span class="rkc dn" title="Rank fell by ${-v}">↘ −${-v}</span>`;
    return `<span class="rkc flat">0</span>`;
  };
  const CSS = `.gt-h1{font-size:24px;font-weight:700;letter-spacing:-.5px;margin:10px 0 2px}.gt-date{font-size:12px;color:var(--muted);margin:0 0 12px}
.gt-card{border:1px solid var(--line);border-radius:6px;background:var(--card);padding:12px}.gt-card h3{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:0 0 4px}
.gt-mv{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 16px}@media (max-width:800px){.gt-mv{grid-template-columns:1fr}}
.gt table{width:100%;border-collapse:collapse;font-size:13px}.gt th,.gt td{padding:6px 10px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}
.gt th{font-weight:600;color:var(--muted);font-size:12px;cursor:pointer;user-select:none}.gt th.num,.gt td.num{text-align:right}.gt td.num{font-family:ui-monospace,monospace}
.gt tbody tr.rw{cursor:pointer}.gt tbody tr.rw:hover{background:var(--tint)}.gt td.rk{font-family:ui-monospace,monospace;font-weight:600}
.gt td.rs.up-strong{background:rgba(46,125,50,.42)}.gt td.rs.up-soft{background:rgba(46,125,50,.2)}.gt td.rs.down-soft{background:rgba(198,40,40,.2)}.gt td.rs.down-strong{background:rgba(198,40,40,.34)}
.gt .tk b{display:block;font-size:12px}.gt .tk span{display:block;font-size:11px;color:var(--muted);max-width:180px;overflow:hidden;text-overflow:ellipsis}
.gt .scr{overflow-x:auto}.gt th.xc,.gt td.xc{font-size:11px;padding:6px 6px;color:var(--muted)}.gt td.xc{color:var(--text)}
.gt .gt-ctl{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 4px}.gt .gt-ctl label{font-size:12px;color:var(--muted)}`;
  const css = () => { if (document.getElementById("gt-css")) return; const s = document.createElement("style"); s.id = "gt-css"; s.textContent = CSS; document.head.appendChild(s); };

  const BASE = [["MsiRank", "Rank", "num", "MSI industry-group rank (1 = best)"], ["Group", "Group", "", ""], ["AvgRS", "Avg RS", "num", "Mean MSI RS Rating of the group's stocks"],
    ["AvgRS_1d", "1D RS", "num", "Avg RS 1 session ago"], ["AvgRS_1w", "1W RS", "num", "Avg RS 5 sessions ago"], ["AvgRS_1m", "1M RS", "num", "Avg RS 21 sessions ago"],
    ["AvgRS_3m", "3M RS", "num", "Avg RS 63 sessions ago"], ["AvgRS_6m", "6M RS", "num", "Avg RS 126 sessions ago"], ["n_msi", "Stocks", "num", "MSI stock count"],
    ["RankChg_1w", "1W", "num", "Rank change over 5 sessions (+ = improved)"], ["RankChg_1m", "1M", "num", "Rank change over 21 sessions"], ["RankChg_3m", "3M", "num", "Rank change over 63 sessions"],
    ["RankChg_6m", "6M", "num", "Rank change over 126 sessions"], ["TopRS", "Top Stock", "", "Highest MSI RS Rating in the group (tie: higher Composite)"]];
  const MORE = [["AvgComposite", "MSI Comp avg", "num xc", "Mean MSI Composite Rating"], ["EMBreadth", "EM breadth %", "num xc", "ADD stocks / scored stocks (stand-in rebuild)"], ["EMADD", "ADD", "num xc", "ADD count"],
    ["_t1", "Tier 1", "num xc", "Stocks passing Tier 1 (RS≥80, EPS≥70, above 200-DMA)"], ["Category_Label", "Category", "xc", "Bucket category (own column, not blended)"]];

  GP.tabs.table = el => {
    css();
    const D = GP.D, trim = GP.trim, G = D.groups, n = (G.find(g => num(g.n_sessions)) || {}).n_sessions ?? 0;
    const t1 = {}; D.stocks.forEach(s => { if (s.tier1) { const k = trim(s.Industry_Group); t1[k] = (t1[k] || 0) + 1; } });
    G.forEach(g => { g._t1 = t1[trim(g.Group)] || 0; });
    let key = "MsiRank", dir = 1, more = false; try { more = localStorage.getItem("isc-gt-more") === "1"; } catch (e) {}
    const mv = G.filter(g => num(g.RankChg_1w));
    const gain = mv.slice().sort((a, b) => b.RankChg_1w - a.RankChg_1w).slice(0, 5), lose = mv.slice().sort((a, b) => a.RankChg_1w - b.RankChg_1w).slice(0, 5);
    const mvCard = (t, rows) => `<div class="gt-card"><h3>${t}</h3><table><thead><tr><th>Group</th><th class="num">Rank</th><th class="num">Change</th></tr></thead><tbody>${rows.map(g =>
      `<tr class="rw" data-g="${esc(trim(g.Group))}"><td>${esc(g.Group)}</td><td class="num">${num(g.MsiRank) ? g.MsiRank : "—"}</td><td class="num">${GP.rankChg(g.RankChg_1w, n)}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">${esc(gapTip(n))}</td></tr>`}</tbody></table></div>`;
    el.innerHTML = `<div class="gt"><div class="gt-mv">${mvCard("Top Gainers (1W)", gain)}${mvCard("Top Losers (1W)", lose)}</div>
      <div class="gt-card"><div class="gt-ctl"><h3>Current Rankings</h3><label><input type="checkbox" id="gtmore"${more ? " checked" : ""}> More columns (MSI extras)</label></div><div class="scr"><table><thead></thead><tbody></tbody></table></div>
      <p class="muted small">Avg RS = mean MSI RS Rating of the group's stocks on that session. Lookbacks in sessions: 1D=1, 1W=5, 1M=21, 3M=63, 6M=126; "—" = ${esc(gapTip(n))}. Rank change = rank then − rank now (+ = improved). Default sort: MSI rank.</p></div></div>`;
    const thead = el.querySelector(".scr thead"), tbody = el.querySelector(".scr tbody");
    function draw() {
      const cols = more ? BASE.concat(MORE) : BASE;
      thead.innerHTML = `<tr>${cols.map(([k, l, c, t]) => `<th class="${c}" data-k="${k}" title="${esc(t)}" aria-sort="${k === key ? (dir > 0 ? "ascending" : "descending") : "none"}">${esc(l)}${k === key ? (dir > 0 ? " ↑" : " ↓") : ""}</th>`).join("")}</tr>`;
      const rows = G.slice().sort((a, b) => { const x = a[key], y = b[key]; if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : x < y ? -1 : 0) * dir; });
      tbody.innerHTML = rows.map(g => `<tr class="rw" tabindex="0" data-g="${esc(trim(g.Group))}">${cols.map(([k, , c]) => {
        if (k === "MsiRank") return `<td class="num rk">${num(g.MsiRank) ? g.MsiRank : "—"}</td>`;
        if (k === "Group") return `<td>${esc(g.Group)}</td>`;
        if (k.startsWith("AvgRS")) return rsCell(g[k], n);
        if (k.startsWith("RankChg_")) return `<td class="num">${GP.rankChg(g[k], n)}</td>`;
        if (k === "TopRS") return g.TopSymbol ? `<td class="tk"><b>${esc(g.TopSymbol)}</b><span title="${esc(g.TopName)}">${esc(g.TopName)}</span></td>` : `<td class="muted">—</td>`;
        if (k === "Category_Label") return `<td class="xc">${g[k] ? esc(g[k]) : "—"}</td>`;
        const v = g[k]; return `<td class="${c}">${num(v) ? ISC.fmt(v, k === "EMBreadth" || k === "AvgComposite" ? 1 : 0) : "—"}</td>`;
      }).join("")}</tr>`).join("");
    }
    thead.addEventListener("click", e => { const th = e.target.closest("th"); if (!th) return; const k = th.dataset.k; dir = k === key ? -dir : 1; key = k; draw(); });
    el.querySelector("#gtmore").onchange = e => { more = e.target.checked; try { localStorage.setItem("isc-gt-more", more ? "1" : "0"); } catch (x) {} draw(); };
    const open = tr => tr && tr.dataset.g && GP.openGroup(tr.dataset.g);
    el.addEventListener("click", e => open(e.target.closest("tr.rw")));
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { const tr = e.target.closest("tr.rw"); if (tr) { e.preventDefault(); open(tr); } } });
    draw();
  };

  // ---------- group detail modal ----------
  let M = null;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function rankSvg(h, nG) {
    const pts = h.dates.map((d, i) => [d, h.rank[i]]).filter(p => num(p[1]));
    if (pts.length < 2) return `<p class="muted small">[DATA NEEDED] rank history</p>`;
    const W = 900, H = 220, L = 40, R = 20, T = 8, B = 50, top = Math.max(nG, 2);
    const y = v => T + Math.log(Math.max(1, v)) / Math.log(top) * (H - T - B), x = i => L + i / (pts.length - 1) * (W - L - R);
    const ticks = [1, 5, 10, 20, 50, 100, top].filter((v, i, a) => v <= top && a.indexOf(v) === i);
    const step = Math.max(1, Math.floor(pts.length / 6)), lbl = d => { const [yy, mm, dd] = d.split("-"); return `${dd} ${MONTHS[+mm - 1]} '${yy.slice(2)}`; };
    const ln = (v, c) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${c}" stroke-dasharray="3 3" opacity=".5"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:220px;display:block" role="img" aria-label="Rank history">
      ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="3 3" opacity=".6"/><text x="${L - 4}" y="${y(v) + 3}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`).join("")}
      ${ln(20, "#2e7d32")}${top > 40 ? ln(top - 20, "#c62828") : ""}
      ${pts.map((p, i) => i % step ? "" : `<text x="${x(i)}" y="${H - B + 14}" font-size="11" fill="var(--muted)" text-anchor="end" transform="rotate(-45 ${x(i)} ${H - B + 14})">${esc(lbl(p[0]))}</text>`).join("")}
      <polyline fill="none" stroke="var(--primary)" stroke-width="2" points="${pts.map((p, i) => `${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ")}"/>
      ${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p[1]).toFixed(1)}" r="5" fill="transparent"><title>${esc(p[0])} · Rank: ${p[1]}</title></circle>`).join("")}</svg>`;
  }
  function close() {
    if (!M) return; M.charts.forEach(c => { try { c.destroy(); } catch (e) {} }); M.io && M.io.disconnect();
    document.removeEventListener("keydown", M.key); M.root.remove(); M = null; GP._gmG = null;
    try { if (/^#g=/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }
  GP.closeGroup = close;
  GP.openGroup = g => {
    close(); css(); GP._gmG = g;
    const D = GP.D, trim = GP.trim, dash = GP.dash, gr = D.groups.find(x => trim(x.Group) === g) || {}, h = D.group_hist[g] || D.group_hist[gr.Group] || null;
    const n = gr.n_sessions ?? (h ? h.dates.length : 0), all = GP.stocksOf(g), rows = ISC.stockFilter.filter(all);
    const root = document.createElement("div"); root.className = "gm-ovl";
    root.innerHTML = `<div class="gm-dlg" role="dialog" aria-modal="true" aria-labelledby="gmt"><div class="gm-title"><h2 id="gmt">${esc(g)}</h2><button type="button" class="vx" id="gmx" aria-label="Close group detail" title="Close (Esc)">✕</button></div>
      <div class="utabs sm" role="tablist"><button data-t="ov" class="on" role="tab">Overview</button><button data-t="ch" role="tab">Charts</button></div><div id="gmb"></div></div>`;
    document.body.appendChild(root);
    M = {root, charts: [], io: null, key: e => { if (e.key === "Escape") close(); }};
    document.addEventListener("keydown", M.key);
    root.addEventListener("click", e => { if (e.target === root) close(); });
    root.querySelector("#gmx").onclick = close;
    const body = root.querySelector("#gmb");
    const overview = () => {
      const hr = h ? h.dates.map((d, i) => [d, h.rank[i]]).reverse().slice(0, 20) : [];
      body.innerHTML = `<div class="gm-stats"><div><div class="big">${num(gr.MsiRank) ? gr.MsiRank : "—"}</div><div class="cap">Current Rank</div></div><div><div class="big">${num(gr.AvgRS) ? gr.AvgRS.toFixed(1) : "—"}</div><div class="cap">Avg RS Rating</div></div>
        <div><div class="big">${num(gr.n_msi) ? gr.n_msi : "—"}</div><div class="cap">Stocks</div></div><div><div style="font-size:16px;padding-top:10px">${esc(gr.TopSymbol || "—")}</div><div class="cap">Top Stock (RS: ${num(gr.TopRS) ? gr.TopRS.toFixed(0) : "—"})</div></div></div>
        <h3 style="font-size:14px;margin:0 0 4px">Rank History</h3>${h ? rankSvg(h, D.groups.length) : `<p class="muted small">[DATA NEEDED] rank history</p>`}
        <h3 style="font-size:14px;margin:12px 0 6px">Rank Changes</h3><div class="gm-chg">${[["1 Week", "RankChg_1w"], ["1 Month", "RankChg_1m"], ["3 Months", "RankChg_3m"], ["6 Months", "RankChg_6m"]].map(([l, k]) => `<div>${GP.rankChg(gr[k], n)}<div class="cap muted small">${l}</div></div>`).join("")}</div>
        <p class="row"><button class="pill" id="gmsr">Stock RRG →</button> <a class="gl" href="${esc(ISC.groupRrgHref(g))}" id="gmrrg">Open MSI group RRG</a></p>
        <b class="small">Constituent Stocks (${ISC.stockFilter.isActive() ? `${rows.length} of ${all.length}, filters on` : rows.length})</b><div id="gmst"></div>
        ${hr.length ? `<b class="small">Rank History</b><div class="tablewrap" style="max-height:180px;overflow:auto"><table><thead><tr><th>Date</th><th class="num">Rank</th></tr></thead><tbody>${hr.map(([d, r]) => `<tr><td>${esc(d)}</td><td class="num">${num(r) ? r : "—"}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
      body.querySelector("#gmsr").onclick = () => { close(); GP.stockRrgOpen(g); };
      body.querySelector("#gmrrg").onclick = e => { e.preventDefault(); close(); location.hash = "tab=rrg&g=" + encodeURIComponent(g); };
      ISC.table(body.querySelector("#gmst"), {cols: [{key: "Symbol", label: "Symbol", render: (v, r) => `${GP.stockLink(v, r)} <span class="muted small">${esc(r.Company_Name)}</span>`},
        {key: "Price", label: "Price", d: 2, render: v => dash(v, 2)}, {key: "Price_Pct_Change", label: "Chg %", d: 2, signed: true, render: v => dash(v, 2)},
        {key: "RS_Rating", label: "RS", d: 0, render: v => dash(v, 0)}, {key: "rs_20", label: "RS 1M ago", d: 0, render: v => dash(v, 0)}, {key: "rs_60", label: "RS 3M ago", d: 0, render: v => dash(v, 0)},
        {key: "EPS_Rating", label: "EPS", d: 0, render: v => dash(v, 0)}, {key: "Composite_Strength", label: "Comp", d: 0, render: v => dash(v, 0)},
        {key: "EPS_Pct_Chg_Last_Qtr", label: "EPS Q %", d: 0, signed: true, render: v => dash(v, 0)}, {key: "Sales_Pct_Chg_Last_Qtr", label: "Sls Q %", d: 0, signed: true, render: v => dash(v, 0)},
        {key: "_stg", label: "Stg", d: 0, render: (v, r) => { const x = ISC.msiStage(r); return x === null ? "[DATA NEEDED]" : "S" + x; }}], rows, sortKey: "RS_Rating", filters: false, limit: 300});
    };
    const charts = () => {
      const syms = rows.filter(s => s.has_chart).sort((a, b) => (b.RS_Rating ?? -1) - (a.RS_Rating ?? -1)).slice(0, 8);
      if (!syms.length) { body.innerHTML = `<p class="muted">No charted stocks in this group.</p>`; return; }
      body.innerHTML = `<p class="muted small">Top ${syms.length} charted stocks by RS Rating${rows.length > syms.length ? ` (of ${rows.length})` : ""}. Click a symbol for the full chart.</p><div class="gm-grid">${syms.map(s => `<div class="gm-card" data-s="${esc(s.Symbol)}"><div class="hd"><b><a href="stock.html?s=${encodeURIComponent(s.Symbol)}">${esc(s.Symbol)}</a></b><span class="muted">${esc(s.Company_Name)}</span>
        <span class="gm-badge">Grp Rnk ${num(gr.MsiRank) ? gr.MsiRank : "—"}</span><span class="gm-badge">RS ${num(s.RS_Rating) ? s.RS_Rating : "—"}</span><span style="margin-left:auto">₹${ISC.fmt(s.Price, 2)}</span></div><div class="cb"></div></div>`).join("")}</div>`;
      if (typeof LightweightCharts === "undefined") { body.insertAdjacentHTML("beforeend", `<p class="muted">Chart library not loaded.</p>`); return; }
      const draw = async card => { const box = card.querySelector(".cb"); const hh = await ISC.stockChart(box, card.dataset.s, {height: "260px", abortIfDetached: true, noChartText: "No chart"}); if (!M || !box.isConnected) { hh && hh.destroy(); return; } if (hh) M.charts.push(hh); };
      M.io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { M.io.unobserve(e.target); draw(e.target); } }), {root, rootMargin: "200px"});
      body.querySelectorAll(".gm-card").forEach(c => M.io.observe(c));
    };
    const tabs = root.querySelectorAll(".utabs button");
    tabs.forEach(b => b.onclick = () => { tabs.forEach(x => x.classList.toggle("on", x === b)); M.charts.forEach(c => { try { c.destroy(); } catch (e) {} }); M.charts = []; M.io && M.io.disconnect(); (b.dataset.t === "ch" ? charts : overview)(); });
    overview();
    GP._drawerFn = null;
    M.refresh = () => GP.openGroup(g);
  };
})();
