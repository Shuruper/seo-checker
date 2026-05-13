const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const code = fs.readFileSync("analyzer.js", "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const analyzer = sandbox.window.SeoKeywordAnalyzer;

const keywords = analyzer.parseKeywordInput([
  "vegastars | 2 | 3 | primary | brand",
  "vegastars casino | 1 | 1 | primary | phrase",
  "star | 1 | 2 | secondary | should not match inside vegastars",
  "wrong casino | 0 | 0 | forbidden | foreign intent"
].join("\n"));

const result = analyzer.analyzeDocument(
  "Vegastars casino is live. Vegastars has pokies. Wrong casino is unrelated.",
  keywords,
  {
    matchMode: "exact",
    caseMode: "insensitive",
    punctuationMode: "ignore",
    targetVolume: 120
  }
);

const byKeyword = Object.fromEntries(result.rows.map((row) => [row.keyword, row]));

assert.equal(byKeyword["vegastars"].found, 1);
assert.equal(byKeyword["vegastars"].status, "Low");
assert.equal(byKeyword["vegastars casino"].found, 1);
assert.equal(byKeyword["star"].found, 0);
assert.equal(byKeyword["star"].status, "Missing");
assert.equal(byKeyword["wrong casino"].found, 1);
assert.equal(byKeyword["wrong casino"].status, "Forbidden");
assert.equal(result.metrics.words, 11);
assert.ok(result.issues.some((issue) => issue.includes("запрещенный")));

const overlapText = analyzer.normalizeForMatching(
  "Vegastars Casino, vegastars-casino and casino vegastars are different.",
  {
    matchMode: "exact",
    caseMode: "insensitive",
    punctuationMode: "ignore"
  }
);

assert.equal(
  analyzer.countKeyword(overlapText, "vegastars casino", {
    matchMode: "exact",
    caseMode: "insensitive",
    punctuationMode: "ignore"
  }),
  2
);

assert.equal(
  analyzer.countKeyword(overlapText, "casino vegastars", {
    matchMode: "exact",
    caseMode: "insensitive",
    punctuationMode: "ignore"
  }),
  1
);

const articleText = analyzer.normalizeForMatching(
  [
    "# Vegastars Casino Australia: Pokies, Live Tables and Welcome Stack",
    "Vegastars Casino welcomes Aussie punters.",
    "## What Makes Vegastars Casino Special",
    "Vegastars Casino positions itself as a premium offshore brand.",
    "The governing-law structure says vegastars online casino exposes clear legal forums.",
    "This line contains vega stars australia as separate words."
  ].join("\n"),
  {
    matchMode: "exact",
    caseMode: "insensitive",
    punctuationMode: "ignore"
  }
);

assert.equal(
  analyzer.countKeyword(articleText, "vegastars casino", {
    matchMode: "exact",
    caseMode: "insensitive",
    punctuationMode: "ignore"
  }),
  4
);

assert.equal(
  analyzer.countKeyword(articleText, "vegastars online casino", {
    matchMode: "exact",
    caseMode: "insensitive",
    punctuationMode: "ignore"
  }),
  1
);

assert.equal(
  analyzer.countKeyword(articleText, "vega stars australia", {
    matchMode: "exact",
    caseMode: "insensitive",
    punctuationMode: "ignore"
  }),
  1
);

const seoRows = analyzer.analyzeDocument(
  [
    "Vegastars Casino welcomes players.",
    "Vegastars Australia is mentioned.",
    "Vegastars stands alone here."
  ].join(" "),
  analyzer.parseKeywordInput([
    "vegastars | 1 | 1 | primary | standalone brand",
    "vegastars casino | 1 | 1 | primary | phrase",
    "vegastars australia | 1 | 1 | secondary | phrase"
  ].join("\n")),
  {
    matchMode: "exact",
    caseMode: "insensitive",
    punctuationMode: "ignore",
    countMode: "longest"
  }
).rows;

const seoByKeyword = Object.fromEntries(seoRows.map((row) => [row.keyword, row]));
assert.equal(seoByKeyword["vegastars"].found, 1);
assert.equal(seoByKeyword["vegastars casino"].found, 1);
assert.equal(seoByKeyword["vegastars australia"].found, 1);

console.log("analyzer tests passed");
