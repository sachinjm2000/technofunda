/* Scan filter-expression evaluator (UMD). Browser: window.ScanEval; Node: module.exports.
   condition {col, op, value}; ops: >= <= > < = (== alias) != between in not_in contains is_true is_false
   group {combine:'all'|'any', conditions:[...], enabled?}; expression {groups:[...], join:'all'|'any'}
   Semantics follow the reference filterExpressionEvaluator.js: null/undefined never matches a numeric,
   range, equality, 'in' or 'contains' test; 'not_in' (categorical exclude) passes a null value.
   A row value may be an array (tag list): 'in' = any overlap, 'not_in' = no overlap.
   Booleans may be 1/0 (scan.json) or true/false. An empty group/expression matches everything. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(); else root.ScanEval = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const isNull = v => v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
  const truthy = v => v === true || v === 1;
  const falsy = v => v === false || v === 0;
  const eq = (a, b) => {
    if (typeof b === "boolean") return b ? truthy(a) : falsy(a);
    if (typeof a === "string" && typeof b === "string") return a.toLowerCase() === b.toLowerCase();
    return a === b;
  };
  const OPS = {
    ">=": (v, x) => typeof v === "number" && v >= x,
    "<=": (v, x) => typeof v === "number" && v <= x,
    ">": (v, x) => typeof v === "number" && v > x,
    "<": (v, x) => typeof v === "number" && v < x,
    "=": (v, x) => eq(v, x),
    "!=": (v, x) => !eq(v, x),
    "between": (v, x) => {
      if (typeof v !== "number") return false;
      const lo = Array.isArray(x) ? x[0] : x && x.min, hi = Array.isArray(x) ? x[1] : x && x.max;
      return (isNull(lo) || v >= lo) && (isNull(hi) || v <= hi);
    },
    "in": (v, x) => { const xs = Array.isArray(x) ? x : [x]; return Array.isArray(v) ? v.some(a => xs.some(y => eq(a, y))) : xs.some(y => eq(v, y)); },
    "contains": (v, x) => String(v).toLowerCase().includes(String(x ?? "").toLowerCase()),
    "is_true": v => truthy(v),
    "is_false": v => falsy(v),
  };
  OPS["=="] = OPS["="];
  const OP_LIST = [">=", "<=", ">", "<", "=", "!=", "between", "in", "not_in", "contains", "is_true", "is_false"];
  function evalCondition(row, c) {
    if (!c || !c.op) return false;
    const v = row ? row[c.col] : undefined;
    if (c.op === "not_in") return isNull(v) || !OPS.in(v, c.value);
    const f = OPS[c.op];
    if (!f || isNull(v)) return false;
    return f(v, c.value);
  }
  function evalGroup(row, g) {
    if (!g || g.enabled === false) return false;
    const cs = g.conditions || [];
    if (!cs.length) return true;
    return (g.combine || g.match) === "any" ? cs.some(c => evalCondition(row, c)) : cs.every(c => evalCondition(row, c));
  }
  function evalExpression(row, e) {
    if (!e) return true;
    const gs = (e.groups || []).filter(g => g && g.enabled !== false);
    if (!gs.length) return true;
    return e.join === "any" ? gs.some(g => evalGroup(row, g)) : gs.every(g => evalGroup(row, g));
  }
  // preset from scan_presets.json -> single-group expression (missing column => matches nothing, as in python)
  function presetExpr(p) { return {groups: [{combine: p.combine || "all", conditions: p.conditions || []}], join: "all"}; }
  function presetMatch(row, p) { return !p.disabled && (p.conditions || []).length > 0 && evalGroup(row, {combine: p.combine || "all", conditions: p.conditions}); }
  const filter = (rows, e) => rows.filter(r => evalExpression(r, e));
  const count = (rows, e) => rows.reduce((n, r) => n + (evalExpression(r, e) ? 1 : 0), 0);
  return {OPS: OP_LIST, evalCondition, evalGroup, evalExpression, presetExpr, presetMatch, filter, count};
});
