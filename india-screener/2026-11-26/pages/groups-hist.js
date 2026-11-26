window.GP = window.GP || {tabs: {}};
GP.tabs.hist = el => {
  const {esc} = ISC, D = GP.D, trim = GP.trim, N = D.snapshot.n_groups;
  const rows = [...D.groups].sort((a, b) => (a.MsiRank ?? 1e9) - (b.MsiRank ?? 1e9));
  const cell = v => v == null ? `<td class="c">—</td>` : `<td class="c"><span class="cell" style="background:color-mix(in srgb,var(--primary) ${Math.round((1 - (v - 1) / (N - 1)) * 80)}%,var(--card));color:${v <= N * .45 ? "#fff" : "var(--text)"}">${v}</span></td>`;
  el.innerHTML = `<p class="muted small">MSI group rank (1 = best) now, 1 week, 3 months and 6 months ago; darker = better. ${rows.length} groups.</p><div class="tablewrap"><table class="heat"><thead><tr><th>Group</th><th>Now</th><th>1w</th><th>3m</th><th>6m</th></tr></thead><tbody>
    ${rows.map(g => `<tr><td>${ISC.groupLink(g.Group, null, {destination: "stock"})}</td>${[g.MsiRank, g.Rank1w, g.Rank3m, g.Rank6m].map(cell).join("")}</tr>`).join("")}</tbody></table></div>`;
};
