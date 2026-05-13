(function () {
  const HIGHLIGHT_NAME = "seo-keyword-checker";
  const HIGHLIGHT_NAMES = [
    `${HIGHLIGHT_NAME}-ok`,
    `${HIGHLIGHT_NAME}-low`,
    `${HIGHLIGHT_NAME}-missing`,
    `${HIGHLIGHT_NAME}-overused`,
    `${HIGHLIGHT_NAME}-forbidden`,
    `${HIGHLIGHT_NAME}-not-tracked`
  ];
  const HIGHLIGHT_STYLE_ID = "seo-keyword-checker-style";
  let activeIndexByKeyword = new Map();

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "GET_DOCUMENT_TEXT") {
      sendResponse(extractDocument());
      return true;
    }

    if (message.type === "HIGHLIGHT_KEYWORDS") {
      const result = highlightKeywords(message.keywords || [], message.settings || {});
      sendResponse(result);
      return true;
    }

    if (message.type === "CLEAR_HIGHLIGHTS") {
      clearHighlights();
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === "FOCUS_KEYWORD") {
      const result = focusKeyword(message.keyword);
      sendResponse(result);
      return true;
    }

    return false;
  });

  function extractDocument() {
    const textNodes = getReadableTextNodes();
    const text = textNodes
      .map((node) => node.nodeValue)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return {
      ok: Boolean(text),
      title: document.title.replace(/ - Google Docs$/i, ""),
      url: location.href,
      text,
      source: text ? "dom" : "empty"
    };
  }

  function highlightKeywords(keywords, settings) {
    clearHighlights();
    ensureHighlightStyles();

    if (!("Highlight" in window) || !CSS.highlights) {
      return { ok: false, reason: "CSS Highlight API is not available in this browser." };
    }

    const textNodes = getReadableTextNodes();
    const index = buildTextIndex(textNodes);
    const rangesByName = new Map(HIGHLIGHT_NAMES.map((name) => [name, []]));
    const keywordCounts = {};

    keywords.forEach((item) => {
      const keyword = item.keyword || item;
      if (!keyword) return;

      const matches = findMatches(index.text, keyword, settings);
      keywordCounts[keyword] = matches.length;
      const highlightName = getHighlightName(item);

      matches.forEach((match) => {
        const range = rangeFromOffsets(index, match.start, match.end);
        if (range) rangesByName.get(highlightName).push(range);
      });
    });

    let highlighted = 0;
    rangesByName.forEach((ranges, name) => {
      highlighted += ranges.length;
      if (ranges.length) CSS.highlights.set(name, new Highlight(...ranges));
    });

    return {
      ok: true,
      highlighted,
      keywordCounts
    };
  }

  function focusKeyword(keyword) {
    const textNodes = getReadableTextNodes();
    const index = buildTextIndex(textNodes);
    const matches = findMatches(index.text, keyword, { matchMode: "exact", caseMode: "insensitive", punctuationMode: "respect" });
    if (!matches.length) return { ok: false, reason: "Keyword was not found in visible DOM text." };

    const current = activeIndexByKeyword.get(keyword) || 0;
    const match = matches[current % matches.length];
    activeIndexByKeyword.set(keyword, current + 1);

    const range = rangeFromOffsets(index, match.start, match.end);
    if (!range) return { ok: false, reason: "Unable to map match to DOM range." };

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    range.startContainer.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
    return { ok: true, index: current % matches.length, total: matches.length };
  }

  function clearHighlights() {
    if (CSS.highlights) HIGHLIGHT_NAMES.forEach((name) => CSS.highlights.delete(name));
    activeIndexByKeyword = new Map();
  }

  function getReadableTextNodes() {
    const root = document.querySelector(".kix-appview-editor") || document.querySelector("[role='textbox']") || document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const value = node.nodeValue || "";
        if (!value.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest("script, style, noscript, svg, canvas, iframe")) return NodeFilter.FILTER_REJECT;
        if (parent.closest("[data-seo-keyword-checker]")) return NodeFilter.FILTER_REJECT;
        if (isHidden(parent)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    let node = walker.nextNode();
    while (node) {
      nodes.push(node);
      node = walker.nextNode();
    }
    return nodes;
  }

  function isHidden(element) {
    const style = window.getComputedStyle(element);
    return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0;
  }

  function buildTextIndex(nodes) {
    let text = "";
    const entries = [];

    nodes.forEach((node) => {
      const start = text.length;
      text += node.nodeValue;
      const end = text.length;
      entries.push({ node, start, end });
      text += "\n";
    });

    return { text, entries };
  }

  function rangeFromOffsets(index, start, end) {
    const startEntry = index.entries.find((entry) => start >= entry.start && start <= entry.end);
    const endEntry = index.entries.find((entry) => end >= entry.start && end <= entry.end);
    if (!startEntry || !endEntry) return null;

    const range = document.createRange();
    range.setStart(startEntry.node, Math.max(0, start - startEntry.start));
    range.setEnd(endEntry.node, Math.max(0, end - endEntry.start));
    return range;
  }

  function findMatches(text, keyword, settings) {
    const mode = settings.matchMode || "exact";
    const caseMode = settings.caseMode || "insensitive";
    const escaped = escapeRegExp(keyword.trim()).replace(/\s+/g, "\\s+");
    const suffix = mode === "broad" ? "[\\p{L}\\p{N}_-]*" : "";
    const pattern = escaped
      .split("\\s+")
      .map((part) => `${part}${suffix}`)
      .join("\\s+");
    const flags = caseMode === "sensitive" ? "gu" : "giu";
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, flags);

    const matches = [];
    let match = regex.exec(text);
    while (match) {
      matches.push({ start: match.index, end: match.index + match[0].length });
      match = regex.exec(text);
    }
    return matches;
  }

  function ensureHighlightStyles() {
    if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = HIGHLIGHT_STYLE_ID;
    style.textContent = `
      ::highlight(${HIGHLIGHT_NAME}-ok) {
        background: rgba(35, 134, 84, 0.28);
        color: inherit;
      }
      ::highlight(${HIGHLIGHT_NAME}-low),
      ::highlight(${HIGHLIGHT_NAME}-missing) {
        background: rgba(255, 214, 10, 0.42);
        color: inherit;
      }
      ::highlight(${HIGHLIGHT_NAME}-overused) {
        background: rgba(218, 45, 32, 0.32);
        color: inherit;
      }
      ::highlight(${HIGHLIGHT_NAME}-forbidden) {
        background: rgba(17, 24, 39, 0.2);
        text-decoration: underline red 2px;
        color: inherit;
      }
      ::highlight(${HIGHLIGHT_NAME}-not-tracked) {
        background: rgba(47, 111, 237, 0.25);
        color: inherit;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function getHighlightName(item) {
    const status = String(item.status || "not-tracked").toLowerCase().replace(/\s+/g, "-");
    const name = `${HIGHLIGHT_NAME}-${status}`;
    return HIGHLIGHT_NAMES.includes(name) ? name : `${HIGHLIGHT_NAME}-not-tracked`;
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
})();
