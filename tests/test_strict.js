const fs = require('fs');
const analyzerCode = fs.readFileSync('../analyzer.js', 'utf8');

// evaluate analyzer in global context
eval(analyzerCode);

const tests = [
    {
        name: 'Test 1',
        text: "Vegastars Casino is popular. Vegastars Casino has pokies. Vegastars is offshore.",
        keywords: ["vegastars", "vegastars casino"],
        expected: { "vegastars": 1, "vegastars casino": 2 }
    },
    {
        name: 'Test 2',
        text: "Vegastars Australia review covers Vegastars Casino bonuses.",
        keywords: ["vegastars", "vegastars australia", "vegastars casino"],
        expected: { "vegastars": 0, "vegastars australia": 1, "vegastars casino": 1 }
    },
    {
        name: 'Test 3',
        text: "Best Vegastars games and Vegastars pokies.",
        keywords: ["vegastars", "vegastars pokies"],
        expected: { "vegastars": 1, "vegastars pokies": 1 }
    },
    {
        name: 'Test 4',
        text: "vegastars, vegastars. vegastars!",
        keywords: ["vegastars"],
        expected: { "vegastars": 3 }
    },
    {
        name: 'Test 5',
        text: "vegastarscasino is not the same as vegastars casino.",
        keywords: ["vegastars", "vegastars casino"],
        expected: { "vegastars": 0, "vegastars casino": 1 }
    }
];

const settings = {
    matchMode: 'exact',
    caseMode: 'insensitive',
    punctuationMode: 'ignore',
    countMode: 'strict',
    targetVolume: 0
};

let allPassed = true;

for (const t of tests) {
    const keywords = t.keywords.map(kw => ({
        id: kw,
        keyword: kw,
        min: 1, max: 10, type: 'primary'
    }));

    const res = SeoKeywordAnalyzer.analyzeDocument(t.text, keywords, settings);

    let passed = true;
    for (const [kw, expectedCount] of Object.entries(t.expected)) {
        const row = res.rows.find(r => r.keyword === kw);
        const count = row ? row.found : 0;
        if (count !== expectedCount) {
            console.log(`Failed ${t.name}: expected ${expectedCount} for "${kw}", got ${count}`);
            passed = false;
        }
    }
    if (!passed) allPassed = false;
}

if (allPassed) {
    console.log("All tests passed successfully!");
} else {
    console.log("Some tests failed.");
}
