window.GP = window.GP || {tabs: {}};
GP.tabs.transitions = el => {
  const {esc} = ISC, D = GP.D, T = D.transitions, trim = GP.trim, LB = ["B0 (1–20)", "B1 (21–40)", "B2 (41–60)", "B3 (61+)"];
  const FR = {daily: ["Daily", "d1", "1 day"], weekly: ["Weekly", "w1", "1 week"], monthly: ["Monthly", "w4", "1 month (20 sessions)"]};
  let frame = "weekly";
  const mx = k => Math.max(1, ...T[k].matrix.flatMap((r, i) => r.filter((_, j) => i !== j)));
  const table = (k, title) => {
    const m = T[k].matrix, M = mx(k);
    return `<div class="card"><h2>${title} <span class="muted small">(lag ${T[k].lag} sessions · n=${T[k].n})</span></h2><div class="tablewrap"><table class="heat" data-k="${k}"><thead><tr><th>then ↓ / now →</th>${LB.map(l => `<th>${l}</th>`).join("")}<th>Σ row</th></tr></thead><tbody>
      ${m.map((r, i) => `<tr><td><b>${LB[i]}</b></td>${r.map((v, j) => i === j ? `<td class="c diag">${v}</td>` :
        `<td class="c off" data-f="${i}" data-t="${j}" style="background:color-mix(in srgb,var(--primary) ${Math.round(v / M * 70)}%,var(--card))">${v}</td>`).join("")}<td class="c"><b class="rs">${r.reduce((a, b) => a + b, 0)}</b></td></tr>`).join("")}</tbody></table></div></div>`;
  };
  const MV_COLS = [{key: "group", label: "Group", text: true, render: v => ISC.groupLink(v, null, {destination: "stock"})}, {key: "from_rank", label: "From rank", d: 0}, {key: "to_rank", label: "To rank", d: 0},
    {key: "from_bucket", label: "From bucket", d: 0, render: v => "B" + v}, {key: "to_bucket", label: "To bucket", d: 0, render: v => "B" + v}];
  const mvRows = k => (T.movers_frames[frame] || {})[k] || [];
  const mv = (title, k, desc) => { const a = mvRows(k);
    return `<div class="card"><h2>${title} <span class="muted small">(${a.length})</span></h2><p class="muted small">${desc}</p>${a.length ? `<div class="mvt" data-mv="${k}"></div>` : `<p class="muted">None.</p>`}</div>`; };
  el.innerHTML = `<div class="row" id="fm"></div><p class="muted small">Buckets by MSI group rank: B0 1–20, B1 21–40, B2 41–60, B3 61+. Rows = bucket then, columns = bucket now. Click an off-diagonal cell to list the groups in it.</p>
    <div id="body"></div>`;
  function draw() {
    const [, k, lbl] = FR[frame];
    el.querySelector("#fm").innerHTML = Object.entries(FR).map(([f, [l]]) => `<button class="pill${f === frame ? " on" : ""}" data-f="${f}">${l}</button>`).join("");
    el.querySelector("#body").innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px">${table(k, lbl)}</div><div id="det"></div>
      ${mv("Entered top 20", "entered_top20", "Groups now in B0 that were not before.")}${mv("Jumped 2+ buckets", "jumped_2plus", "Bucket improved by two or more.")}${mv("Left top 40", "left_top40", "Groups that fell out of B0/B1.")}`;
    el.querySelectorAll(".mvt").forEach(d => ISC.table(d, {cols: MV_COLS, rows: mvRows(d.dataset.mv), sortKey: null}));
    el.querySelectorAll("#fm .pill").forEach(b => b.onclick = () => { frame = b.dataset.f; draw(); });
    el.querySelectorAll("td.off").forEach(td => td.onclick = () => {
      const f = +td.dataset.f, t = +td.dataset.t, L = (T[k].cells || {})[`${f}-${t}`] || [];
      el.querySelector("#det").innerHTML = `<div class="card"><h2>B${f} → B${t} (${lbl}: ${td.textContent} groups)</h2>${L.length ? L.map(g => ISC.groupLink(g, null, {destination: "stock"})).join("<br>") : `<span class="muted">None.</span>`}</div>`;
    });
  }
  draw();
};
