(function () {
  const DEFAULT_SETTINGS = {
    matchMode: "exact",
    caseMode: "insensitive",
    punctuationMode: "ignore",
    countMode: "strict",
    targetVolume: 0
  };

  const STATUS = {
    OK: "OK",
    MISSING: "Missing",
    LOW: "Low",
    OVERUSED: "Overused",
    FORBIDDEN: "Forbidden",
    NOT_TRACKED: "Not tracked"
  };

  function parseKeywordInput(input) {
    return input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith("#"))
      .map((line) => {
        const parts = line.split("|").map((part) => part.trim());
        const keyword = parts[0] || "";
        const min = toOptionalNumber(parts[1]);
        const max = toOptionalNumber(parts[2]);
        const type = (parts[3] || "secondary").toLowerCase();
        const comment = parts.slice(4).join(" | ");

        return {
          id: stableId(keyword),
          keyword,
          min,
          max,
          type,
          comment
        };
      })
      .filter((item) => item.keyword);
  }

  function analyzeDocument(text, keywords, settingsInput) {
    const settings = { ...DEFAULT_SETTINGS, ...settingsInput };
    const metrics = getTextMetrics(text);
    const normalizedText = normalizeForMatching(text, settings);

    const counts = countKeywords(normalizedText, keywords, settings);

    const rows = keywords.map((item) => {
      const count = counts.get(item.id) || 0;
      const status = resolveStatus(item, count);
      const density = metrics.words > 0
        ? (count / metrics.words) * 100
        : 0;

      return {
        ...item,
        found: count,
        status,
        density,
        requiredLabel: formatRequired(item)
      };
    });

    const summary = summarize(rows, metrics, settings.targetVolume);
    const issues = collectIssues(rows, metrics, settings.targetVolume);

    return {
      metrics,
      rows,
      summary,
      issues
    };
  }

  function getTextMetrics(text) {
    const charsWithSpaces = text.length;
    const charsNoSpaces = (text.match(/\S/g) || []).length;
    const words = (text.trim().match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) || []).length;

    return {
      charsWithSpaces,
      charsNoSpaces,
      words
    };
  }

  function countKeyword(normalizedText, keyword, settings) {
    return findKeywordMatches(normalizedText, keyword, settings).length;
  }

  function countKeywords(normalizedText, keywords, settings) {
    if (settings.countMode === "independent") {
      return new Map(keywords.map((item) => [
        item.id,
        countKeyword(normalizedText, item.keyword, settings)
      ]));
    }

    const counts = new Map(keywords.map((item) => [item.id, 0]));
    const matches = [];

    keywords.forEach((item) => {
      findKeywordMatches(normalizedText, item.keyword, settings).forEach((match) => {
        matches.push({
          ...match,
          id: item.id,
          keyword: item.keyword,
          words: countWords(item.keyword)
        });
      });
    });

    matches
      .sort((a, b) => {
        if (a.words !== b.words) return b.words - a.words;
        if (a.text.length !== b.text.length) return b.text.length - a.text.length;
        return a.start - b.start;
      })
      .forEach((match) => {
        if (hasOverlap(match, matches._accepted || [])) return;
        if (!matches._accepted) matches._accepted = [];
        matches._accepted.push(match);
        counts.set(match.id, (counts.get(match.id) || 0) + 1);
      });

    return counts;
  }

  function findKeywordMatches(normalizedText, keyword, settings) {
    const normalizedKeyword = normalizeForMatching(keyword, settings).trim();
    if (!normalizedKeyword) return [];

    const pattern = settings.matchMode === "broad"
      ? buildBroadPattern(normalizedKeyword)
      : buildExactPattern(normalizedKeyword);

    const flags = settings.caseMode === "sensitive" ? "gu" : "giu";
    const regex = new RegExp(pattern, flags);
    const matches = [];
    let match = regex.exec(normalizedText);

    while (match) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
      match = regex.exec(normalizedText);
    }

    return matches;
  }

  function buildExactPattern(keyword) {
    const escaped = escapeRegExp(keyword).replace(/\s+/g, "\\s+");
    return `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`;
  }

  function buildBroadPattern(keyword) {
    const words = keyword
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => `${escapeRegExp(word)}[\\p{L}\\p{N}_-]*`);
    return `(?<![\\p{L}\\p{N}])${words.join("\\s+")}(?![\\p{L}\\p{N}])`;
  }

  function normalizeForMatching(value, settings) {
    let result = String(value || "");

    if (settings.caseMode !== "sensitive") {
      result = result.toLocaleLowerCase();
    }

    if (settings.punctuationMode === "ignore") {
      result = result
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[-‐‑‒–—―]+/g, " ")
        .replace(/[^\p{L}\p{N}_'\s]+/gu, " . ")
        .replace(/\s+/g, " ");
    }

    return result;
  }

  function resolveStatus(item, count) {
    if (item.type === "forbidden") {
      return count > 0 ? STATUS.FORBIDDEN : STATUS.OK;
    }

    const hasMin = Number.isFinite(item.min);
    const hasMax = Number.isFinite(item.max);

    if (!hasMin && !hasMax) return STATUS.NOT_TRACKED;
    if (hasMin && count === 0 && item.min > 0) return STATUS.MISSING;
    if (hasMin && count < item.min) return STATUS.LOW;
    if (hasMax && count > item.max) return STATUS.OVERUSED;
    return STATUS.OK;
  }

  function summarize(rows, metrics, targetVolume) {
    return {
      ...metrics,
      totalKeywords: rows.length,
      ok: rows.filter((row) => row.status === STATUS.OK).length,
      missing: rows.filter((row) => row.status === STATUS.MISSING).length,
      low: rows.filter((row) => row.status === STATUS.LOW).length,
      overused: rows.filter((row) => row.status === STATUS.OVERUSED).length,
      forbidden: rows.filter((row) => row.status === STATUS.FORBIDDEN).length,
      targetVolume: Number(targetVolume) || 0
    };
  }

  function collectIssues(rows, metrics, targetVolume) {
    const issues = [];

    rows.forEach((row) => {
      if (row.status === STATUS.MISSING) {
        issues.push(`Ключ "${row.keyword}" отсутствует, требуется ${row.requiredLabel}.`);
      }
      if (row.status === STATUS.LOW) {
        issues.push(`Ключ "${row.keyword}" ниже нормы: ${row.found}/${row.min}.`);
      }
      if (row.status === STATUS.OVERUSED) {
        issues.push(`Ключ "${row.keyword}" переспамлен: ${row.found}/${row.max}.`);
      }
      if (row.status === STATUS.FORBIDDEN) {
        issues.push(`Найден запрещенный или чужой ключ: "${row.keyword}" (${row.found}).`);
      }
    });

    const target = Number(targetVolume) || 0;
    if (target > 0) {
      const delta = metrics.charsNoSpaces - target;
      const ratio = Math.abs(delta) / target;
      if (ratio > 0.15 && delta < 0) {
        issues.push(`Объем текста меньше ТЗ более чем на 15%: ${metrics.charsNoSpaces}/${target} СБП.`);
      }
      if (ratio > 0.25 && delta > 0) {
        issues.push(`Объем текста больше ТЗ более чем на 25%: ${metrics.charsNoSpaces}/${target} СБП.`);
      }
    }

    return issues.length ? issues : ["Критичных проблем по текущим правилам не найдено."];
  }

  function formatRequired(item) {
    if (item.type === "forbidden") return "0";
    if (Number.isFinite(item.min) && Number.isFinite(item.max)) {
      return item.min === item.max ? String(item.min) : `${item.min}-${item.max}`;
    }
    if (Number.isFinite(item.min)) return `>= ${item.min}`;
    if (Number.isFinite(item.max)) return `<= ${item.max}`;
    return "-";
  }

  function toOptionalNumber(value) {
    if (value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function stableId(value) {
    return String(value || "")
      .toLocaleLowerCase()
      .replace(/[^a-zа-яёіїєґ0-9]+/giu, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || String(Date.now());
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function hasOverlap(match, accepted) {
    return accepted.some((item) => match.start < item.end && match.end > item.start);
  }

  function countWords(text) {
    return (String(text || "").match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) || []).length;
  }

  window.SeoKeywordAnalyzer = {
    DEFAULT_SETTINGS,
    STATUS,
    parseKeywordInput,
    analyzeDocument,
    countKeywords,
    countKeyword,
    findKeywordMatches,
    getTextMetrics,
    normalizeForMatching
  };
})();
