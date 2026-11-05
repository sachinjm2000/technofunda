/* Scanner state hygiene (UMD). Browser: window.ScanState; Node: module.exports.
   Everything that arrives from the URL (?f=) or localStorage is untrusted: sanitizeState/sanitizeExpr keep only known
   columns + allowed operators, coerce numeric-typed values to finite numbers and cap sizes. condText / valHtml build the
   Logic-builder strings; valHtml escapes every interpolated value (inputs get value="..." only via esc()). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(); else root.ScanState = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const MAXG = 8, MAXC = 20, MAXV = 100, MAXS = 200;
  const OPS = [">=", "<=", ">", "<", "=", "!=", "between", "in", "not_in", "contains", "is_true", "is_false"];
  const OPS_BY = {num: [">=", "<=", ">", "<", "=", "!=", "between", "in", "not_in"], bool: ["is_true", "is_false"],
    str: ["contains", "=", "!=", "in", "not_in"], enum: ["in", "not_in", "=", "!="]};
  const esc = s => String(s ?? "").replace(/[&<>"'`]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;"}[c]));
  const isObj = o => o !== null && typeof o === "object" && !Array.isArray(o);
  const fin = v => (typeof v === "number" && Number.isFinite(v)) ? v : null;
  const str = v => (typeof v === "string") ? v.slice(0, MAXS) : null;

  // ctx: {types: {col: 'num'|'bool'|'str'|'enum'}, enums?: {col: [allowed values]}, ctrls: {...}}
  function cleanCond(k, ctx) {
    if (!isObj(k) || typeof k.col !== "string" || typeof k.op !== "string") return null;
    const t = ctx.types[k.col];
    if (!t || !Object.prototype.hasOwnProperty.call(ctx.types, k.col)) return null;
    if (!OPS.includes(k.op) || !(OPS_BY[t] || []).includes(k.op)) return null;
    if (k.op === "is_true" || k.op === "is_false") return {col: k.col, op: k.op};
    const allowed = t === "enum" && ctx.enums && ctx.enums[k.col] ? new Set(ctx.enums[k.col]) : null;   // enum columns: values must be known options
    const one = t === "num" ? fin : (v => { const x = str(v); return x !== null && (!allowed || allowed.has(x)) ? x : null; });
    if (k.op === "between") {
      if (t !== "num") return null;
      const a = Array.isArray(k.value) ? k.value : (isObj(k.value) ? [k.value.min, k.value.max] : null);
      if (!a) return null;
      const lo = fin(a[0]), hi = fin(a[1]);
      return lo === null && hi === null ? null : {col: k.col, op: "between", value: [lo, hi]};
    }
    if (k.op === "in" || k.op === "not_in") {
      const a = (Array.isArray(k.value) ? k.value : []).slice(0, MAXV).map(one).filter(v => v !== null);
      return a.length ? {col: k.col, op: k.op, value: a} : null;
    }
    const v = one(k.value);
    return v === null || (t !== "num" && v === "") ? null : {col: k.col, op: k.op, value: v};
  }
  let dropped = 0;      // count of rejected pieces during the current sanitize call
  function sanitizeExpr(e, ctx) {
    if (!isObj(e) || !Array.isArray(e.groups)) { if (e !== null && e !== undefined) dropped++; return null; }
    const groups = [];
    if (e.groups.length > MAXG) dropped++;
    for (const g of e.groups.slice(0, MAXG)) {
      if (!isObj(g) || !Array.isArray(g.conditions)) { dropped++; continue; }
      if (g.conditions.length > MAXC) dropped++;
      const conditions = g.conditions.slice(0, MAXC).map(k => cleanCond(k, ctx)).filter(Boolean);
      dropped += Math.min(g.conditions.length, MAXC) - conditions.length;
      if (!conditions.length) continue;
      const o = {combine: g.combine === "any" || g.match === "any" ? "any" : "all", conditions};
      if (g.enabled === false) o.enabled = false;
      groups.push(o);
    }
    return groups.length ? {join: e.join === "any" ? "any" : "all", groups} : null;
  }
  // ctrls: {id: {kind, opts?: [[v,label]...], max?}}
  function cleanPanelVal(c, v) {
    switch (c.kind) {
      case "txt": return str(v) === null ? null : v.slice(0, 100);
      case "gte": case "sel": return fin(v);
      case "chips": { const n = fin(v); return n !== null && (c.opts || []).some(o => o[0] === n) ? n : null; }
      case "rng": return Array.isArray(v) ? [fin(v[0]), fin(v[1])] : null;
      case "yn": return v === "y" || v === "n" ? v : null;
      case "multi": case "mchips": {
        if (!Array.isArray(v)) return null;
        const ok = new Set((c.opts || []).map(o => o[0]));
        return v.slice(0, c.max || MAXV).filter(x => typeof x === "string" && ok.has(x));
      }
    }
    return null;
  }
  // -> {v, x, c} (all sanitised) or null when o is not an object
  function sanitizeState(o, ctx) {
    if (!isObj(o)) return null;
    dropped = 0;
    const v = {};
    if (isObj(o.v)) for (const id of Object.keys(o.v)) {
      if (!Object.prototype.hasOwnProperty.call(ctx.ctrls, id)) { dropped++; continue; }
      const c = cleanPanelVal(ctx.ctrls[id], o.v[id]);
      if (c !== null && !(Array.isArray(c) && c.length === 0)) v[id] = c; else if (o.v[id] !== null && !(Array.isArray(o.v[id]) && !o.v[id].length)) dropped++;
    }
    const x = sanitizeExpr(o.x, ctx);
    return {v, x, c: typeof o.c === "string" && /^[\w-]{1,64}$/.test(o.c) ? o.c : "all", dropped};
  }
  const opTxt = {">=": "≥", "<=": "≤", "!=": "≠", "between": "in", "in": "∈", "not_in": "∉", "contains": "~"};
  // plain text (callers must esc() it before any innerHTML)
  function condText(k, fieldLabel) {
    const fl = fieldLabel || (x => x);
    return `${fl(k.col)} ${k.op === "is_true" ? "= Yes" : k.op === "is_false" ? "= No" : `${opTxt[k.op] || k.op} ${Array.isArray(k.value) ? k.value.map(v => v ?? "…").join(k.op === "between" ? "–" : "/") : k.value}`}`;
  }
  // HTML for the value cell of a Logic-builder condition. f = field meta {type, enum}; d = data-attrs string (built by caller from integers)
  function valHtml(k, d, f) {
    f = f || {};
    const n0 = v => v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
    const val = v => esc(n0(v) ? "" : v);
    if (k.op === "is_true" || k.op === "is_false") return "";
    if (k.op === "between") { const v = Array.isArray(k.value) ? k.value : [null, null];
      return `<input type="number" step="any" ${d} data-vi="0" value="${val(v[0])}" placeholder="min" aria-label="min"><input type="number" step="any" ${d} data-vi="1" value="${val(v[1])}" placeholder="max" aria-label="max">`; }
    if ((k.op === "in" || k.op === "not_in") && f.enum) { const v = new Set((Array.isArray(k.value) ? k.value : []).map(String));
      return `<select multiple size="4" ${d} data-vm="1" aria-label="values">${f.enum.map(([x, l]) => `<option value="${esc(x)}" ${v.has(String(x)) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`; }
    if ((k.op === "=" || k.op === "!=") && f.enum && f.type === "num") return `<select ${d} data-vs="1" aria-label="value"><option value=""></option>${f.enum.map(([x, l]) => `<option value="${esc(x)}" ${k.value === x ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    if (k.op === "in" || k.op === "not_in") return `<input type="text" ${d} data-vl="1" value="${esc((Array.isArray(k.value) ? k.value : []).join(", "))}" placeholder="a, b, c" aria-label="values (comma separated)">`;
    if (f.type === "num") return `<input type="number" step="any" ${d} data-vn="1" value="${val(k.value)}" aria-label="value">`;
    return `<input type="text" ${d} data-vt="1" value="${esc(k.value ?? "")}" aria-label="value">`;
  }
  return {MAXG, MAXC, MAXV, OPS, esc, sanitizeExpr, sanitizeState, condText, valHtml};
});
