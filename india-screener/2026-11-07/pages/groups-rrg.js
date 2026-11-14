window.GP = window.GP || {tabs: {}};
GP.tabs.rrg = el => {
  const {esc} = ISC, D = GP.D, trim = GP.trim;
  const MODES = {gh: ["Reference algorithm (RS)", D.rrg_gh], rank: ["MSI rank change", D.rrg_rank], msi: ["RS + rank improvement", D.rrg_msi], price: ["Price", D.rrg]};
  const quad = (x, y) => x >= 100 ? (y >= 100 ? "Leading" : "Weakening") : (y >= 100 ? "Improving" : "Lagging");
  const gmap = {}; D.groups.forEach(g => gmap[trim(g.Group)] = g);
  const rankOf = {}; Object.entries(D.rrg_rank.points).forEach(([g, p]) => rankOf[trim(g)] = p[p.length - 1]);
  const hist = {}; Object.entries(D.group_hist).forEach(([g, h]) => hist[trim(g)] = h.rank);
  const chg = (g, lag) => { const r = hist[g]; if (!r || r.length <= lag) return null; return r[r.length - 1 - lag] - r[r.length - 1]; }; // + = improved
  const FR = {daily: "Daily", weekly: "Weekly", monthly: "Monthly"};
  let frame = "weekly", mode = "gh";   // a22: default = exact reference algorithm (rrg_gh)
  el.innerHTML = `<div id="ch"></div><div id="cnt" class="small"></div><div id="tf"></div>`;
  const ch = ISC.rrgChart(el.querySelector("#ch"), {title: `Relative Rotation Graph — Groups · ${D.snapshot.asof}`, tails: true,
    onSelect: k => { location.href = ISC.groupHref(k); }, refTip: true,
    onClick: k => GP.openGroup(k),
    strip: g => ISC.groupLink(g.key, "Stock RRG →", {destination: "stock"}) + ` <a href="#" class="small gl-list" data-g="${esc(g.key)}">stocks list</a>`,
    onVisible: (vis, all) => { el.querySelector("#cnt").innerHTML = `<b id="dots">${vis.length}</b> dots shown of ${all.length} groups with a tail (${D.snapshot.n_groups} groups total) · tail = last ${Math.max(0, ...all.map(i => i.points.length))} points`; }});
  ch.extra.innerHTML = `<label class="small muted">Mode <select id="mm" aria-label="RRG mode">${Object.entries(MODES).map(([k, [l]]) => `<option value="${k}"${k === mode ? " selected" : ""}>${l}</option>`).join("")}</select></label><span id="fm"></span>`;
  ch.extra.querySelector("#mm").onchange = e => { mode = e.target.value; draw(); };
  function draw() {
    const R0 = MODES[mode][1], isGh = mode === "gh", fr = mode === "rank" && R0.frames ? R0.frames[frame] : null, R = fr ? {method: R0.method, points: fr.points} : R0, pts = {};
    Object.entries(R.points).forEach(([g, p]) => { if (gmap[trim(g)]) pts[trim(g)] = isGh ? p.tail : p; }); // rrg*.json keys are MSI display names; others dropped
    el.querySelector("#fm").innerHTML = isGh ? `<span class="muted small" id="ghn">GitHub method — reference project's RS-Ratio/RS-Momentum, weekly, 8-week tail; provisional: MSI history is ~${R0.weeks} weeks (reference z-window 26)</span>` : fr ? Object.entries(FR).map(([k, l]) => `<button class="pill${k === frame ? " on" : ""}" data-f="${k}">${l}</button>`).join(" ") +
      (frame === "monthly" ? ` <span class="muted small" id="lim">limited history (~${Math.max(0, ...Object.values(pts).map(p => p.length))} points)</span>` : "") : "";
    const groups = Object.entries(pts).map(([g, t]) => {
      if (isGh) { const o = R0.points[g], l = o.current; return {key: g, label: g, size: gmap[g]?.n_msi || gmap[g]?.n_scored || 1, rank: o.rank, rs: o.rs, provisional: !!o.provisional, points: t, quadrant: o.quadrant, link: true, chg1w: chg(g, 5), chg4w: chg(g, 20),
        extra: [`Avg RS: ${o.rs} (rank ${o.rank} of ${Object.keys(R0.points).length})`, `1w rank chg: ${chg(g, 5) ?? "—"} · 4w: ${chg(g, 20) ?? "—"}`].concat(o.provisional ? ["Provisional (short history)"] : [])}; }
      const l = t[t.length - 1], q = l.quad || quad(l.x, l.y), gr = gmap[g], r = rankOf[g] || {}, rk = l.rank ?? r.rank ?? gr?.MsiRank ?? null, b = l.bucket ?? r.bucket;
      return {key: g, label: g, size: gr?.n_msi || gr?.n_scored || 1, rank: rk, rs: gr?.AvgRS ?? null, points: t, quadrant: q, link: true, chg1w: chg(g, 5), chg4w: chg(g, 20),
        extra: [`Bucket: ${b == null ? "—" : "B" + b}`, `1w rank chg: ${chg(g, 5) ?? "—"} · 4w: ${chg(g, 20) ?? "—"}`]};
    });
    const pr = fr ? fr.params : null;
    const sub = pr ? `${frame}: X = 100 + (40.5 − r̄)/6 with r̄ = ${pr.smooth}-session mean MSI group rank; Y = 100 + clip((r̄ ${pr.mom_lag} session${pr.mom_lag > 1 ? "s" : ""} ago − r̄ now)/${pr.k}, ±20); tail = last ${pr.tail_points} points, step ${pr.step}. Leading = rank 1–40 and improving/steady; Weakening = rank 1–40 and falling; Improving = rank > 40 and rising; Lagging = rank > 40 and falling.` : (R.method || R.bench_label || "") + (R.bench_label && R.method ? " · " + R.bench_label : "") + (mode === "price" && R.bench_label && !R.method ? " (price RS vs benchmark)" : "");
    ch.update({groups, subtitle: isGh ? R0.method : sub});
    const miss = Object.keys(gmap).filter(g => !pts[g]);
    el.querySelector("#tf").innerHTML = miss.length ? `<h2>${isGh ? "Fewer than 3 stocks with RS or under 12 weeks of history (no GitHub-method point)" : "Too few stocks for RS (no RRG tail)"} — ${miss.length}</h2><p class="muted small">${miss.map(m => esc(m)).join(" · ")}</p>` : "";
  }
  ch.extra.addEventListener("click", e => {
    const b = e.target.closest(".pill"); if (!b) return;
    if (b.dataset.f) frame = b.dataset.f; else return;
    draw();
  });
  draw();
  // deep link from other pages: RRG tab, Rank mode, Weekly frame, group pinned, chart scrolled into view
  GP.rrgFocus = name => {
    const want = ISC.groupKey(name), key = Object.keys(gmap).find(k => ISC.groupKey(k) === want) || Object.keys(gmap).find(k => ISC.groupKey(k.replace(/\s+IN\s*$/i, "")) === ISC.groupKey(String(name).replace(/\s+IN\s*$/i, "")));
    mode = "rank"; frame = "weekly";
    ch.extra.querySelector("#mm").value = "rank";
    draw();
    if (key) ch.pin(key);
    else el.querySelector("#cnt").insertAdjacentHTML("afterbegin", `<span class="muted">No RRG tail for "${esc(name)}" (too few stocks). </span>`);
    setTimeout(() => { const b = el.querySelector(".rc-box"); b && b.scrollIntoView({block: "center"}); }, 50);
  };
  if (GP.pendingRrg) { const n = GP.pendingRrg; GP.pendingRrg = null; GP.rrgFocus(n); }
};
