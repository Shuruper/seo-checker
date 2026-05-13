(function () {
  const STORAGE_KEY = "seoTextCheckerApp";
  const AUTO_HIGHLIGHT_TEXT_LIMIT = 45000;
  const AUTO_HIGHLIGHT_KEYWORD_LIMIT = 90;
  const AUTO_HIGHLIGHT_MATCH_LIMIT = 700;

  const state = {
    rows: [],
    foreignRows: [],
    blocks: [],
    issues: [],
    metrics: null
  };

  const els = {
    editor: document.getElementById("editor"),
    keywordInput: document.getElementById("keywordInput"),
    sheetPasteInput: document.getElementById("sheetPasteInput"),
    keywordPreviewRows: document.getElementById("keywordPreviewRows"),
    keywordPreviewState: document.getElementById("keywordPreviewState"),
    pageColumn: document.getElementById("pageColumn"),
    keywordColumn: document.getElementById("keywordColumn"),
    volumeColumn: document.getElementById("volumeColumn"),
    commentColumn: document.getElementById("commentColumn"),
    textVolumeColumn: document.getElementById("textVolumeColumn"),
    requiredColumn: document.getElementById("requiredColumn"),
    targetVolume: document.getElementById("targetVolume"),
    matchMode: document.getElementById("matchMode"),
    countMode: document.getElementById("countMode"),
    caseMode: document.getElementById("caseMode"),
    punctuationMode: document.getElementById("punctuationMode"),
    keywordRows: document.getElementById("keywordRows"),
    keywordTotal: document.getElementById("keywordTotal"),
    structureTree: document.getElementById("structureTree"),
    issuesList: document.getElementById("issuesList"),
    allSemanticsInput: document.getElementById("allSemanticsInput"),
    foreignKeywordRows: document.getElementById("foreignKeywordRows"),
    foreignKeywordState: document.getElementById("foreignKeywordState")
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindTabs();
    bindActions();
    loadState();
    analyze();
  }

  function bindTabs() {
    document.querySelectorAll(".tab").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tab, .panel").forEach((node) => node.classList.remove("active"));
        button.classList.add("active");
        document.getElementById(button.dataset.tab).classList.add("active");
      });
    });
  }

  function bindActions() {
    document.getElementById("analyzeBtn").addEventListener("click", analyze);
    document.getElementById("inferBtn").addEventListener("click", inferStructure);
    document.getElementById("clearBtn").addEventListener("click", clearEditor);
    document.getElementById("sampleBtn").addEventListener("click", loadSample);
    document.getElementById("demoKeysBtn").addEventListener("click", loadDemoKeys);
    document.getElementById("saveBtn").addEventListener("click", saveState);
    document.getElementById("parseSheetBtn").addEventListener("click", parseSheetPaste);
    document.getElementById("clearSheetBtn").addEventListener("click", clearSheetKeywords);
    document.getElementById("parseAllSemanticsBtn").addEventListener("click", analyze);
    document.getElementById("clearAllSemanticsBtn").addEventListener("click", clearAllSemantics);
    document.getElementById("markKeywordsBtn").addEventListener("click", markKeywords);
    document.getElementById("clearMarksBtn").addEventListener("click", clearMarks);
    document.getElementById("csvBtn").addEventListener("click", exportCsv);
    document.getElementById("copyHtmlBtn").addEventListener("click", copyHtml);
    document.getElementById("copyTextBtn").addEventListener("click", copyText);

    els.editor.addEventListener("paste", handlePaste);
    els.sheetPasteInput.addEventListener("paste", () => {
      setTimeout(parseSheetPaste, 0);
    });
    els.sheetPasteInput.addEventListener("input", debounce(parseSheetPaste, 250));
    els.allSemanticsInput.addEventListener("input", debounce(() => {
      saveSettingsState();
      analyze();
    }, 400));
    [els.pageColumn, els.keywordColumn, els.volumeColumn, els.commentColumn, els.textVolumeColumn, els.requiredColumn]
      .forEach((select) => select.addEventListener("change", parseSheetPaste));
  }

  function handlePaste(event) {
    const html = event.clipboardData?.getData("text/html");
    const text = event.clipboardData?.getData("text/plain");
    if (!html && text) {
      event.preventDefault();
      document.execCommand("insertHTML", false, inferHtmlFromText(text));
    }
  }

  function analyze() {
    clearMarks();
    const blocks = getBlocks();
    const text = getAnalysisText();
    const keywords = getKeywordRules();
    const result = SeoKeywordAnalyzer.analyzeDocument(text, keywords, getSettings());
    const foreignRows = findForeignKeywords(text, result.rows);
    const structureIssues = analyzeStructure(blocks);
    const contentIssues = analyzeContentRules(blocks, result.rows, result.metrics);

    state.rows = result.rows;
    state.foreignRows = foreignRows;
    state.blocks = blocks;
    state.metrics = result.metrics;
    state.issues = [
      ...result.issues,
      ...foreignRows.map((row) => `Найден чужой ключ из общей семантики: "${row.keyword}" (${row.found}).`),
      ...structureIssues,
      ...contentIssues
    ];

    renderSummary(result.summary, blocks, state.issues);
    renderKeywords(result.rows);
    renderStructure(blocks);
    renderIssues(state.issues);
    renderForeignKeywords(foreignRows);
    markKeywords({ automatic: true });
    markForeignKeywords({ automatic: true });
    saveState();
  }

  function getBlocks() {
    const blocks = [];
    const rootBlocks = Array.from(els.editor.children);
    let index = 0;

    if (looksLikeMarkdownText(els.editor.innerText)) {
      return getMarkdownBlocks(els.editor.innerText);
    }

    rootBlocks.forEach((node) => {
      collectBlock(node, blocks, () => index++);
    });

    if (!blocks.length) {
      const text = els.editor.innerText.trim();
      if (text) blocks.push({ type: "paragraph", tag: "P", text, index: 0, words: countWords(text) });
    }

    return blocks;
  }

  function getAnalysisText() {
    return els.editor.innerText
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function looksLikeMarkdownText(text) {
    return /(^|\n)#{1,6}\s+\S/.test(text) || /(^|\n)\|.+\|/.test(text);
  }

  function getMarkdownBlocks(text) {
    const blocks = [];
    let index = 0;
    text
      .replace(/\r/g, "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        if (/^\[g-toc\]$/i.test(line)) return;

        const heading = line.match(/^(#{1,6})\s+(.+)/);
        if (heading) {
          const level = heading[1].length;
          pushBlock(blocks, "heading", `H${level}`, heading[2], index++);
          return;
        }

        const bullet = line.match(/^[-*•]\s+(.+)/);
        const ordered = line.match(/^\d+[.)]\s+(.+)/);
        if (bullet || ordered) {
          pushBlock(blocks, bullet ? "ul-li" : "ol-li", "LI", (bullet || ordered)[1], index++);
          return;
        }

        if (/^\|(.+)\|$/.test(line)) {
          if (/^\|[-:| ]+\|$/.test(line)) return;
          pushBlock(blocks, "table", "TABLE", line.replace(/\|/g, " ").trim(), index++);
          return;
        }

        pushBlock(blocks, "paragraph", "P", line, index++);
      });
    return blocks;
  }

  function collectBlock(node, blocks, nextIndex) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toUpperCase();
    if (/^H[1-4]$/.test(tag)) {
      pushBlock(blocks, "heading", tag, node.innerText, nextIndex());
      return;
    }

    if (tag === "UL" || tag === "OL") {
      Array.from(node.children).forEach((li) => {
        if (li.tagName?.toUpperCase() === "LI") {
          pushBlock(blocks, tag === "UL" ? "ul-li" : "ol-li", "LI", li.innerText, nextIndex());
        }
      });
      return;
    }

    if (tag === "LI") {
      pushBlock(blocks, "li", "LI", node.innerText, nextIndex());
      return;
    }

    if (tag === "TABLE") {
      pushBlock(blocks, "table", "TABLE", node.innerText, nextIndex());
      return;
    }

    if (tag === "P" || tag === "BLOCKQUOTE" || (tag === "DIV" && !node.querySelector("p, h1, h2, h3, h4, h5, h6, ul, ol, table"))) {
      const text = node.innerText.trim();
      if (text) pushBlock(blocks, tag === "BLOCKQUOTE" ? "quote" : "paragraph", tag, text, nextIndex());
      return;
    }

    Array.from(node.children).forEach((child) => collectBlock(child, blocks, nextIndex));
  }

  function pushBlock(blocks, type, tag, text, index) {
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (!cleanText) return;
    blocks.push({
      type,
      tag,
      level: /^H[1-4]$/.test(tag) ? Number(tag.slice(1)) : null,
      text: cleanText,
      index,
      words: countWords(cleanText)
    });
  }

  function analyzeStructure(blocks) {
    const issues = [];
    const headings = blocks.filter((block) => block.level);
    const h1 = headings.filter((block) => block.level === 1);

    if (!h1.length) issues.push(t("issue_no_h1"));
    if (h1.length > 1) issues.push(t("issue_multi_h1", { count: h1.length }));

    headings.forEach((heading, idx) => {
      if (!heading.text.trim()) issues.push(t("issue_empty_tag", { tag: heading.tag, block: heading.index + 1 }));
      if (heading.words > 14 && heading.level >= 2) {
        issues.push(t("issue_tag_too_long", { tag: heading.tag, words: heading.words }));
      }
      const prev = headings[idx - 1];
      if (prev && heading.level > prev.level + 1) {
        issues.push(t("issue_hierarchy", { tag: heading.tag, prevTag: prev.tag }));
      }
    });

    return issues;
  }

  function analyzeContentRules(blocks, rows, metrics) {
    const issues = [];
    const primary = rows.find((row) => row.type === "primary");
    const h1Text = blocks.find((block) => block.level === 1)?.text || "";
    const firstParagraph = blocks.find((block) => block.type === "paragraph")?.text || "";

    if (primary) {
      const settings = getSettings();
      if (h1Text && SeoKeywordAnalyzer.findKeywordMatches(h1Text, primary.keyword, settings).length === 0) {
        issues.push(t("issue_h1_missing", { key: primary.keyword }));
      }
      if (firstParagraph && SeoKeywordAnalyzer.findKeywordMatches(firstParagraph, primary.keyword, settings).length === 0) {
        issues.push(t("issue_p1_missing", { key: primary.keyword }));
      }
    }

    blocks
      .filter((block) => block.type === "paragraph" && block.words > 120)
      .forEach((block) => issues.push(t("issue_p_too_long", { block: block.index + 1, words: block.words })));

    if (metrics.words < 100) {
      issues.push(t("issue_short_text"));
    }

    return issues;
  }

  function inferStructure() {
    const text = els.editor.innerText.trim();
    if (!text) return;
    els.editor.innerHTML = inferHtmlFromText(text);
    analyze();
  }

  function inferHtmlFromText(text) {
    const lines = text
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let html = "";
    let listType = null;
    let inTable = false;
    let headingCount = 0;

    const closeBlocks = () => {
      if (listType) { html += `</${listType}>`; listType = null; }
      if (inTable) { html += `</tbody></table></div>`; inTable = false; }
    };

    lines.forEach((line, index) => {
      if (/^\[g-toc\]$/i.test(line)) return;

      if (/^\|(.+)\|$/.test(line)) {
        if (/^\|[-:| ]+\|$/.test(line)) return;

        if (!inTable) {
          closeBlocks();
          html += `<div class="tableWrap"><table><tbody>`;
          inTable = true;
        }

        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        html += `<tr>${cells.map(c => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`;
        return;
      }

      const bullet = line.match(/^[-*•]\s+(.+)/);
      const ordered = line.match(/^\d+[.)]\s+(.+)/);

      if (bullet || ordered) {
        const nextType = bullet ? "ul" : "ol";
        if (listType !== nextType) {
          closeBlocks();
          html += `<${nextType}>`;
          listType = nextType;
        }
        html += `<li>${escapeHtml((bullet || ordered)[1])}</li>`;
        return;
      }

      closeBlocks();

      const mdHeading = line.match(/^(#{1,6})\s+(.+)/);
      if (mdHeading) {
        const level = mdHeading[1].length;
        html += `<h${level}>${escapeHtml(mdHeading[2])}</h${level}>`;
        headingCount++;
        return;
      }

      const forced = line.match(/^(h[1-6])[:.)]\s+(.+)/i);
      if (forced) {
        html += `<${forced[1].toLowerCase()}>${escapeHtml(forced[2])}</${forced[1].toLowerCase()}>`;
        headingCount++;
        return;
      }

      const level = inferHeadingLevel(line, index, headingCount);
      if (level) {
        html += `<h${level}>${escapeHtml(line)}</h${level}>`;
        headingCount++;
      } else {
        html += `<p>${escapeHtml(line)}</p>`;
      }
    });

    closeBlocks();
    return html;
  }

  function inferHeadingLevel(line, index, headingCount) {
    const words = countWords(line);
    const hasSentenceEnd = /[.!?。]$/.test(line);
    const looksLikeQuestion = /\?$/.test(line);
    const short = words > 0 && words <= 9;
    const titleLike = short && !hasSentenceEnd;

    if (index === 0 && words <= 12) return 1;
    if (/^(introduction|intro|faq|conclusion|pros|cons|summary)$/i.test(line)) return 2;
    if (/^\d+(\.\d+)*\s+/.test(line) && short) return headingCount < 1 ? 1 : 2;
    if (looksLikeQuestion && words <= 12) return 2;
    if (titleLike && headingCount > 0) return words <= 5 ? 3 : 2;
    return null;
  }

  function renderSummary(summary, blocks, issues) {
    setText("charsWithSpaces", summary.charsWithSpaces);
    setText("charsNoSpaces", summary.charsNoSpaces);
    setText("wordsCount", summary.words);
    setText("blocksCount", blocks.length);
    setText("h1Count", blocks.filter((block) => block.level === 1).length);
    setText("listCount", blocks.filter((block) => block.tag === "LI").length);
    setText("okCount", summary.ok);
    setText("issueCount", issues.length);

    const volumeState = document.getElementById("volumeState");
    if (!summary.targetVolume) {
      volumeState.innerHTML = t("msg_no_target_volume");
      return;
    }
    const delta = summary.charsNoSpaces - summary.targetVolume;
    volumeState.innerHTML = t("msg_current_volume", { current: summary.charsNoSpaces, target: summary.targetVolume, delta: delta >= 0 ? "+" + delta : delta });
  }

  function renderKeywords(rows) {
    renderKeywordTotal(rows);

    if (!rows.length) {
      els.keywordRows.innerHTML = `<tr><td colspan="5" class="empty">${t("empty_keys")}</td></tr>`;
      return;
    }

    els.keywordRows.innerHTML = rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.keyword)}</strong>${row.comment ? `<br><small>${escapeHtml(row.comment)}</small>` : ""}</td>
        <td>${escapeHtml(row.requiredLabel)}</td>
        <td>${row.found}</td>
        <td><span class="badge ${statusClass(row.status)}">${statusLabel(row.status)}</span></td>
        <td>${row.density.toFixed(2)}%</td>
      </tr>
    `).join("");
  }

  function renderKeywordTotal(rows) {
    const total = rows.length;
    const ok = rows.filter((row) => row.status === "OK").length;
    const low = rows.filter((row) => row.status === "Low").length;
    const missing = rows.filter((row) => row.status === "Missing").length;
    const overused = rows.filter((row) => row.status === "Overused").length;
    const forbidden = rows.filter((row) => row.status === "Forbidden").length;
    const requiredTotal = rows.reduce((sum, row) => {
      if (row.type === "forbidden") return sum;
      return sum + (Number.isFinite(row.min) ? row.min : 0);
    }, 0);
    const foundTotal = rows.reduce((sum, row) => {
      if (row.type === "forbidden" || !Number.isFinite(row.min)) return sum;
      return sum + row.found;
    }, 0);

    els.keywordTotal.innerHTML = [
      `<span class="strongPill">${t("total_occurrences", { found: foundTotal, required: requiredTotal })}</span>`,
      `<span>${t("total_keys", { total })}</span>`,
      `<span>${t("keys_ok", { count: ok })}</span>`,
      `<span>${t("keys_low", { count: low })}</span>`,
      `<span>${t("keys_missing", { count: missing })}</span>`,
      `<span>${t("keys_overused", { count: overused })}</span>`,
      forbidden ? `<span>${t("keys_forbidden", { count: forbidden })}</span>` : ""
    ].filter(Boolean).join("");
  }

  function renderStructure(blocks) {
    if (!blocks.length) {
      els.structureTree.innerHTML = t("empty_structure");
      return;
    }

    els.structureTree.innerHTML = blocks.map((block) => {
      const label = block.level ? block.tag : block.tag === "LI" ? "LIST" : "P";
      const levelClass = block.level ? `level-${block.level}` : "";
      return `
        <div class="structureItem ${levelClass}">
          <strong>${label}</strong>${escapeHtml(block.text)}
          <small>${block.words} слов</small>
        </div>
      `;
    }).join("");
  }

  function renderIssues(issues) {
    els.issuesList.innerHTML = issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("");
  }

  function findForeignKeywords(text, currentRows) {
    const allEntries = parseAllSemanticsEntries(els.allSemanticsInput.value);
    if (!allEntries.length) return [];

    const settings = getSettings();
    const normalizedText = SeoKeywordAnalyzer.normalizeForMatching(text, settings);
    const allowed = new Set(currentRows.map((row) => normalizeKeywordIdentity(row.keyword)));
    const unique = new Map();

    allEntries.forEach((entry) => {
      const id = normalizeKeywordIdentity(entry.keyword);
      if (!id || unique.has(id)) return;
      unique.set(id, entry);
    });

    const accepted = [];
    const counts = new Map();
    const candidates = [];

    currentRows.forEach((row) => {
      getKeywordVariants(row.keyword).forEach((variant) => {
        const id = normalizeKeywordIdentity(row.keyword);
        SeoKeywordAnalyzer.findKeywordMatches(normalizedText, variant, settings).forEach((match) => {
          candidates.push({
            ...match,
            id,
            keyword: row.keyword,
            allowed: true,
            words: countWords(variant)
          });
        });
      });
    });

    Array.from(unique.entries()).forEach(([id, entry]) => {
      const keyword = entry.keyword;
      SeoKeywordAnalyzer.findKeywordMatches(normalizedText, keyword, settings).forEach((match) => {
        candidates.push({
          ...match,
          id,
          keyword,
          sourceLine: entry.line,
          allowed: allowed.has(id),
          words: countWords(keyword)
        });
      });
    });

    candidates
      .sort((a, b) => {
        if (a.words !== b.words) return b.words - a.words;
        if (a.text.length !== b.text.length) return b.text.length - a.text.length;
        if (a.allowed !== b.allowed) return a.allowed ? -1 : 1;
        return a.start - b.start;
      })
      .forEach((match) => {
        if (accepted.some((item) => match.start < item.end && match.end > item.start)) return;
        accepted.push(match);
        if (match.allowed) return;
        const previous = counts.get(match.id) || { id: match.id, keyword: match.keyword, sourceLine: match.sourceLine, found: 0 };
        previous.found += 1;
        counts.set(match.id, previous);
      });

    return Array.from(counts.values())
      .map((row) => ({
        ...row,
        status: "Foreign",
        density: state.metrics?.words ? (row.found / state.metrics.words) * 100 : 0
      }))
      .sort((a, b) => b.found - a.found || b.keyword.length - a.keyword.length);
  }

  function parseAllSemanticsInput(raw) {
    return parseAllSemanticsEntries(raw).map((entry) => entry.keyword);
  }

  function parseAllSemanticsEntries(raw) {
    return String(raw || "")
      .replace(/\r/g, "")
      .split("\n")
      .flatMap((line, index) => {
        const cells = line.includes("\t") ? line.split("\t") : line.includes("|") ? line.split("|") : [line];
        return cells.map((cell) => ({
          keyword: cell.trim(),
          line: index + 1
        }));
      })
      .map((entry) => ({ ...entry, keyword: cleanSemanticKeyword(entry.keyword) }))
      .filter((entry) => entry.keyword)
      .filter((entry) => !looksLikeSemanticMeta(entry.keyword));
  }

  function cleanSemanticKeyword(value) {
    return String(value || "")
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .trim();
  }

  function looksLikeSemanticMeta(value) {
    const lower = value.toLocaleLowerCase();
    if (!value || value.length < 2) return true;
    if (/^[~≈]?\d+(?:[.,]\d+)?$/.test(value.replace(/\s/g, ""))) return true;
    return [
      "page",
      "keywords",
      "keyword",
      "volume",
      "вхождения",
      "объем",
      "объём",
      "комментар",
      "частотность",
      "main",
      "faq"
    ].includes(lower);
  }

  function normalizeKeywordIdentity(keyword) {
    return normalizeBrandAliases(SeoKeywordAnalyzer
      .normalizeForMatching(keyword, {
        matchMode: "exact",
        caseMode: "insensitive",
        punctuationMode: "ignore"
      })
      .trim());
  }

  function normalizeBrandAliases(value) {
    return String(value || "")
      .replace(/\bvega\s+stars\b/giu, "vegastars")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getKeywordVariants(keyword) {
    const value = String(keyword || "").trim();
    const variants = new Set([value]);

    if (/\bvegastars\b/i.test(value)) {
      variants.add(value.replace(/\bvegastars\b/gi, "vega stars"));
    }

    if (/\bvega\s+stars\b/i.test(value)) {
      variants.add(value.replace(/\bvega\s+stars\b/gi, "vegastars"));
    }

    return Array.from(variants);
  }

  function renderForeignKeywords(rows) {
    if (!analysisResult.foreignKeys || !analysisResult.foreignKeys.length) {
      els.foreignKeywordState.innerHTML = t("foreign_keys_empty");
      els.foreignKeywordRows.innerHTML = `<tr><td colspan="4" class="empty">${t("empty_foreign")}</td></tr>`;
      return;
    }
    els.foreignKeywordState.textContent = "";
    els.foreignKeywordRows.innerHTML = rows.map((item) => {
      const statusClass = "status-foreign";
      const lines = [];
      return `
        <tr class="issueRow ${statusClass}">
          <td>${escapeHtml(item.keyword)}</td>
          <td>${item.found}</td>
          <td>${item.sourceLine || "-"}</td>
          <td><span class="status ${statusClass}">${t("status_foreign")}</span></td>
        </tr>
      `;
    }).join("");

    if (analysisResult.foreignKeys.length > 0) {
      const issueText = analysisResult.foreignKeys.map(k => t("issue_foreign_found", { key: escapeHtml(k.keyword), found: k.found }));
      const issuesList = document.getElementById("issuesList");
      issueText.forEach(text => {
        const li = document.createElement("li");
        li.innerHTML = text;
        issuesList.appendChild(li);
      });
      document.getElementById("issueCount").textContent = issuesList.children.length;
    }
  }

  function clearAllSemantics() {
    els.allSemanticsInput.value = "";
    state.foreignRows = [];
    renderForeignKeywords([]);
    clearForeignMarks();
    saveSettingsState();
  }

  function markKeywords(options = {}) {
    clearMarks();
    if (!state.rows.length) return;

    const rows = state.rows
      .filter((row) => row.found > 0)
      .sort(compareKeywordsForHighlight);

    const textLength = getAnalysisText().length;
    const totalMatches = rows.reduce((sum, row) => sum + row.found, 0);
    const automatic = Boolean(options.automatic);
    const heavyForAuto =
      automatic &&
      (textLength > AUTO_HIGHLIGHT_TEXT_LIMIT ||
        rows.length > AUTO_HIGHLIGHT_KEYWORD_LIMIT ||
        totalMatches > AUTO_HIGHLIGHT_MATCH_LIMIT);

    if (heavyForAuto) {
      markPriorityKeywords(rows);
      return;
    }

    rows.forEach((row) => {
      markOneKeyword(row.keyword, row.status);
    });
  }

  function markPriorityKeywords(rows) {
    rows
      .filter((row) => row.status === "Overused" || row.status === "Forbidden")
      .forEach((row) => markOneKeyword(row.keyword, row.status));
  }

  function markForeignKeywords(options = {}) {
    clearForeignMarks();
    if (!state.foreignRows.length) return;

    const totalMatches = state.foreignRows.reduce((sum, row) => sum + row.found, 0);
    const rows = Boolean(options.automatic) && totalMatches > 300
      ? state.foreignRows.slice(0, 50)
      : state.foreignRows;

    rows
      .slice()
      .sort(compareKeywordsForHighlight)
      .forEach((row) => markOneKeyword(row.keyword, "Foreign", row.keyword));
  }

  function clearForeignMarks() {
    els.editor.querySelectorAll("mark.mark-foreign").forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
    els.editor.normalize();
  }

  function compareKeywordsForHighlight(a, b) {
    const aWords = countWords(a.keyword);
    const bWords = countWords(b.keyword);
    if (aWords !== bWords) return bWords - aWords;
    if (a.keyword.length !== b.keyword.length) return b.keyword.length - a.keyword.length;
    return statusPriority(a.status) - statusPriority(b.status);
  }

  function statusPriority(status) {
    const order = {
      Forbidden: 0,
      Foreign: 0,
      Overused: 1,
      Low: 2,
      Missing: 3,
      OK: 4,
      "Not tracked": 5
    };
    return order[status] ?? 9;
  }

  function markOneKeyword(keyword, status, titleKeyword = keyword) {
    const className = `mark-${status.toLowerCase().replace(/\s+/g, "-")}`;
    const walker = document.createTreeWalker(els.editor, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest("mark")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    let node = walker.nextNode();
    while (node) {
      nodes.push(node);
      node = walker.nextNode();
    }

    const separator = els.punctuationMode.value === "ignore" ? "[\\s\\-‐‑‒–—―]+" : "\\s+";
    const pattern = escapeRegExp(keyword.trim()).replace(/\s+/g, separator);
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, els.caseMode.value === "sensitive" ? "gu" : "giu");
    nodes.forEach((textNode) => {
      const value = textNode.nodeValue;
      if (!regex.test(value)) return;
      regex.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match = regex.exec(value);
      while (match) {
        fragment.append(document.createTextNode(value.slice(lastIndex, match.index)));
        const mark = document.createElement("mark");
        mark.className = className;
        mark.title = `${titleKeyword} · ${statusLabel(status)}`;
        mark.textContent = match[0];
        fragment.append(mark);
        lastIndex = match.index + match[0].length;
        match = regex.exec(value);
      }
      fragment.append(document.createTextNode(value.slice(lastIndex)));
      textNode.parentNode.replaceChild(fragment, textNode);
    });
  }

  function clearMarks() {
    els.editor.querySelectorAll("mark").forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
    els.editor.normalize();
  }

  function exportCsv() {
    if (!state.rows.length) analyze();
    const lines = [
      ["Ключ", "Нужно", "Найдено", "Статус", "Плотность", "Комментарий"],
      ...state.rows.map((row) => [
        row.keyword,
        row.requiredLabel,
        row.found,
        statusLabel(row.status),
        `${row.density.toFixed(2)}%`,
        row.comment || ""
      ])
    ];
    downloadText("seo-report.csv", lines.map((line) => line.map(csvCell).join(",")).join("\n"));
  }

  function copyHtml() {
    clearMarks();
    navigator.clipboard.writeText(els.editor.innerHTML);
  }

  function copyText() {
    navigator.clipboard.writeText(els.editor.innerText);
  }

  function getKeywordRules() {
    const sheetRules = parseSheetRows();
    if (sheetRules.length) return sheetRules;
    return SeoKeywordAnalyzer.parseKeywordInput(els.keywordInput.value);
  }

  function parseSheetPaste() {
    const table = parsePastedTable(els.sheetPasteInput.value);
    const headers = table.hasHeader ? table.headers : buildFallbackHeaders(table.columnCount);
    populateColumnSelects(headers, table.hasHeader ? getColumnMapping() : null, table.hasHeader ? null : autoDetectColumns(table.rows, false));
    const rules = parseSheetRows();
    renderKeywordPreview(rules);
    saveSettingsState();
    analyze();
  }

  function clearSheetKeywords() {
    els.sheetPasteInput.value = "";
    populateColumnSelects([]);
    renderKeywordPreview([]);
    saveSettingsState();
  }

  function parseSheetRows() {
    const table = parsePastedTable(els.sheetPasteInput.value);
    if (!table.rows.length) return [];

    const autoMapping = autoDetectColumns(table.rows, table.hasHeader);
    const mapping = table.hasHeader ? normalizeMapping(getColumnMapping(), autoMapping) : autoMapping;
    const keywordIndex = Number(mapping.keywordColumn);
    if (!Number.isInteger(keywordIndex) || keywordIndex < 0) return [];

    const rows = table.hasHeader ? table.rows.slice(1) : table.rows;
    const rules = [];
    let detectedTargetVolume = 0;

    rows.forEach((row) => {
      const keyword = cell(row, keywordIndex);
      if (!keyword) return;

      const required = parseNumber(cell(row, Number(mapping.requiredColumn)));
      const volume = parseNumber(cell(row, Number(mapping.volumeColumn)));
      const comment = cell(row, Number(mapping.commentColumn));
      const textVolume = parseNumber(cell(row, Number(mapping.textVolumeColumn)));
      const type = detectKeywordType(comment, keyword, required);

      if (!detectedTargetVolume && textVolume) detectedTargetVolume = textVolume;

      rules.push({
        id: keyword.toLocaleLowerCase().replace(/[^a-zа-яёіїєґ0-9]+/giu, "-").replace(/^-|-$/g, ""),
        keyword,
        min: type === "forbidden" ? 0 : required,
        max: type === "forbidden" ? 0 : required,
        type,
        comment: [comment, volume ? `Частотность: ${volume}` : ""].filter(Boolean).join(" | "),
        volume
      });
    });

    if (detectedTargetVolume) {
      els.targetVolume.value = detectedTargetVolume;
    }

    return rules;
  }

  function parsePastedTable(raw) {
    const lines = String(raw || "")
      .replace(/\r/g, "")
      .split("\n")
      .filter((line) => line.trim());

    const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : lines.some((line) => line.includes(";")) ? ";" : ",";
    const rows = lines.map((line) => line.split(delimiter).map((value) => value.trim()));
    const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
    const hasHeader = rows.length > 1 && looksLikeHeaderRow(rows[0]);
    return {
      delimiter,
      headers: hasHeader ? rows[0] : buildFallbackHeaders(columnCount),
      rows,
      columnCount,
      hasHeader
    };
  }

  function getSheetHeaders() {
    const table = parsePastedTable(els.sheetPasteInput.value);
    return table.headers;
  }

  function populateColumnSelects(headers, preferred = null, fallback = null) {
    const selects = [
      ["pageColumn", els.pageColumn, ["page", "страница"]],
      ["keywordColumn", els.keywordColumn, ["keywords", "keyword", "ключ", "ключи"]],
      ["volumeColumn", els.volumeColumn, ["volume", "частотность"]],
      ["commentColumn", els.commentColumn, ["комментар", "comment", "type"]],
      ["textVolumeColumn", els.textVolumeColumn, ["объем текста", "объём текста", "сбп", "text volume"]],
      ["requiredColumn", els.requiredColumn, ["вхождения", "required", "count", "норма"]]
    ];

    selects.forEach(([key, select, aliases]) => {
      const current = preferred?.[key] ?? select.value;
      select.innerHTML = `<option value="-1">Не использовать</option>` + headers
        .map((header, index) => `<option value="${index}">${escapeHtml(header || `Column ${index + 1}`)}</option>`)
        .join("");

      const detected = fallback?.[key] ?? detectColumn(headers, aliases);
      const nextValue = current && current !== "-1" ? current : String(detected);
      select.value = Number(nextValue) >= 0 ? nextValue : "-1";
    });
  }

  function getColumnMapping() {
    return {
      pageColumn: els.pageColumn.value,
      keywordColumn: els.keywordColumn.value,
      volumeColumn: els.volumeColumn.value,
      commentColumn: els.commentColumn.value,
      textVolumeColumn: els.textVolumeColumn.value,
      requiredColumn: els.requiredColumn.value
    };
  }

  function detectColumn(headers, aliases) {
    const normalized = headers.map((header) => header.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim());
    const index = normalized.findIndex((header) => aliases.some((alias) => header.includes(alias)));
    return index >= 0 ? index : -1;
  }

  function normalizeMapping(mapping, autoMapping) {
    const result = { ...mapping };
    Object.keys(autoMapping).forEach((key) => {
      if (result[key] === undefined || result[key] === "" || result[key] === "-1") {
        result[key] = String(autoMapping[key]);
      }
    });
    return result;
  }

  function autoDetectColumns(rows, hasHeader) {
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
    const scores = Array.from({ length: columnCount }, (_, index) => scoreColumn(dataRows, index));

    const keywordColumn = bestIndex(scores, (score) => score.keyword);

    const numericCols = scores
      .map((score, index) => ({ score, index }))
      .filter(c => c.index !== keywordColumn && c.score.numberCount > 0);

    let textVolumeColumn = -1;
    let volumeColumn = -1;
    let requiredColumn = -1;

    const textVolMatch = numericCols.find(c => c.score.hasTilde);
    if (textVolMatch) {
      textVolumeColumn = textVolMatch.index;
    } else {
      textVolumeColumn = bestIndex(scores, (score, index) => index !== keywordColumn ? score.textVolume : -1);
      if (scores[textVolumeColumn] && scores[textVolumeColumn].textVolume <= 0) textVolumeColumn = -1;
    }

    const remainingNum = numericCols.filter(c => c.index !== textVolumeColumn);

    if (remainingNum.length >= 2) {
      remainingNum.sort((a, b) => b.score.numberSum - a.score.numberSum);
      volumeColumn = remainingNum[0].index;
      requiredColumn = remainingNum[remainingNum.length - 1].index;
    } else if (remainingNum.length === 1) {
      const c = remainingNum[0];
      if (c.score.numberMax > 50) volumeColumn = c.index;
      else requiredColumn = c.index;
    }

    const commentColumn = bestIndex(scores, (score, index) =>
      ![keywordColumn, textVolumeColumn, volumeColumn, requiredColumn].includes(index) ? score.comment : -1
    );

    return {
      pageColumn: -1,
      keywordColumn,
      volumeColumn,
      commentColumn,
      textVolumeColumn,
      requiredColumn
    };
  }

  function scoreColumn(rows, index) {
    let keyword = 0;
    let comment = 0;
    let textVolume = 0;
    let numberCount = 0;
    let numberSum = 0;
    let numberMax = 0;
    let hasTilde = false;

    rows.forEach((row) => {
      const value = cell(row, index);
      if (!value) return;
      const number = parseNumber(value);
      const lower = value.toLocaleLowerCase();
      const words = countWords(value);

      if (!number && words >= 1) keyword += words > 1 ? 4 : 2;
      if (!number && /faq|forbidden|запрещ|чуж|primary|secondary/i.test(value)) comment += 8;

      if (number) {
        numberCount++;
        numberSum += number;
        if (number > numberMax) numberMax = number;

        if (/[~≈]/.test(value)) {
          hasTilde = true;
          textVolume += 10;
        } else if (number >= 1000) {
          textVolume += 1;
        }
      }

      if (lower.includes("faq")) comment += 8;
    });

    return { keyword, comment, textVolume, numberCount, numberSum, numberMax, hasTilde };
  }

  function bestIndex(scores, getter) {
    let best = -1;
    let bestScore = 0;
    scores.forEach((score, index) => {
      const value = getter(score, index);
      if (value > bestScore) {
        best = index;
        bestScore = value;
      }
    });
    return best;
  }

  function looksLikeHeaderRow(row) {
    const joined = row.join(" ").toLocaleLowerCase();
    return [
      "keyword",
      "keywords",
      "ключ",
      "page",
      "volume",
      "вхождения",
      "комментар",
      "объем",
      "объём"
    ].some((word) => joined.includes(word));
  }

  function buildFallbackHeaders(count) {
    return Array.from({ length: count }, (_, index) => `Column ${index + 1}`);
  }

  function detectKeywordType(comment, keyword, required) {
    const value = `${comment} ${keyword}`.toLocaleLowerCase();
    if (value.includes("forbidden") || value.includes("запрещ") || value.includes("чуж")) return "forbidden";
    if (value.includes("faq")) return "faq";
    if (Number(required) >= 8) return "primary";
    return "secondary";
  }

  function renderKeywordPreview(rules) {
    els.keywordPreviewState.textContent = rules.length
      ? `Распознано ключей: ${rules.length}.`
      : "Пока ничего не распознано.";

    if (!rules.length) {
      els.keywordPreviewRows.innerHTML = `<tr><td colspan="5" class="empty">Вставьте таблицу выше.</td></tr>`;
      return;
    }

    els.keywordPreviewRows.innerHTML = rules.map((rule) => `
      <tr>
        <td>${escapeHtml(rule.keyword)}</td>
        <td>${rule.volume || ""}</td>
        <td>${rule.type === "forbidden" ? "0" : rule.min || ""}</td>
        <td>${escapeHtml(typeLabel(rule.type))}</td>
        <td>${escapeHtml(rule.comment || "")}</td>
      </tr>
    `).join("");
  }

  function cell(row, index) {
    return Number.isInteger(index) && index >= 0 ? String(row[index] || "").trim() : "";
  }

  function parseNumber(value) {
    const match = String(value || "").replace(/\s/g, "").match(/\d+(?:[.,]\d+)?/);
    if (!match) return null;
    return Number(match[0].replace(",", "."));
  }

  function saveState() {
    const data = {
      html: getCleanEditorHtml(),
      keywordInput: els.keywordInput.value,
      sheetPasteInput: els.sheetPasteInput.value,
      allSemanticsInput: els.allSemanticsInput.value,
      columns: getColumnMapping(),
      targetVolume: els.targetVolume.value,
      matchMode: els.matchMode.value,
      countMode: els.countMode.value,
      caseMode: els.caseMode.value,
      punctuationMode: els.punctuationMode.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function saveSettingsState() {
    const previous = readSavedState();
    const data = {
      ...previous,
      keywordInput: els.keywordInput.value,
      sheetPasteInput: els.sheetPasteInput.value,
      allSemanticsInput: els.allSemanticsInput.value,
      columns: getColumnMapping(),
      targetVolume: els.targetVolume.value,
      matchMode: els.matchMode.value,
      countMode: els.countMode.value,
      caseMode: els.caseMode.value,
      punctuationMode: els.punctuationMode.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function readSavedState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (_error) {
      return {};
    }
  }

  function getCleanEditorHtml() {
    const clone = els.editor.cloneNode(true);
    clone.querySelectorAll("mark").forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
    clone.normalize();
    return clone.innerHTML;
  }

  function loadState() {
    const data = readSavedState();
    if (!Object.keys(data).length) return;
    try {
      if (data.html) els.editor.innerHTML = data.html;
      els.keywordInput.value = data.keywordInput || "";
      els.sheetPasteInput.value = data.sheetPasteInput || "";
      els.allSemanticsInput.value = data.allSemanticsInput || "";
      els.targetVolume.value = data.targetVolume || "";
      els.matchMode.value = data.matchMode || "exact";
      els.countMode.value = data.countMode || "strict";
      els.caseMode.value = data.caseMode || "insensitive";
      els.punctuationMode.value = data.punctuationMode || "ignore";
      populateColumnSelects(getSheetHeaders(), data.columns || null);
      parseSheetPaste();
    } catch (_error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function loadDemoKeys() {
    els.sheetPasteInput.value = [
      "Page\tKeywords\tVolume\tКомментарии к ключам\tОбъем текста СБП\tВхождения ключей",
      "Main\tvegastars\t38000\t\t~15000\t17",
      "Main\tvegastars casino\t4900\t\t\t11",
      "Main\tvega stars\t1000\t\t\t4",
      "Main\tvegastars australia\t700\t\t\t4",
      "Main\tvegastars online casino\t500\t\t\t3",
      "Main\tvegastars pokies\t350\t\t\t1",
      "Main\tis vegastars online casino legit\t\tFAQ\t\t1",
      "Main\twho owns vegastars online casino\t\tFAQ\t\t1",
      "Main\twrong casino\t\tforbidden\t\t0"
    ].join("\n");
    els.keywordInput.value = "";
    els.targetVolume.value = 8000;
    parseSheetPaste();
    saveSettingsState();
  }

  function loadSample() {
    els.editor.innerHTML = `
      <h1>Vegastars Casino Review</h1>
      <p>Vegastars casino is a gambling platform for players who want pokies, bonuses and a simple mobile experience.</p>
      <h2>What Makes Vegastars Casino Special</h2>
      <p>Vegastars offers casino games, fast navigation and several payment methods for Australian users.</p>
      <h2>Pros and Cons</h2>
      <h3>Pros</h3>
      <ul>
        <li>Large pokies library</li>
        <li>Mobile-friendly layout</li>
      </ul>
      <h3>Cons</h3>
      <ul>
        <li>Terms should be checked before claiming a bonus</li>
      </ul>
      <h2>FAQ</h2>
      <h3>Is Vegastars casino available in Australia?</h3>
      <p>Vegastars Australia information should be checked on the official website.</p>
    `;
    loadDemoKeys();
    analyze();
  }

  function clearEditor() {
    els.editor.innerHTML = "";
    analyze();
  }

  function getSettings() {
    return {
      targetVolume: Number(els.targetVolume.value) || 0,
      matchMode: els.matchMode.value,
      countMode: els.countMode.value,
      caseMode: els.caseMode.value,
      punctuationMode: els.punctuationMode.value
    };
  }

  function countWords(text) {
    return (text.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) || []).length;
  }

  function setText(id, value) {
    document.getElementById(id).textContent = String(value);
  }

  function statusClass(status) {
    return `status-${status.toLowerCase().replace(/\s+/g, "-")}`;
  }

  function statusLabel(status) {
    const labels = {
      OK: "OK",
      Missing: "Нет",
      Low: "Мало",
      Overused: "Переспам",
      Forbidden: "Запрещен",
      Foreign: "Чужой ключ",
      "Not tracked": "Без нормы"
    };
    return labels[status] || status;
  }

  function typeLabel(type) {
    const labels = {
      primary: "основной",
      secondary: "доп.",
      faq: "FAQ",
      forbidden: "запрещенный"
    };
    return labels[type] || type;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function csvCell(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
  }

  function downloadText(filename, text) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(this, args), delay);
    };
  }
})();
