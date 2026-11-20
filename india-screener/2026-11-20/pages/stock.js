(async () => {
  const {fmt, esc} = ISC;
  ISC.shell("stock.html");
  const sym = (new URLSearchParams(location.search).get("s") || "").trim();
  const app = document.getElementById("app");
  const [stocks, snap, groups] = await Promise.all(["stocks", "snapshot", "groups"].map(n => ISC.load(n).catch(() => null)));
  const s = (stocks || []).find(x => String(x.Symbol) === sym);
  if (!s) { app.innerHTML = `${ISC.banner(snap)}<div class="card">Symbol ${esc(sym || "(none)")} not found. <a href="scan.html">Back to scanner</a></div>`; return; }
  const grp = String(s.Industry_Group || "").trim();
  const n = v => v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
  const DN = "[DATA NEEDED]";
  // value cell: wraps, full text also in a title tooltip
  const row = (l, v, t) => `<div class="kv"><span class="k">${esc(l)}</span><span class="v" title="${esc(t ?? String(v).replace(/<[^>]+>/g, ""))}">${v}</span></div>`;
  const txt = v => n(v) || v === "" ? DN : esc(v);
  const pf = (ok) => ok === null ? DN : ok ? '<span class="up">PASS</span>' : '<span class="down">FAIL</span>';
  // MSI group rank from groups.json (normalised name match; MSI names may carry a trailing " IN")
  const gk = x => ISC.groupKey(String(x ?? "").replace(/\s+IN\s*$/i, ""));
  const g = (groups || []).find(x => gk(x.Group) === gk(grp));
  const bp = g && Array.isArray(g.bucket_path) && g.bucket_path.length ? g.bucket_path[g.bucket_path.length - 1] : null;
  const rank = g && !n(g.MsiRank) ? g.MsiRank : (!n(s.Industry_Group_Rank) ? s.Industry_Group_Rank : null);
  const rankHtml = rank === null ? DN : `${fmt(rank, 0)}${g && !n(g.Rank1w) ? ` <span class="muted">(1w ${fmt(g.Rank1w, 0)})</span>` : ""}${n(bp) ? "" : ` <span class="chip b${bp}">B${bp}</span>`}`;
  const stg = ISC.msiStage(s), STN = {1: "basing", 2: "advancing", 3: "topping", 4: "declining"};
  const stgHtml = stg === null ? DN : `Stage ${stg} <span class="muted small">(${STN[stg]}) · derived from MSI price-vs-DMA fields; simple rule, not the reference project's classifier</span>`;
  const above200 = (n(s.Price) || n(s.ma200)) ? null : s.Price > s.ma200;
  app.innerHTML = `${ISC.banner(snap)}
<style>
.sh1{font-size:20px;margin:4px 0 8px}.slay{display:grid;grid-template-columns:260px minmax(0,1fr);gap:12px;align-items:start}
@media (max-width:860px){.slay{grid-template-columns:minmax(0,1fr)}.slay .side{order:2}}
.side .card{margin:0 0 10px;padding:10px 12px}.side h2{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-variant:small-caps;margin:0 0 6px;color:var(--muted,#888)}
.kv{display:grid;grid-template-columns:minmax(90px,45%) minmax(0,1fr);gap:8px;padding:3px 0;border-bottom:1px solid var(--line);font-size:13px}
.kv:last-child{border-bottom:0}.kv .v{text-align:right;overflow-wrap:anywhere;white-space:normal;min-width:0}
.chip{display:inline-block;padding:0 6px;border-radius:8px;font-size:11px;background:#8883}.chip.b0{background:#22a72233}.chip.b1{background:#1e5bff33}.chip.b2{background:#f5a62333}.chip.b3{background:#e91e8c33}
</style>
<div class="sclose"><span class="sp"></span><button type="button" class="vx" id="sx" aria-label="Close chart" title="Close (Esc)">✕ Close</button></div>
<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h1 class="sh1" style="margin:0">${esc(s.Company_Name)} <span class="muted">(${esc(s.Symbol)} · ${esc(s.Exchange)})</span></h1><button id="stclose" title="Close (Esc)" style="font:inherit;font-size:15px;padding:6px 14px;cursor:pointer;background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:999px">Close ✕</button></div>
<div class="slay">
 <div class="side">
  <div class="card"><h2>Key stats</h2>${row("Price", fmt(s.Price, 2))}${row("Change %", `<span class="${ISC.cls(s.Price_Pct_Change)}">${fmt(s.Price_Pct_Change, 2)}</span>`)}${row("RS Rating", fmt(s.RS_Rating, 0))}${row("EPS Rating", fmt(s.EPS_Rating, 0))}${row("MSI Composite Rating", fmt(s.Composite_Strength, 0))}${row("A/D Rating", txt(s.AD_Rating))}${row("MCap (₹ Cr)", fmt(s.MCap_Cr, 0))}${row("From 52W high %", fmt(s.Pct_from_52W_High, 2))}</div>
  <div class="card"><h2>Base</h2>${row("Base type", txt(s.Base_Type_Daily))}${row("Base status", txt(s.Base_Status_Daily))}${row("% to pivot", n(s.Pct_to_Pivot_Daily) ? (n(s.Pct_from_Pivot_Daily) ? txt(s.Base_Status_Daily === "Forming" ? null : "n/a") : `<span title="Base complete: price already ${fmt(s.Pct_from_Pivot_Daily, 1)}% above the pivot">${fmt(s.Pct_from_Pivot_Daily, 1)}% above pivot${n(s.Days_from_Pivot) ? ` · ${fmt(s.Days_from_Pivot, 0)}d ago` : ""}</span>`) : fmt(s.Pct_to_Pivot_Daily, 2))}</div>
  <div class="card"><h2>Group</h2>${row("Industry group", grp ? ISC.groupLink(grp, null, {destination: "rrg"}) : DN, grp)}${grp ? row("Group views", `<a class="gl" href="${esc(ISC.groupRrgHref(grp))}">MSI group plot →</a> · <a class="gl" href="${esc(ISC.groupHref(grp))}">Stock RRG →</a>`) : ""}${row("MSI group rank", rankHtml)}</div>
  <div class="card"><h2>Trend &amp; EM</h2>${row("Trend Template", n(s.tt_n) ? DN : `${esc(s.tt_n)}/7 (+RS≥70)`)}${row("MSI Minervini TT list", s.Minervini_Stage ? esc(s.Minervini_Stage + " list") : "Not on 1M/5M list")}${row("Stage (from MSI DMA fields)", stgHtml, "Derived from MSI price-vs-DMA fields (Pct_Chg_vs_50DMA, Pct_Chg_vs_200DMA); simple rule, not the reference project's classifier")}${row("EM status", n(s.em) ? DN : (s.em || "–"))}</div>
  <div class="card"><h2>Tier 1 ${pf(n(s.tier1) ? null : s.tier1)}</h2>${row("RS ≥ 80", `${pf(n(s.RS_Rating) ? null : s.RS_Rating >= 80)} ${fmt(s.RS_Rating, 0)}`)}${row("EPS ≥ 70", `${pf(n(s.EPS_Rating) ? null : s.EPS_Rating >= 70)} ${fmt(s.EPS_Rating, 0)}`)}${row("Above 200-DMA", pf(above200))}</div>
 </div>
 <div class="card" style="margin:0;min-width:0">
  <div id="cbox"></div>
  <p class="muted small">EMA 10 black · EMA 20 blue · EMA 50 green · RS vs Nifty 500 orange · patterns: DV Technical Patterns (computed at build time). Display only; not a recommendation.</p>
 </div>
</div>`;

  const closeStock = () => { let same = false; try { same = document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1; } catch (e) {} if (same) history.back(); else location.href = "scan.html"; };
  document.getElementById("sx").onclick = closeStock;
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !/INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || "")) closeStock(); });
  const h = await ISC.stockChart(document.getElementById("cbox"), sym, {hasChart: s.has_chart !== false});
  if (h) window.__iscStock = h;
})();

(() => {
  const close = () => { let same = false; try { same = document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {} if (same && history.length > 1) history.back(); else location.href = "scan.html"; };
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("#stclose")) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || "")) close(); });
})();
