// Unit test: extractJson tolerates trailing/leading text and fences.
const fs = require("fs");
const src = fs.readFileSync(__dirname + "/../js/app-core.js", "utf8");
const start = src.indexOf("function extractJson");
const end = src.indexOf("\n}\n", src.indexOf("function repairTruncatedJson")) + 3;
const extractJson = new Function(src.slice(start, end) + "; return extractJson;")();
const cases = [
  ['{"a":"x}\\"y","b":[1]}\n\nNote: done {oops}', (r) => r.b[0] === 1 && r.a === 'x}"y'],
  ['Here:\n```json\n{"a":1}\n```\n{"b":2}', (r) => r.a === 1],
  ['```json\n{"a":1}\n```', (r) => r.a === 1],
  ['{"phases":[{"x":1},{"x":2},{"x', (r) => r.phases.length >= 1],
];
let bad = 0;
for (const [t, ok] of cases) {
  try { if (!ok(extractJson(t))) { bad++; console.log("FAIL", t); } }
  catch (e) { bad++; console.log("THROW", t, e.message); }
}
console.log(bad ? `extractjson: ${bad} failed` : "extractjson: OK");
process.exit(bad ? 1 : 0);
