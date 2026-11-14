/* SEPA-style column filter grammar (UMD). Browser: window.ColFilter; Node: module.exports.
   Box = comma-separated parts, OR within a box. Part: optional leading "!" negates;
   >=,<=,≥,≤,>,< n | a-b / a to b / a..b (inclusive, either order) | =x exact | bare number (numeric equality) | text substring (case-insensitive).
   Numeric comparisons never match non-numeric/NaN cells. Empty parse = no filter (parse returns null). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(); else root.ColFilter = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const N = "-?\\d*\\.?\\d+";
  const RE_NUM = new RegExp("^" + N + "$"), RE_CMP = new RegExp("^(>=|<=|≥|≤|>|<)\\s*(" + N + ")$");
  const RE_RANGE = new RegExp("^(" + N + ")\\s*(?:to|\\.\\.|-)\\s*(" + N + ")$", "i");
  // cell numeric value: raw number, else parseFloat(text with [,%+₹] removed); NaN never matches numeric tests
  const numOf = (raw, txt) => typeof raw === "number" ? raw : parseFloat(String(txt ?? "").replace(/[,%+₹]/g, ""));
  function parsePart(s) {
    s = s.trim(); let neg = false;
    if (s[0] === "!") { neg = true; s = s.slice(1).trim(); }
    if (!s) return null;
    let m, t;
    if ((m = RE_CMP.exec(s))) {
      const n = +m[2], op = m[1];
      t = (raw, txt) => { const v = numOf(raw, txt); return !Number.isNaN(v) && (op === ">=" || op === "≥" ? v >= n : op === "<=" || op === "≤" ? v <= n : op === ">" ? v > n : v < n); };
    } else if (s[0] === "=") {
      const x = s.slice(1).trim().toLowerCase(), xn = parseFloat(x);
      t = (raw, txt) => String(txt ?? "").trim().toLowerCase() === x || (!Number.isNaN(xn) && numOf(raw, txt) === xn);
    } else if ((m = RE_RANGE.exec(s))) {
      const a = Math.min(+m[1], +m[2]), b = Math.max(+m[1], +m[2]);
      t = (raw, txt) => { const v = numOf(raw, txt); return !Number.isNaN(v) && v >= a && v <= b; };
    } else if (RE_NUM.test(s)) {
      const n = +s, low = s.toLowerCase();
      t = (raw, txt) => { const v = numOf(raw, txt); return !Number.isNaN(v) ? v === n : String(txt ?? "").toLowerCase().includes(low); };
    } else {
      const low = s.toLowerCase();
      t = (raw, txt) => String(txt ?? "").toLowerCase().includes(low);
    }
    return {neg, t};
  }
  function parse(box) {
    const parts = String(box ?? "").split(",").map(parsePart).filter(Boolean);
    return parts.length ? parts : null;
  }
  // pass iff (no positives OR some positive matches) AND no negative matches
  function test(parsed, raw, txt) {
    if (!parsed) return true;
    const pos = parsed.filter(p => !p.neg), neg = parsed.filter(p => p.neg);
    if (neg.some(p => p.t(raw, txt))) return false;
    return !pos.length || pos.some(p => p.t(raw, txt));
  }
  return {parse, test, match: (box, raw, txt) => test(parse(box), raw, txt)};
});
