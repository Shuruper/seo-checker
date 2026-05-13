(function () {
  const STORAGE_KEY = "seoKeywordCheckerSettings";
  const state = {
    documentText: "",
    documentTitle: "",
    rows: [],
    issues: [],
    metrics: null
  };

  const els = {
    docState: document.getElementById("docState"),
    checkBtn: document.getElementById("checkBtn"),
    keywordInput: document.getElementById("keywordInput"),
    targetVolume: document.getElementById("targetVolume"),
    matchMode: document.getElementById("matchMode"),
    caseMode: document.getElementById("caseMode"),
    punctuationMode: document.getElementById("punctuationMode"),
    keywordRows: document.getElementById("keywordRows"),
    issuesList: document.getElementById("issuesList")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindTabs();
    bindActions();
    await loadSettings();
    await refreshDocumentText();
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
    els.checkBtn.addEventListener("click", runCheck);
    document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings);
    document.getElementById("loadDemoBtn").addEventListener("click", loadDemo);
    document.getElementById("highlightAllBtn").addEventListener("click", highlightAll);
    document.getElementById("clearHighlightsBtn").addEventListener("click", clearHighlights);
    document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  }

  async function refreshDocumentText() {
    els.docState.textContent = "Google Docs: чтение документа...";
    const response = await sendToActiveTab({ type: "GET_DOCUMENT_TEXT" });
    if (!response?.ok) {
      els.docState.textContent = "Google Docs: текст не найден. Откройте документ и повторите.";
      return;
    }

    state.documentText = response.text;
    state.documentTitle = response.title;
    els.docState.textContent = `${response.title || "Документ"}: ${response.text.length} символов`;
  }

  async function runCheck() {
    await saveSettings();
    await refreshDocumentText();

    const keywords = SeoKeywordAnalyzer.parseKeywordInput(els.keywordInput.value);
    const result = SeoKeywordAnalyzer.analyzeDocument(state.documentText, keywords, getSettings());

    state.rows = result.rows;
    state.issues = result.issues;
    state.metrics = result.metrics;

    renderSummary(result.summary);
    renderRows(result.rows);
    renderIssues(result.issues);
  }

  function renderSummary(summary) {
    setText("charsWithSpaces", summary.charsWithSpaces);
    setText("charsNoSpaces", summary.charsNoSpaces);
    setText("wordsCount", summary.words);
    setText("okCount", summary.ok);
    setText("missingCount", summary.missing);
    setText("lowCount", summary.low);
    setText("overCount", summary.overused);
    setText("forbiddenCount", summary.forbidden);

    const volumeState = document.getElementById("volumeState");
    if (!summary.targetVolume) {
      volumeState.textContent = "Укажите целевой объем, чтобы увидеть отклонение.";
      return;
    }

    const delta = summary.charsNoSpaces - summary.targetVolume;
    const sign = delta >= 0 ? "+" : "";
    volumeState.textContent = `Текущий объем: ${summary.charsNoSpaces}/${summary.targetVolume} СБП (${sign}${delta}).`;
  }

  function renderRows(rows) {
    if (!rows.length) {
      els.keywordRows.innerHTML = `<tr><td colspan="6" class="empty">Список ключей пуст.</td></tr>`;
      return;
    }

    els.keywordRows.innerHTML = rows.map((row) => `
      <tr>
        <td>
          <strong>${escapeHtml(row.keyword)}</strong>
          ${row.comment ? `<br><small>${escapeHtml(row.comment)}</small>` : ""}
        </td>
        <td>${escapeHtml(row.requiredLabel)}</td>
        <td>${row.found}</td>
        <td><span class="badge ${statusClass(row.status)}">${row.status}</span></td>
        <td>${row.density.toFixed(2)}%</td>
        <td>
          <div class="rowActions">
            <button type="button" data-action="focus" data-keyword="${escapeHtml(row.keyword)}">Найти</button>
            <button type="button" data-action="highlight" data-keyword="${escapeHtml(row.keyword)}">Подсветить</button>
            <button type="button" data-action="copy" data-keyword="${escapeHtml(row.keyword)}">Копировать</button>
          </div>
        </td>
      </tr>
    `).join("");

    els.keywordRows.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => handleRowAction(button.dataset.action, button.dataset.keyword));
    });
  }

  function renderIssues(issues) {
    els.issuesList.innerHTML = issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("");
  }

  async function handleRowAction(action, keyword) {
    if (action === "copy") {
      await navigator.clipboard.writeText(keyword);
      return;
    }

    if (action === "focus") {
      await sendToActiveTab({ type: "FOCUS_KEYWORD", keyword });
      return;
    }

    if (action === "highlight") {
      await sendToActiveTab({
        type: "HIGHLIGHT_KEYWORDS",
        keywords: [{ keyword }],
        settings: getSettings()
      });
    }
  }

  async function highlightAll() {
    const keywords = state.rows.length
      ? state.rows
      : SeoKeywordAnalyzer.parseKeywordInput(els.keywordInput.value);

    await sendToActiveTab({
      type: "HIGHLIGHT_KEYWORDS",
      keywords,
      settings: getSettings()
    });
  }

  async function clearHighlights() {
    await sendToActiveTab({ type: "CLEAR_HIGHLIGHTS" });
  }

  function exportCsv() {
    if (!state.rows.length) return;

    const header = ["Page", "Keyword", "Required", "Found", "Status", "Density", "Comment"];
    const lines = [
      header,
      ...state.rows.map((row) => [
        state.documentTitle,
        row.keyword,
        row.requiredLabel,
        row.found,
        row.status,
        `${row.density.toFixed(2)}%`,
        row.comment || ""
      ])
    ];

    const csv = lines.map((line) => line.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    chrome.downloads?.download?.({ url, filename: "seo-keyword-report.csv", saveAs: true });

    if (!chrome.downloads) {
      navigator.clipboard.writeText(csv);
      alert("CSV скопирован в буфер обмена. Для скачивания добавьте permission downloads.");
    }
  }

  async function saveSettings() {
    const settings = {
      keywordInput: els.keywordInput.value,
      targetVolume: Number(els.targetVolume.value) || 0,
      matchMode: els.matchMode.value,
      caseMode: els.caseMode.value,
      punctuationMode: els.punctuationMode.value
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  }

  async function loadSettings() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const settings = data[STORAGE_KEY] || {};

    els.keywordInput.value = settings.keywordInput || "";
    els.targetVolume.value = settings.targetVolume || "";
    els.matchMode.value = settings.matchMode || "exact";
    els.caseMode.value = settings.caseMode || "insensitive";
    els.punctuationMode.value = settings.punctuationMode || "ignore";
  }

  function loadDemo() {
    els.keywordInput.value = [
      "vegastars | 14 | 17 | primary | бренд",
      "vegastars casino | 8 | 11 | primary | основной ключ",
      "vegastars australia | 3 | 4 | secondary | гео",
      "vegastars pokies | 1 | 2 | secondary | слот-ключ",
      "wrong casino | 0 | 0 | forbidden | чужой интент"
    ].join("\n");
    els.targetVolume.value = 8000;
  }

  function getSettings() {
    return {
      targetVolume: Number(els.targetVolume.value) || 0,
      matchMode: els.matchMode.value,
      caseMode: els.caseMode.value,
      punctuationMode: els.punctuationMode.value
    };
  }

  async function sendToActiveTab(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (_error) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      return chrome.tabs.sendMessage(tab.id, message);
    }
  }

  function statusClass(status) {
    return `status-${status.toLowerCase().replace(/\s+/g, "-")}`;
  }

  function setText(id, value) {
    document.getElementById(id).textContent = String(value);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function csvCell(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
  }
})();
