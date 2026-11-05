// Shared Relative Rotation Graph component (Addendum 6): ISC.rrgChart(el, opts) -> {update, extra, state}
// opts: {title, subtitle, groups:[{key,label,size,rank,points:[{d,x,y}],quadrant,tip?,r?,link?}], dates, onSelect(key), onVisible(visible, all), extraControls, tails, labels, highlight}
(() => {
  const QC = {Improving: "#3b5bdb", Leading: "#2f9e44", Weakening: "#f08c00", Lagging: "#e03131"};
  const QS = ["Improving", "Leading", "Weakening", "Lagging"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const css = `
.rc .rc-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:4px 0 8px}.rc .rc-grow{flex:1}
.rc .rc-title{font-size:14px;font-weight:600;margin:0}
.rc .rc-sw{font:inherit;font-size:13px;display:inline-flex;align-items:center;gap:6px;background:none;border:0;color:var(--text);cursor:pointer;padding:2px}
.rc .rc-sw i{position:relative;width:28px;height:14px;border-radius:7px;background:var(--line);transition:background .15s}
.rc .rc-sw i::after{content:"";position:absolute;top:-3px;left:-2px;width:20px;height:20px;border-radius:50%;background:#fafafa;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:left .15s}
.rc .rc-sw[aria-checked=true] i{background:color-mix(in srgb,var(--primary) 50%,transparent)}.rc .rc-sw[aria-checked=true] i::after{left:10px;background:var(--primary)}
.rc .rc-qs{display:inline-flex}.rc .rc-q{font:inherit;font-size:13px;background:var(--card);color:var(--muted);border:1px solid var(--line);padding:5px 10px;cursor:pointer;margin-left:-1px}
.rc .rc-q:first-child{border-radius:4px 0 0 4px;margin-left:0}.rc .rc-q:last-child{border-radius:0 4px 4px 0}.rc .rc-q[aria-pressed=true]{font-weight:700;position:relative;z-index:1}
.rc .rc-rank{display:inline-flex;flex-direction:column;gap:0;width:200px}.rc .rc-rl{font-size:12px;color:var(--muted)}.rc .rc-rl b{font-weight:400}
.rc .rc-ac{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px;position:relative;width:360px;max-width:100%;min-height:38px;border:1px solid var(--line);border-radius:4px;padding:4px 28px 4px 8px;background:var(--card)}
.rc .rc-ac:focus-within{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary)}
.rc .rc-flbl{position:absolute;top:-8px;left:8px;font-size:11px;color:var(--muted);background:var(--card);padding:0 4px}
.rc .rc-chips{display:contents}.rc .rc-chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;background:var(--tint);border-radius:999px;padding:2px 4px 2px 10px}
.rc .rc-chip button{font:inherit;font-size:11px;border:0;width:16px;height:16px;border-radius:50%;background:var(--muted);color:var(--card);cursor:pointer;line-height:16px;padding:0}
.rc .rc-fi{flex:1;min-width:80px;border:0;outline:0;font:inherit;font-size:13px;background:transparent;color:var(--text)}
.rc .rc-fclr{position:absolute;right:4px;top:50%;transform:translateY(-50%);font:inherit;font-size:12px;border:0;background:none;color:var(--muted);cursor:pointer}
.rc .rc-list [role=option]{padding:4px 8px;font-size:13px;cursor:pointer;border-radius:4px}.rc .rc-list [role=option]:hover{background:var(--tint)}.rc .rc-list [aria-selected=true]{background:color-mix(in srgb,var(--primary) 14%,transparent)}
.rc .rc-ctl{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:6px 0}
.rc .rc-btn{font:inherit;font-size:13px;background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:999px;padding:4px 12px;cursor:pointer}
.rc .rc-btn[aria-pressed=true]{background:var(--primary);color:#fff;border-color:var(--primary)}
.rc .rc-btn:focus-visible,.rc input:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
.rc .rc-rank{display:inline-flex;align-items:center;gap:8px;font-size:13px}
.rc .rc-dual{position:relative;width:150px;height:22px}
.rc .rc-dual input{position:absolute;left:0;top:0;width:100%;height:22px;margin:0;background:none;pointer-events:none;-webkit-appearance:none;appearance:none}
.rc .rc-dual input::-webkit-slider-runnable-track{height:4px;background:var(--line);border-radius:2px}
.rc .rc-dual input::-moz-range-track{height:4px;background:var(--line);border-radius:2px}
.rc .rc-dual input::-webkit-slider-thumb{-webkit-appearance:none;pointer-events:auto;width:16px;height:16px;border-radius:50%;background:var(--primary);border:2px solid var(--card);margin-top:-6px;cursor:pointer}
.rc .rc-dual input::-moz-range-thumb{pointer-events:auto;width:12px;height:12px;border-radius:50%;background:var(--primary);border:2px solid var(--card);cursor:pointer}
.rc .rc-fg{position:relative}
.rc .rc-pop{position:absolute;z-index:15;top:100%;left:0;margin-top:4px;width:min(360px,86vw);background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.2);padding:8px}
.rc .rc-pop[hidden]{display:none}
.rc .rc-pop input[type=search]{width:100%;font:inherit;padding:4px 8px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--text)}
.rc .rc-list{max-height:220px;overflow:auto;margin:6px 0}
.rc .rc-list label{display:flex;gap:6px;align-items:center;padding:2px 2px;font-size:13px;cursor:pointer}
.rc .rc-box{position:relative;width:100%;border:1px solid var(--line);border-radius:10px;background:var(--card);overflow:hidden}
.rc svg{display:block;width:100%;touch-action:pan-y;user-select:none}
.rc .rc-tip{position:absolute;z-index:10;pointer-events:none;background:#fff;color:#1f2937;border:1px solid #e5e7eb;border-radius:10px;padding:8px 11px;font-size:12px;line-height:1.45;box-shadow:0 4px 14px rgba(0,0,0,.22);max-width:250px}
.rc .rc-tip b{display:block;font-size:13px;color:#111827}.rc .rc-tip .q{font-weight:700}.rc .rc-tip .x{color:#6b7280}
.rc svg.rc-has .rc-dot{opacity:.18}.rc svg.rc-has .rc-tl:not([data-show='0']){opacity:.18}.rc svg.rc-has .rc-dot.rc-sel{opacity:1}
.rc .rc-dot{transition:opacity .08s}
.rc .rc-strip{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:8px 0;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card);font-size:13px}
.rc .rc-strip[hidden]{display:none}.rc .rc-strip .rc-q-chip{font-weight:700}
.rc .rc-strip a.gl,.rc .rc-strip a.rc-go{font:inherit;font-size:13px;background:var(--primary);color:#fff;border:1px solid var(--primary);border-radius:999px;padding:4px 12px;text-decoration:none;border-bottom:1px solid var(--primary)}
.rc .rc-tip[hidden]{display:none}
.rc .rc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (max-width:640px){.rc .rc-dual{width:120px}}`;
  function injectCss() { if (document.getElementById("rrg-chart-css")) return; const s = document.createElement("style"); s.id = "rrg-chart-css"; s.textContent = css; document.head.appendChild(s); }

  function niceTicks(lo, hi, n = 6) {
    const span = hi - lo || 1, raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p, out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return {ticks: out, step};
  }
  function smooth(p) {   // Catmull-Rom -> cubic bezier
    if (p.length < 3) return "M" + p.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L");
    let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)},${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)},${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
    }
    return d;
  }
  const uid = (() => { let n = 0; return () => ++n; })();

  function rrgChart(el, opts) {
    injectCss();
    const id = uid();
    let o = opts || {}, groups = [], maxRank = 1;
    const st = {tails: o.tails !== false, labels: !!o.labels, act: new Set(), lo: 1, hi: 1, sel: new Set(), pin: "", hov: "", zoom: null, hl: o.highlight || ""};
    el.classList.add("rc");
    el.innerHTML = `<div class="rc-ctl rc-extra"></div>
      <div class="rc-head"><h3 class="rc-title"></h3><span class="muted small">drag to zoom</span><span class="rc-grow"></span><button type="button" class="rc-btn rc-reset" hidden>Reset zoom</button>
        <button type="button" class="rc-sw rc-tails" role="switch" aria-checked="${st.tails}"><i></i>Tails</button><button type="button" class="rc-sw rc-labels" role="switch" aria-checked="${st.labels}"><i></i>Labels</button>
        <span class="rc-qs" role="group" aria-label="Filter by quadrant"></span>
        <span class="rc-rank"><span class="rc-rl">Rank <b class="rc-rv"></b></span><span class="rc-dual"><input type="range" class="rc-lo" min="1" max="1" value="1" aria-label="Minimum rank"><input type="range" class="rc-hi" min="1" max="1" value="1" aria-label="Maximum rank"></span></span>
        <span class="rc-fg"><span class="rc-ac"><span class="rc-flbl">Filter groups</span><span class="rc-chips"></span><input type="search" class="rc-fi" placeholder="All shown" aria-label="Filter groups" aria-expanded="false" autocomplete="off"><button type="button" class="rc-fclr" aria-label="Clear selection" hidden>✕</button></span>
          <div class="rc-pop" hidden><div class="rc-list" role="listbox" aria-multiselectable="true" aria-label="Groups"></div></div></span></div>
      <p class="muted small rc-sub"></p>
      <div class="rc-box"><svg role="img" aria-label="Relative rotation graph"></svg><div class="rc-tip" hidden></div></div><div class="rc-strip" hidden></div><div class="rc-sr" aria-live="polite"></div>`;
    const $ = s => el.querySelector(s), svg = $("svg"), box = $(".rc-box"), tip = $(".rc-tip");
    let ro = null;
    const docClick = e => { if (!pop.hidden && !el.querySelector(".rc-fg").contains(e.target)) setPop(false); };
    const api = {extra: $(".rc-extra"), state: st, update, destroy() { ro && ro.disconnect(); document.removeEventListener("click", docClick); document.removeEventListener("keydown", docKey); }};
    if (typeof o.extraControls === "function") o.extraControls(api.extra); else if (o.extraControls instanceof Node) api.extra.appendChild(o.extraControls);
    $(".rc-qs").innerHTML = QS.map(q => `<button type="button" class="rc-q" data-q="${q}" aria-pressed="false">${q}</button>`).join("");
    const qOn = q => !st.act.size || st.act.has(q);   // reference: empty selection = all shown

    // ---- geometry
    let W = 0, H = 0, bounds = null, drag = null;
    const ML = 50, MR = 14, MT = 12, MB = 40;
    function computeBounds() {
      let ex = 2, ey = 2;
      groups.forEach(g => g.points.forEach(p => { ex = Math.max(ex, Math.abs(p.x - 100)); ey = Math.max(ey, Math.abs(p.y - 100)); }));
      bounds = {x0: 100 - ex * 1.08, x1: 100 + ex * 1.08, y0: 100 - ey * 1.08, y1: 100 + ey * 1.08};
    }
    const curView = () => st.zoom || bounds;
    const sx = v => { const b = curView(); return ML + (v - b.x0) / (b.x1 - b.x0) * (W - ML - MR); };
    const sy = v => { const b = curView(); return H - MB - (v - b.y0) / (b.y1 - b.y0) * (H - MT - MB); };
    const dx = px => { const b = curView(); return b.x0 + (px - ML) / (W - ML - MR) * (b.x1 - b.x0); };
    const dy = py => { const b = curView(); return b.y0 + (H - MB - py) / (H - MT - MB) * (b.y1 - b.y0); };

    function passBase(g) {   // rank + multi-select (not quadrant)
      if (st.sel.size && !st.sel.has(g.key)) return false;
      if (g.rank == null) return st.lo <= 1 && st.hi >= maxRank;
      return g.rank >= st.lo && g.rank <= st.hi;
    }

    function render() {
      if (!bounds) return;
      const w = Math.round(box.clientWidth) || 800;
      W = w; H = w < 520 ? Math.round(w * 1.05) : Math.round(Math.max(380, w * 0.58));
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H);
      const base = groups.filter(passBase), vis = base.filter(g => qOn(g.quadrant));
      const counts = {}; base.forEach(g => counts[g.quadrant] = (counts[g.quadrant] || 0) + 1);
      el.querySelectorAll(".rc-q").forEach(b => { const q = b.dataset.q, on = st.act.has(q); b.setAttribute("aria-pressed", on); b.style.cssText = on ? `color:${QC[q]};border-color:${QC[q]}` : ""; });
      const V = curView(), X0 = sx(100), Y0 = sy(100), L = ML, R = W - MR, T = MT, B = H - MB;
      const cx0 = Math.min(R, Math.max(L, X0)), cy0 = Math.min(B, Math.max(T, Y0));
      const tint = (q, x, y, w2, h2) => w2 > 0 && h2 > 0 ? `<rect x="${x}" y="${y}" width="${w2}" height="${h2}" fill="${QC[q]}" opacity=".09"/>` : "";
      const tints = tint("Improving", L, T, cx0 - L, cy0 - T) + tint("Leading", cx0, T, R - cx0, cy0 - T) + tint("Weakening", cx0, cy0, R - cx0, B - cy0) + tint("Lagging", L, cy0, cx0 - L, B - cy0);
      const cl = (q, x, y, a) => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="13" font-weight="700" fill="${QC[q]}" opacity=".75">${q}</text>`;
      const tx = niceTicks(V.x0, V.x1), ty = niceTicks(V.y0, V.y1, 5), dec = s => s >= 1 ? 0 : s >= .1 ? 1 : 2;
      const gridLines = tx.ticks.map(v => `<line x1="${sx(v)}" y1="${T}" x2="${sx(v)}" y2="${B}" stroke="var(--line)" stroke-width=".7"/>`).join("") + ty.ticks.map(v => `<line x1="${L}" y1="${sy(v)}" x2="${R}" y2="${sy(v)}" stroke="var(--line)" stroke-width=".7"/>`).join("");
      const tickTxt = tx.ticks.map(v => `<text x="${sx(v)}" y="${B + 14}" text-anchor="middle" font-size="10" fill="var(--muted)">${v.toFixed(dec(tx.step))}</text>`).join("") + ty.ticks.map(v => `<text x="${L - 5}" y="${sy(v) + 3}" text-anchor="end" font-size="10" fill="var(--muted)">${v.toFixed(dec(ty.step))}</text>`).join("");
      const ax = (X0 >= L && X0 <= R ? `<line x1="${X0}" y1="${T}" x2="${X0}" y2="${B}" stroke="var(--muted)" stroke-dasharray="4 3"/>` : "") + (Y0 >= T && Y0 <= B ? `<line x1="${L}" y1="${Y0}" x2="${R}" y2="${Y0}" stroke="var(--muted)" stroke-dasharray="4 3"/>` : "");
      const maxSize = Math.max(1, ...groups.map(g => g.size || 1));
      const rad = g => g.r != null ? g.r : 3 + 6 * Math.sqrt((g.size || 1) / maxSize);
      const hl = st.hl;
      const sorted = vis.slice().sort((a, b) => (b.size || 0) - (a.size || 0));
      let tails = "", dots = "", hits = "";
      sorted.forEach(g => {
        const c = QC[g.quadrant], isH = hl && g.key === hl, dim = hl && !isH, k = esc(g.key);
        if (g.points.length > 1) {
          const pts = g.points.map(p => [sx(p.x), sy(p.y)]), show = st.tails || isH;
          tails += `<path class="rc-tl" data-k="${k}" data-show="${show ? 1 : 0}" d="${smooth(pts)}" fill="none" stroke="${c}" stroke-width="${isH ? 2 : 1.2}" opacity="${show ? (dim ? .06 : isH ? .9 : .38) : 0}" marker-end="url(#rcah${id}-${g.quadrant})" pointer-events="none"/>`;
          if (show) hits += `<path class="rc-th" data-k="${k}" d="${smooth(pts)}" fill="none" stroke="transparent" stroke-width="9" pointer-events="stroke"/>`;
        }
        const l = g.points[g.points.length - 1];
        dots += `<circle class="rc-dot" data-k="${k}" cx="${sx(l.x).toFixed(1)}" cy="${sy(l.y).toFixed(1)}" r="${isH ? rad(g) + 2 : rad(g)}" fill="${c}" fill-opacity="${isH ? .4 : .2}" opacity="${dim ? .15 : 1}" stroke="${isH ? "#000" : c}" stroke-width="${isH ? 2.2 : 1.5}" style="cursor:pointer"/>`;
      });
      let labs = "";   // labels with collision limiting
      if (st.labels || hl) {
        const placed = [], order = sorted.slice().sort((a, b) => (b.key === hl) - (a.key === hl) || (a.rank ?? 1e9) - (b.rank ?? 1e9));
        let n = 0;
        for (const g of order) {
          if (!(st.labels || g.key === hl) || n >= 120) continue;
          const l = g.points[g.points.length - 1], x = sx(l.x), y = sy(l.y), r = rad(g), t = String(g.label || g.key), w2 = t.length * 5.6 + 2;
          if (x < L || x > R || y < T || y > B) continue;
          let anchor = "start", bx = x + r + 3; if (bx + w2 > R) { anchor = "end"; bx = x - r - 3; }
          const bb = {x: anchor === "start" ? bx : bx - w2, y: y - 6, w: w2, h: 12};
          if (g.key !== hl && placed.some(p => bb.x < p.x + p.w && bb.x + bb.w > p.x && bb.y < p.y + p.h && bb.y + bb.h > p.y)) continue;
          placed.push(bb); n++;
          labs += `<text x="${bx.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="${anchor}" font-size="10" fill="var(--text)" paint-order="stroke" stroke="var(--card)" stroke-width="3" pointer-events="none">${esc(t)}</text>`;
        }
      }
      svg.innerHTML = `<defs>${QS.map(q => `<marker id="rcah${id}-${q}" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0L8,4L0,8z" fill="${QC[q]}"/></marker>`).join("")}<marker id="rcahd${id}" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0L8,4L0,8z" fill="#374151"/></marker><clipPath id="rcclip${id}"><rect x="${L}" y="${T}" width="${R - L}" height="${B - T}"/></clipPath></defs>
        <g clip-path="url(#rcclip${id})">${tints}${gridLines}${ax}${tails}${dots}${hits}<g class="rc-ov" pointer-events="none"></g></g>
        <rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="none" stroke="var(--line)"/>${tickTxt}
        ${cl("Improving", L + 8, T + 18, "start")}${cl("Leading", R - 8, T + 18, "end")}${cl("Lagging", L + 8, B - 8, "start")}${cl("Weakening", R - 8, B - 8, "end")}
        <g clip-path="url(#rcclip${id})">${labs}</g>
        <text x="${(L + R) / 2}" y="${H - 6}" text-anchor="middle" font-size="12" fill="var(--muted)">RS-Ratio</text>
        <text x="13" y="${(T + B) / 2}" text-anchor="middle" font-size="12" fill="var(--muted)" transform="rotate(-90 13 ${(T + B) / 2})">RS-Momentum</text>
        <rect class="rc-band" display="none" fill="var(--primary)" opacity=".15" stroke="var(--primary)" stroke-dasharray="3 2"/>`;
      $(".rc-reset").hidden = !st.zoom;
      if (st.pin && !vis.some(g => g.key === st.pin)) { st.pin = ""; strip(); }
      st.hov = ""; applyHL();
      $(".rc-sr").textContent = `${vis.length} of ${groups.length} shown`;
      $(".rc-rv").textContent = `${st.lo}–${st.hi}`;
      if (o.onVisible) o.onVisible(vis, groups);
    }

    // ---- controls
    function syncSliders() {
      const lo = $(".rc-lo"), hi = $(".rc-hi");
      lo.max = hi.max = maxRank; lo.value = st.lo; hi.value = st.hi;
      lo.style.zIndex = st.lo >= maxRank - 1 ? 3 : 2; hi.style.zIndex = 2;
    }
    const fbLabel = () => {
      $(".rc-chips").innerHTML = [...st.sel].slice(0, 3).map(k => `<span class="rc-chip">${esc((byKey(k) || {}).label || k)}<button type="button" data-rm="${esc(k)}" aria-label="Remove">✕</button></span>`).join("") + (st.sel.size > 3 ? `<span class="small muted">+${st.sel.size - 3}</span>` : "");
      $(".rc-fi").placeholder = st.sel.size ? "" : "All shown"; $(".rc-fclr").hidden = !st.sel.size;
    };
    function buildList() {
      const q = ($(".rc-fi").value || "").toLowerCase();
      $(".rc-list").innerHTML = groups.slice().sort((a, b) => String(a.label).localeCompare(String(b.label))).filter(g => !q || String(g.label).toLowerCase().includes(q))
        .map(g => `<div role="option" data-k="${esc(g.key)}" aria-selected="${st.sel.has(g.key)}">${esc(g.label)}</div>`).join("") || `<span class="muted small">No options</span>`;
      fbLabel();
    }
    $(".rc-tails").onclick = e => { st.tails = !st.tails; e.currentTarget.setAttribute("aria-checked", st.tails); render(); };
    $(".rc-labels").onclick = e => { st.labels = !st.labels; e.currentTarget.setAttribute("aria-checked", st.labels); render(); };
    el.querySelectorAll(".rc-q").forEach(b => b.onclick = () => { const q = b.dataset.q; st.act.has(q) ? st.act.delete(q) : st.act.add(q); render(); });
    $(".rc-lo").oninput = e => { st.lo = Math.min(+e.target.value, st.hi); e.target.value = st.lo; render(); };
    $(".rc-hi").oninput = e => { st.hi = Math.max(+e.target.value, st.lo); e.target.value = st.hi; render(); };
    const pop = $(".rc-pop"), fb = $(".rc-fi");
    function setPop(open) { pop.hidden = !open; fb.setAttribute("aria-expanded", open); if (open) buildList(); }
    fb.onblur = () => setTimeout(() => { if (document.activeElement !== fb) { fb.value = ""; setPop(false); } }, 120);   // reference clears the input text on blur
    fb.onfocus = () => setPop(true); fb.onclick = () => setPop(true);
    fb.oninput = () => { setPop(true); buildList(); };
    fb.onkeydown = e => { if (e.key === "Backspace" && !fb.value && st.sel.size) { st.sel.delete([...st.sel].pop()); buildList(); render(); } };
    $(".rc-list").addEventListener("mousedown", e => e.preventDefault());
    $(".rc-list").onclick = e => { const o_ = e.target.closest("[data-k]"); if (!o_) return; const k = o_.dataset.k; st.sel.has(k) ? st.sel.delete(k) : st.sel.add(k); buildList(); render(); };   // disableCloseOnSelect
    $(".rc-chips").onclick = e => { const b = e.target.closest("[data-rm]"); if (!b) return; e.stopPropagation(); st.sel.delete(b.dataset.rm); buildList(); render(); };
    $(".rc-fclr").onclick = () => { st.sel.clear(); fb.value = ""; buildList(); render(); };
    el.addEventListener("keydown", e => { if (e.key === "Escape" && !pop.hidden) { setPop(false); } });
    document.addEventListener("click", docClick);
    $(".rc-reset").onclick = () => { st.zoom = null; render(); };

    // ---- tooltip / select / rubber-band zoom
    const byKey = k => groups.find(g => g.key === k);
    const loc = e => { const b = svg.getBoundingClientRect(); return [(e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height]; };
    const fnum = (v, d = 2) => Number.isFinite(v) ? v.toFixed(d) : "[DATA NEEDED]";
    const last = g => g.points[g.points.length - 1] || {};
    function applyHL() {   // one overlay group + class toggles; no per-dot work
      const key = st.hov || st.pin, ov = svg.querySelector(".rc-ov");
      svg.querySelectorAll(".rc-sel").forEach(n => n.classList.remove("rc-sel"));
      if (ov) ov.innerHTML = "";
      svg.classList.toggle("rc-has", !!key);
      const g = key && byKey(key); if (!g || !ov) return;
      const d = g.points.length > 1 ? smooth(g.points.map(p => [sx(p.x), sy(p.y)])) : "";
      const dot = [...svg.querySelectorAll(".rc-dot")].find(n => n.dataset.k === key); if (!dot) return;
      dot.classList.add("rc-sel");
      const rr = +dot.getAttribute("r"), l = last(g), pinned = st.pin === key;
      ov.innerHTML = (d ? `<path class="rc-halo" d="${d}" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/><path class="rc-hot" d="${d}" fill="none" stroke="#4b5563" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#rcahd${id})"/>` : "") +
        `<circle class="rc-ring" cx="${sx(l.x).toFixed(1)}" cy="${sy(l.y).toFixed(1)}" r="${rr + (pinned ? 2.5 : 1.5)}" fill="${QC[g.quadrant]}" fill-opacity=".35" stroke="#374151" stroke-width="${pinned ? 3 : 2.2}"/>`;
    }
    function tipHtml(g) {   // reference RRGTooltip: name / quadrant / "Rank: N · RS: x" / "Ratio · Momentum"
      const l = last(g), c = QC[g.quadrant] || "#555", f1 = v => Number.isFinite(v) ? v.toFixed(1) : "—";
      const rs = g.rs === undefined ? "" : ` · RS: ${g.rs == null ? "—" : esc(typeof g.rs === "number" ? g.rs.toFixed(1) : g.rs)}`;
      return `<b>${esc(g.label || g.key)}</b><span class="q" style="color:${c}">${esc(g.quadrant)}${g.provisional ? " · provisional" : ""}</span><br>Rank: ${g.rank ?? "—"}${rs}<br><span class="x">Ratio ${f1(l.x)} · Momentum ${f1(l.y)}</span>` +
        (!o.refTip && g.extra && g.extra.length ? `<br><span class="x">${g.extra.map(esc).join("<br>")}</span>` : "");
    }
    function strip() {
      const bar = $(".rc-strip"), g = st.pin && byKey(st.pin);
      if (!g) { bar.hidden = true; bar.innerHTML = ""; return; }
      const ch = (n, v) => v == null ? "" : `<span>${n} rank chg: <b>${v > 0 ? "+" : ""}${v}</b></span>`;
      bar.innerHTML = `<b>${esc(g.label || g.key)}</b><span class="rc-q-chip" style="color:${QC[g.quadrant]}">${esc(g.quadrant)}</span><span>Rank: <b>${g.rank ?? "[DATA NEEDED]"}</b></span>${ch("1w", g.chg1w)}${ch("4w", g.chg4w)}${o.strip ? o.strip(g) : ""}<button type="button" class="rc-btn rc-clear">Clear</button>`;
      bar.hidden = false;
    }
    function setPin(k) { st.pin = k || ""; strip(); applyHL(); }
    api.pin = setPin;
    $(".rc-strip").addEventListener("click", e => { if (e.target.closest(".rc-clear")) setPin(""); });
    document.addEventListener("keydown", docKey);
    function docKey(e) { if (e.key === "Escape" && st.pin && el.isConnected && (pop.hidden)) setPin(""); }
    svg.addEventListener("pointermove", e => {
      if (drag) {
        const [x, y] = loc(e), r = svg.querySelector(".rc-band");
        if (Math.abs(x - drag.x) + Math.abs(y - drag.y) > 6) drag.moved = true;
        if (!drag.moved || !r) return; tip.hidden = true;
        r.setAttribute("display", "inline"); r.setAttribute("x", Math.min(x, drag.x)); r.setAttribute("y", Math.min(y, drag.y)); r.setAttribute("width", Math.abs(x - drag.x)); r.setAttribute("height", Math.abs(y - drag.y));
        return;
      }
      const t = e.target.closest && e.target.closest(".rc-dot,.rc-th"), k = t ? t.dataset.k : "";
      if (k !== st.hov) { st.hov = k; applyHL(); if (k) { const g = byKey(k); if (g) tip.innerHTML = tipHtml(g); } }
      if (!k) { tip.hidden = true; return; }
      tip.hidden = false;
      const b = box.getBoundingClientRect(); let x = e.clientX - b.left + 14, y = e.clientY - b.top + 14;
      if (x + tip.offsetWidth > b.width) x = e.clientX - b.left - tip.offsetWidth - 14;
      if (y + tip.offsetHeight > b.height) y = Math.max(0, b.height - tip.offsetHeight - 4);
      tip.style.left = Math.max(0, x) + "px"; tip.style.top = y + "px";
    });
    svg.addEventListener("pointerleave", () => { tip.hidden = true; if (!drag && st.hov) { st.hov = ""; applyHL(); } });
    svg.addEventListener("click", e => {
      const t = e.target.closest && e.target.closest(".rc-dot,.rc-th");
      if (t && o.onClick) { o.onClick(t.dataset.k); return; }   // reference: click a point -> group detail
      if (t) { setPin(st.pin === t.dataset.k && e.detail > 1 ? st.pin : t.dataset.k); return; }
    });
    svg.addEventListener("dblclick", e => { const t = e.target.closest && e.target.closest(".rc-dot,.rc-th"); if (t && o.onSelect) { const g = byKey(t.dataset.k); if (g && g.link) o.onSelect(t.dataset.k); } });
    svg.addEventListener("pointerdown", e => {
      if (e.button > 0 || (e.target.closest && e.target.closest(".rc-dot,.rc-th"))) return;
      const [x, y] = loc(e); if (x < ML || x > W - MR || y < MT || y > H - MB) return;
      drag = {x, y, moved: false, id: e.pointerId}; try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    });
    const endDrag = e => {
      if (!drag) return; const d = drag; drag = null;
      try { svg.releasePointerCapture(d.id); } catch (_) {}
      if (!d.moved || e.type === "pointercancel") { const r = svg.querySelector(".rc-band"); r && r.setAttribute("display", "none"); if (!d.moved && e.type === "pointerup" && st.pin) setPin(""); return; }
      const [x, y] = loc(e), xa = Math.max(ML, Math.min(x, d.x)), xb = Math.min(W - MR, Math.max(x, d.x)), ya = Math.max(MT, Math.min(y, d.y)), yb = Math.min(H - MB, Math.max(y, d.y));
      if (xb - xa < 12 || yb - ya < 12) { render(); return; }
      st.zoom = {x0: dx(xa), x1: dx(xb), y0: dy(yb), y1: dy(ya)}; render();
    };
    svg.addEventListener("pointerup", endDrag); svg.addEventListener("pointercancel", endDrag);

    function update(n) {
      n = n || {}; o = Object.assign({}, o, n);
      if (n.groups) {
        groups = n.groups.filter(g => g.points && g.points.length);
        const prevMax = maxRank; maxRank = Math.max(1, ...groups.map(g => g.rank || 1));
        if (st.hi >= prevMax || st.hi > maxRank) st.hi = maxRank;
        st.lo = Math.max(1, Math.min(st.lo, st.hi));
        const keys = new Set(groups.map(g => g.key)); [...st.sel].forEach(k => keys.has(k) || st.sel.delete(k));
        computeBounds(); st.zoom = null; syncSliders(); buildList();
      }
      if (n.tails !== undefined) { st.tails = !!n.tails; $(".rc-tails").setAttribute("aria-checked", st.tails); }
      if (n.highlight !== undefined) st.hl = n.highlight || "";
      if (n.title !== undefined) $(".rc-title").textContent = n.title || "";
      if (n.subtitle !== undefined) $(".rc-sub").textContent = n.subtitle || "";
      render();
    }
    let lastW = 0;
    if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(() => { const w = Math.round(box.clientWidth); if (w && w !== lastW) { lastW = w; if (groups.length) render(); } }); ro.observe(box); }
    $(".rc-title").textContent = o.title || ""; $(".rc-sub").textContent = o.subtitle || "";
    if (o.groups) update({groups: o.groups});
    return api;
  }
  window.ISC = window.ISC || {}; ISC.rrgChart = rrgChart; ISC.RRG_COLORS = QC;
})();
