(async () => {
  const {fmt, esc} = ISC;
  ISC.shell("index.html");
  const [snap, groups, stocks, br] = await Promise.all(["snapshot", "groups", "stocks", "breadth"].map(ISC.load));
  const last = a => Array.isArray(a) ? a[a.length - 1] : a;
  const c = snap.counts || {};
  const tiles = [["Stocks", snap.n_stocks], ["Groups", snap.n_groups], ["Tier 1", c.tier1], ["Trend Template", c.tt],
    ["EM ADD", c.add], ["Blue Dot", c.blue_dot], ["Market-wide ADD %", snap.mkt_add_pct === null ? null : fmt(snap.mkt_add_pct, 1) + "%"]];
  const tile = ([l, v]) => `<div class="tile"><div class="muted small">${esc(l)}</div><div class="big">${typeof v === "number" ? v.toLocaleString("en-IN") : (v ?? "[DATA NEEDED]")}</div></div>`;
  const app = document.getElementById("app");
  app.innerHTML = `${ISC.banner(snap)}
    <style>.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}.tile{background:var(--tint);border-radius:10px;padding:10px 12px}.big{font-size:22px;font-weight:700}.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.two .card,.tile{min-width:0}@media(max-width:800px){.two{grid-template-columns:minmax(0,1fr)}}h2{font-size:16px;margin:4px 0 8px}</style>
    <div class="tiles">${tiles.map(tile).join("")}</div>
    <div id="fb"></div>
    <div class="card"><h2>Market breadth</h2><div id="br"></div></div>
    <div class="card"><h2>Top groups by EM breadth</h2><p class="muted small">ExitMantra-style breadth ranking — independent of MSI rank; check the MSI rank column.</p><div id="tg"></div>
    <h2 style="margin-top:14px">Strong + MSI-confirmed</h2><p class="muted small">Groups flagged preset_strong (strong EM breadth and confirmed by MSI rank).</p><div id="ts"></div></div>
    <div class="two"><div class="card"><h2>Top gainers (MCap ≥ ₹500 Cr)</h2><div id="gn"></div></div>
    <div class="card"><h2>Top losers (MCap ≥ ₹500 Cr)</h2><div id="ls"></div></div></div>
    <p class="muted small">Stand-in rebuild of ExitMantra-style ADD; research display, not advice.</p>`;
  const p = k => { const v = last(br[k]); return v === undefined ? null : v; };
  document.getElementById("br").innerHTML =
    `${fmt(p("pct_above_50"), 1)}% above 50-DMA · ${fmt(p("pct_above_200"), 1)}% above 200-DMA · New highs ${fmt(p("new_hi"), 0)} · New lows ${fmt(p("new_lo"), 0)}
     <span class="muted small"> (${esc(last(br.dates))})</span>`;
  const gcols = [
    {key: "Group", label: "Group", render: (v) => ISC.groupLink(v)},
    {key: "MsiRank", label: "MSI Rank", d: 0, render: v => v == null ? "—" : `<i style="display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;background:${v <= 20 ? "#6E2A8F" : v <= 40 ? "#9b59b6" : v <= 60 ? "#cdb4db" : "#e6dff0"}"></i>${v}`}, {key: "RankChg", label: "Rank Chg", d: 0, signed: true},
    {key: "EMADD", label: "EM ADD", d: 0}, {key: "EMBreadth", label: "EM Breadth %"}, {key: "EMvsMkt", label: "EM vs Mkt", signed: true}];
  ISC.table(document.getElementById("tg"), {cols: gcols, rows: groups.filter(g => g.EMRank !== null && g.EMRank !== undefined).sort((a, b) => a.EMRank - b.EMRank).slice(0, 10), sortKey: null});
  const strong = groups.filter(g => g.preset_strong).sort((a, b) => (a.MsiRank ?? 999) - (b.MsiRank ?? 999)).slice(0, 10);
  if (strong.length) ISC.table(document.getElementById("ts"), {cols: gcols, rows: strong, sortKey: null}); else document.getElementById("ts").innerHTML = '<span class="muted small">None today.</span>';
  const mv = stocks.filter(s => (s.MCap_Cr ?? 0) >= 500 && typeof s.Price_Pct_Change === "number");
  const scols = [{key: "Symbol", label: "Symbol", render: (v, r) => r.has_chart ? `<a href="stock.html?s=${encodeURIComponent(v)}">${esc(v)}</a>` : esc(v)},
    {key: "Company_Name", label: "Company"}, {key: "Price", label: "Price", d: 2}, {key: "Price_Pct_Change", label: "Chg %", d: 2, signed: true}, {key: "RS_Rating", label: "RS", d: 0}, {key: "Composite_Strength", label: "Comp", d: 0}];
  const sorted = [...mv].sort((a, b) => b.Price_Pct_Change - a.Price_Pct_Change);
  const tg = ISC.table(document.getElementById("gn"), {cols: scols, rows: [], sortKey: null}), tl = ISC.table(document.getElementById("ls"), {cols: scols, rows: [], sortKey: null});
  const drawMovers = () => { const f = ISC.stockFilter.filter(sorted); tg.setRows(f.slice(0, 10)); tl.setRows(f.slice(-10).reverse()); };
  ISC.filterBar(document.getElementById("fb"), {rows: stocks, onChange: drawMovers, note: "Applies to the gainers/losers tables only."});
  drawMovers();
})();
