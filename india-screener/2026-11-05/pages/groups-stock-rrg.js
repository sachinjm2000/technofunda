window.GP = window.GP || {tabs: {}};
GP.tabs.stockrrg = el => {
  const {esc, fmt} = ISC, D = GP.D, trim = GP.trim;
  const Q = {Leading: "#297F02", Improving: "#2b7bb9", Weakening: "#d98e04", Lagging: "#D52536"};
  const FR = {daily: "Daily", weekly: "Weekly", monthly: "Monthly"};
  const BAND = [["S0", "Top 20% (RS ≥ 80)", 6.5], ["S1", "20–40% (RS 60–79)", 5], ["S2", "40–60% (RS 40–59)", 4], ["S3", "60–100% (RS < 40)", 3]];
  const bySym = {}; D.stocks.forEach(s => bySym[trim(s.Symbol)] = s);
  const idxP = ISC.loadLatest("stock_rrg/index");
  const cache = {};
  let frame = "weekly", smode = "rs", group = "", active = new Set(Object.keys(Q)), idx = null, tok = 0, hl = "";
  el.innerHTML = `<div id="ch"></div><div class="row small" id="lg"></div><div id="cnt" class="small"></div><div id="lists"></div>`;
  let visN = 0;
  const ch = ISC.rrgChart(el.querySelector("#ch"), {title: `Relative Rotation Graph — Stocks · ${D.snapshot.asof}`, tails: false,
    strip: g => bySym[g.key]?.has_chart ? `<a class="rc-go" href="stock.html?s=${encodeURIComponent(g.key)}">Stock page →</a>` : `<span class="muted small">no chart</span>`,
    onSelect: k => { if (bySym[k]?.has_chart) location.href = `stock.html?s=${encodeURIComponent(k)}`; },
    onVisible: vis => { visN = vis.length; const n = el.querySelector("#dots"); if (n) n.textContent = visN; }});
  ch.extra.innerHTML = `<span class="row sr-ctl" style="margin:0"><select id="sg" aria-label="Group"></select><span id="sm" style="white-space:nowrap"></span><span id="fm" style="white-space:nowrap"></span><input id="hs" list="hsl" placeholder="Highlight stock…" aria-label="Highlight stock" autocomplete="off" size="16"><datalist id="hsl"></datalist><button class="pill" id="hc" type="button">clear</button></span>`;
  const sg = el.querySelector("#sg");
  const dash = v => (v === null || v === undefined) ? "—" : fmt(v, 0);
  const bl = b => b === null || b === undefined ? "—" : "S" + b;
  const defGroup = () => { const r = D.groups.filter(g => g.MsiRank != null).sort((a, b) => a.MsiRank - b.MsiRank)[0]; return r ? trim(r.Group) : Object.keys(idx)[0]; };
  async function fetchGroup(g) {
    if (!cache[g]) cache[g] = ISC.loadLatest("stock_rrg/" + idx[g]);
    return cache[g];
  }
  function expand(data) {   // compact [dateIdx,x,y] points -> {d,x,y}; name defaults to the symbol
    if (data._x) return; data._x = 1;
    Object.values(data.frames).forEach(fr => Object.entries(fr.stocks).forEach(([sym, s]) => {
      s.points = s.points.map(q => Array.isArray(q) ? {d: fr.dates[q[0]], x: q[1], y: q[2]} : q);
      if (s.name == null) s.name = sym;
      const bd = v => v == null ? null : v >= 80 ? 0 : v >= 60 ? 1 : v >= 40 ? 2 : 3;   // mirrors isc/stock_rrg.py derive_flags
      s.band = bd(s.rs); s.band_then = bd(s.rs_then); s.new_s0 = s.band === 0 && s.band_then !== null && s.band_then !== 0;
    }));
  }
  async function setGroup(g) {
    if (!idx) idx = await idxP;
    const gk = ISC.groupKey(g), hit = Object.keys(idx).find(k => ISC.groupKey(k) === gk);   // normalised match: case / spaces / encoding
    g = hit || defGroup();
    group = g; GP.stockRrgGroup = g; hl = "";
    sg.innerHTML = Object.keys(idx).sort().map(x => `<option${x === g ? " selected" : ""}>${esc(x)}</option>`).join("");
    const my = ++tok, data = await fetchGroup(g); if (my !== tok) return;
    expand(data); lastData = data;
    draw(data, true);
  }
  let lastData = null;
  GP.refresh.stockrrg = () => { if (lastData) draw(lastData); };
  GP.stockRrgOpen = g => { GP.show("stockrrg"); setGroup(trim(g)); };
  function drawGh(data, newGroup) {
    const gh = data.gh || {}, W = data.frames.weekly.stocks;
    const itemsAll = Object.entries(gh).map(([sym, s]) => ({sym, s, l: s.tail[s.tail.length - 1], name: W[sym]?.name || bySym[sym]?.Company_Name || sym, band: W[sym]?.band ?? null}));
    const SF = ISC.stockFilter, sfOn = SF.isActive();
    const items = sfOn ? itemsAll.filter(i => SF.test(bySym[i.sym])) : itemsAll;
    el.querySelector("#fm").innerHTML = `<span class="muted small" id="ghn">GitHub method — reference project's RS-Ratio/RS-Momentum; provisional: MSI history is ~${D.rrg_gh?.weeks ?? "?"} weeks (reference z-window 26)</span>`;
    el.querySelector("#sub")?.remove();
    const rsOrder = itemsAll.map(i => i.s.rs).filter(v => v != null).sort((a, b) => b - a);
    const rkOf = v => v == null ? null : rsOrder.findIndex(x => x <= v) + 1;
    el.querySelector("#hsl").innerHTML = items.map(i => `<option value="${esc(i.sym)}">${esc(i.name)}</option>`).join("");
    if (hl && !items.some(i => i.sym === hl)) hl = "";
    el.querySelector("#hs").value = hl;
    const groups = items.map(i => ({key: i.sym, label: i.sym, size: 1, r: BAND[i.band]?.[2] ?? 3, rank: rkOf(i.s.rs), rs: Math.round(i.s.rs), points: i.s.tail, quadrant: i.s.quadrant, link: !!bySym[i.sym]?.has_chart,
      extra: [i.name, `RS now: ${dash(i.s.rs)}`]}));
    const upd = {groups, subtitle: "GitHub method (stock RS): RS-Ratio X = 100 + 5·z of the 26-week z-score of EMA(5) of the weekly RS Rating; RS-Momentum Y = 100 + 5·z (13-week window) of EMA(3) of the 4-week change in RS-Ratio; clamped 80–120; weekly, 8-week tail; provisional on short history. Rank = RS Rating order in the group.", highlight: hl};
    if (newGroup) upd.tails = items.length <= 25;
    ch.update(upd);
    el.querySelector("#hs").onchange = e => { const v = e.target.value.trim(); hl = items.some(i => i.sym === v) ? v : (items.find(i => i.sym.toLowerCase() === v.toLowerCase())?.sym || ""); draw(data); };
    el.querySelector("#hc").onclick = () => { hl = ""; draw(data); };
    el.querySelector("#lg").innerHTML = BAND.map(([k, l, r]) => `<span class="lgd"><svg width="16" height="16"><circle cx="8" cy="8" r="${r}" fill="var(--muted)"/></svg>${k} ${l}</span>`).join("") + `<span class="muted">Dot size = RS band; hover for details, click to pin.</span>`;
    el.querySelector("#cnt").innerHTML = `<b id="dots">${visN}</b> dots shown of ${items.length} stocks with ≥12 weeks of RS history in <b>${esc(group)}</b> <a href="#" class="small gl-list" data-g="${esc(group)}">stocks list</a>${sfOn ? ` <span class="muted">(filters match ${items.length} of ${itemsAll.length})</span>` : ""}`;
    const rows = items.map(i => ({Symbol: i.sym, Company: i.name, Company_Name: i.name, rs: i.s.rs, quad: i.s.quadrant, has_chart: bySym[i.sym]?.has_chart}));
    const cols = [{key: "Symbol", label: "Symbol", render: GP.stockLink}, {key: "Company", label: "Company", render: v => esc(v)}, {key: "rs", label: "RS now", d: 0, render: dash}];
    const secs = ["Leading", "Improving", "Weakening", "Lagging"];
    el.querySelector("#lists").innerHTML = secs.map((n, i) => `<h2 class="lh" data-n="${n}">${n} (<span class="lc">${rows.filter(r => r.quad === n).length}</span>)</h2><div id="ls${i}"></div>`).join("");
    secs.forEach((n, i) => ISC.table(el.querySelector("#ls" + i), {cols, rows: rows.filter(r => r.quad === n), sortKey: "rs", sortDir: -1}));
  }
  function draw(data, newGroup) {
    el.querySelector("#sm").innerHTML = [["rs", "RS change"], ["gh", "GitHub method (RS)"]].map(([k, l]) => `<button class="pill${k === smode ? " on" : ""}" data-m="${k}">${l}</button>`).join(" ") + " ";
    el.querySelectorAll("#sm .pill").forEach(b => b.onclick = () => { smode = b.dataset.m; hl = ""; draw(data, true); });
    if (smode === "gh") return drawGh(data, newGroup);
    const fr = data.frames[frame], st = fr.stocks, p = fr.params;
    const SF = ISC.stockFilter, sfOn = SF.isActive();
    const itemsAll = Object.entries(st).map(([sym, s]) => ({sym, s, l: s.points[s.points.length - 1]}));
    const items = sfOn ? itemsAll.filter(i => SF.test(bySym[i.sym])) : itemsAll;   // joined to stocks.json by symbol; non-matching removed
    el.querySelector("#fm").innerHTML = Object.entries(FR).map(([k, l]) => `<button class="pill${k === frame ? " on" : ""}" data-f="${k}">${l}</button>`).join(" ") +
      (frame === "monthly" ? ` <span class="muted small" id="lim">limited history (≤ ${Math.max(0, ...items.map(i => i.s.points.length))} points)</span>` : "");
    el.querySelector("#sub")?.remove();
    const rsOrder = itemsAll.map(i => i.s.rs).filter(v => v != null).sort((a, b) => b - a);
    const rkOf = v => v == null ? null : rsOrder.findIndex(x => x <= v) + 1;
    el.querySelector("#hsl").innerHTML = items.map(i => `<option value="${esc(i.sym)}">${esc(i.s.name)}</option>`).join("");
    if (hl && !items.some(i => i.sym === hl)) hl = "";
    el.querySelector("#hs").value = hl;
    const sub = `${FR[frame]}: X = 100 + (RS̄ − 60)/3 with RS̄ = ${p.smooth}-session mean RS Rating; Y = 100 + clip((RS̄ now − RS̄ ${p.lag} session${p.lag > 1 ? "s" : ""} ago)/${p.k}, ±20); tail = last ${p.tail_points} points, step ${p.step}. Leading = RS̄ ≥ 60 and rising; Weakening = RS̄ ≥ 60 and falling; Improving = RS̄ < 60 and rising; Lagging = RS̄ < 60 and falling. Display filter, unvalidated. Rank = RS Rating order in the group.`;
    const groups = items.map(i => { const s = i.s, t = s.points;
      return {key: i.sym, label: i.sym, size: 1, r: BAND[s.band]?.[2] ?? 3, rank: rkOf(s.rs), rs: s.rs == null ? null : Math.round(s.rs), points: t, quadrant: s.quad, link: !!bySym[i.sym]?.has_chart,
        extra: [s.name, `RS ${p.lag}s ago: ${dash(s.rs_then)} (${bl(s.band_then)}) · now ${bl(s.band)}`].concat(s.new_s0 ? ["Newly entered top 20%"] : [])}; });
    const upd = {groups, subtitle: sub, highlight: hl};
    if (newGroup) upd.tails = items.length <= 25;
    ch.update(upd);
    el.querySelector("#hs").onchange = e => { const v = e.target.value.trim(); hl = items.some(i => i.sym === v) ? v : (items.find(i => i.sym.toLowerCase() === v.toLowerCase())?.sym || ""); draw(data); };
    el.querySelector("#hc").onclick = () => { hl = ""; draw(data); };
    el.querySelector("#lg").innerHTML = BAND.map(([k, l, r]) => `<span class="lgd"><svg width="16" height="16"><circle cx="8" cy="8" r="${r}" fill="var(--muted)"/></svg>${k} ${l}</span>`).join("") +
      `<span class="lgd"><svg width="16" height="16"><circle cx="8" cy="8" r="5" fill="var(--muted)" stroke="#000" stroke-width="1.5"/></svg>newly entered top 20%</span><span class="muted">Dot size = RS band; hover for details, click to pin (strip shows the stock page link), double-click opens the chart.</span>`;
    el.querySelector("#cnt").innerHTML = `<b id="dots">${visN}</b> dots shown of ${items.length} stocks with RS history in <b>${esc(group)}</b> <a href="#" class="small gl-list" data-g="${esc(group)}">stocks list</a>${sfOn ? ` <span class="muted">(filters match ${items.length} of ${itemsAll.length})</span>` : ""}`;
    // lists
    const rows = items.map(i => ({Symbol: i.sym, Company: i.s.name, Company_Name: i.s.name, rs: i.s.rs, band: i.s.band, band_then: i.s.band_then, chg: i.s.rs_then == null ? null : Math.round((i.s.rs - i.s.rs_then) * 10) / 10, quad: i.s.quad, new_s0: i.s.new_s0, has_chart: bySym[i.sym]?.has_chart}));
    const cols = [{key: "Symbol", label: "Symbol", render: GP.stockLink}, {key: "Company", label: "Company", render: v => esc(v)}, {key: "rs", label: "RS now", d: 0, render: dash},
      {key: "band", label: "RS band", d: 0, render: bl}, {key: "band_then", label: `Band ${p.lag}s ago`, d: 0, render: bl}, {key: "chg", label: `RS chg (${p.lag}s)`, d: 1, render: v => v == null ? "—" : (v > 0 ? "+" : "") + fmt(v, 1)}];
    const sections = [["Leading", r => r.quad === "Leading"], ["Improving", r => r.quad === "Improving"], ["Weakening", r => r.quad === "Weakening"], ["Lagging", r => r.quad === "Lagging"], ["Newly entered top 20%", r => r.new_s0]];
    el.querySelector("#lists").innerHTML = sections.map(([n], i) => `<h2 class="lh" data-n="${esc(n)}">${esc(n)} (<span class="lc">${rows.filter(sections[i][1]).length}</span>)</h2><div id="ls${i}"></div>`).join("");
    sections.forEach(([n, f], i) => ISC.table(el.querySelector("#ls" + i), {cols, rows: rows.filter(f), sortKey: "rs", sortDir: -1}));
    el.querySelectorAll("#fm .pill").forEach(b => b.onclick = () => { frame = b.dataset.f; draw(data); });
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && hl && el.offsetParent !== null) { hl = ""; const d = cache[group]; if (d) d.then(draw); } });
  sg.onchange = () => { setGroup(sg.value); if (location.hash.startsWith("#stockrrg/")) history.replaceState(null, "", "#stockrrg/" + encodeURIComponent(sg.value)); };
  GP.stockRrgInit = g => setGroup(g || group || defGroup());
  setGroup(GP.pendingStockGroup || defGroup());
};
