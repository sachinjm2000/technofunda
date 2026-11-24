(async () => {
  const {fmt, esc} = ISC;
  ISC.shell("breadth.html");
  const [br, snap] = await Promise.all(["breadth", "snapshot"].map(ISC.load));
  const last = k => { const a = br[k]; if (!Array.isArray(a) || !a.length) return null; const v = a[a.length - 1]; return v === undefined ? null : v; };
  const T = [["% above 20-DMA","pct_above_20",1,"%"],["% above 40-DMA","pct_above_40",1,"%"],["% above 50-DMA","pct_above_50",1,"%"],["% above 200-DMA","pct_above_200",1,"%"],
    ["Advancers","adv",0],["Decliners","dec",0],["New highs","new_hi",0],["New lows","new_lo",0],["Up 4%+ today","up4",0],["Down 4%+ today","dn4",0],["Up 25%+ in a quarter","q_up25",0],["Down 25%+ in a quarter","q_dn25",0]];
  const tile = ([l, k, d, u]) => { const v = last(k); return `<div class="tile"><div class="muted small">${esc(l)}</div><div class="big">${v === null ? "[DATA NEEDED]" : fmt(v, d) + (u || "")}</div></div>`; };
  const dates = br.dates || [];
  document.getElementById("app").innerHTML = `${ISC.banner(snap)}
    <style>.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}.tile{background:var(--tint);border-radius:10px;padding:10px 12px;min-width:0}.big{font-size:22px;font-weight:700}h2{font-size:16px;margin:4px 0 8px}.ch{height:260px;width:100%}.grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.grid2 .card{min-width:0}@media(max-width:800px){.grid2{grid-template-columns:minmax(0,1fr)}}.lg{font-size:12px;margin-bottom:4px}.lg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 4px 0 10px}</style>
    <p class="muted small" id="fnote">Filters do not apply to breadth (market-wide universe).</p>
    <div class="tiles">${T.map(tile).join("")}</div>
    <p class="muted small">Latest session ${esc(dates[dates.length - 1] ?? "[DATA NEEDED]")} · universe ${fmt(last("universe"), 0)} stocks.</p>
    <div class="grid2">
    <div class="card"><h2>% above 50-DMA &amp; 200-DMA</h2><div id="c1" class="ch"></div></div>
    <div class="card"><h2>% above 40-DMA (T2108 analogue)</h2><div id="c2" class="ch"></div></div>
    <div class="card"><h2>Advancers vs decliners</h2><div id="c3" class="ch"></div></div>
    <div class="card"><h2>New highs vs new lows</h2><div id="c4" class="ch"></div></div></div>
    <p class="muted small">Universe: ${fmt(last("universe"), 0)} NSE stocks with ≥200 sessions of price data; the Scanner covers all ${(snap.n_stocks ?? 0).toLocaleString("en-IN")} MSI stocks. Nifty overlay: [DATA NEEDED] (no benchmark series in breadth.json).</p>`;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function line(el, dates, series, hist) {
    const lg = document.createElement("div"); lg.className = "lg";
    lg.innerHTML = series.map(s => `<i style="background:${s.color}"></i>${esc(s.name)}`).join("");
    el.before(lg);
    const dark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    const ch = LightweightCharts.createChart(el, {autoSize: true, layout: {background: {color: "transparent"}, textColor: dark ? "#ece8f2" : "#212529"},
      grid: {vertLines: {color: css("--line")}, horzLines: {color: css("--line")}}, rightPriceScale: {borderColor: css("--line")}, timeScale: {borderColor: css("--line")}});
    series.forEach(s => {
      const sr = hist ? ch.addHistogramSeries({color: s.color, priceFormat: {type: "volume"}}) : ch.addLineSeries({color: s.color, lineWidth: 2, priceLineVisible: false});
      const pts = []; dates.forEach((d, i) => { const v = s.values ? s.values[i] : null; if (v !== null && v !== undefined && !Number.isNaN(v)) pts.push({time: d, value: v}); });
      sr.setData(pts);
    });
    ch.timeScale().fitContent(); return ch;
  }
  const g = k => br[k] || [];
  const P = "#6E2A8F", GR = "#5B5B5B", UP = "#297F02", DN = "#D52536";
  line(document.getElementById("c1"), dates, [{name: "% > 50-DMA", values: g("pct_above_50"), color: P}, {name: "% > 200-DMA", values: g("pct_above_200"), color: GR}]);
  line(document.getElementById("c2"), dates, [{name: "% > 40-DMA", values: g("pct_above_40"), color: P}]);
  line(document.getElementById("c3"), dates, [{name: "Advancers", values: g("adv"), color: UP}, {name: "Decliners", values: g("dec"), color: DN}], true);
  line(document.getElementById("c4"), dates, [{name: "New highs", values: g("new_hi"), color: UP}, {name: "New lows", values: g("new_lo"), color: DN}], true);
})();
