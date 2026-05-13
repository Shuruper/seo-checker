const i18n = {
    ru: {
        title: "SEO-проверка текста",
        header_subtitle: "Локальный SEO-редактор",
        btn_demo: "Демо",
        btn_check: "Проверить",
        btn_instructions: "Инструкция 📚",
        pane_text: "Текст",
        btn_infer_structure: "Распознать структуру",
        btn_clear: "Очистить",
        editor_placeholder_title: "Вставьте текст сюда",
        editor_placeholder_desc: "Можно вставлять из Google Docs, Word, WordPress или обычный текст. Если заголовки потерялись, нажмите \"Распознать структуру\".",
        tab_summary: "Сводка",
        tab_keywords: "Ключи",
        tab_structure: "Структура",
        tab_issues: "Проблемы",
        tab_all_semantics: "Вся семантика",
        tab_settings: "Настройки",
        stat_chars: "Символы",
        stat_sbt: "СБП",
        stat_words: "Слова",
        stat_blocks: "Блоки",
        stat_h1: "H1",
        stat_lists: "Списки",
        stat_keys_ok: "Ключи OK",
        stat_issues: "Проблемы",
        label_target_volume: "Объем СБП по ТЗ",
        msg_no_target_volume: "Целевой объем не указан.",
        msg_current_volume: "Сейчас {current}/{target} СБП ({delta}).",
        btn_highlight_keys: "Подсветить ключи",
        btn_clear_highlight: "Снять подсветку",
        btn_csv: "CSV",
        hint_highlight: "На больших текстах автоподсветка показывает только переспам и запрещенные ключи. Кнопка подсветит все.",
        total_occurrences: "Вхождения всего: <strong>{found}/{required}</strong>",
        total_keys: "Ключей: <strong>{total}</strong>",
        keys_ok: "OK: <strong>{count}</strong>",
        keys_low: "Мало: <strong>{count}</strong>",
        keys_missing: "Нет: <strong>{count}</strong>",
        keys_overused: "Переспам: <strong>{count}</strong>",
        keys_forbidden: "Запрещенные: <strong>{count}</strong>",
        th_key: "Ключ",
        th_required: "Нужно",
        th_found: "Найдено",
        th_status: "Статус",
        th_density: "Плотность",
        th_line: "Строка",
        empty_keys: "Добавьте ключи в настройках.",
        btn_copy_html: "Скопировать HTML для WP",
        btn_copy_text: "Скопировать текст",
        empty_structure: "Структура появится после проверки.",
        empty_issues: "Проблемы появятся после проверки.",
        all_sem_title: "Вся семантика проекта",
        all_sem_desc: "Вставьте общий список ключей. Если такой ключ найден в тексте, но его нет в текущих ключах страницы, он станет триггером.",
        btn_update: "Обновить",
        all_sem_placeholder: "Можно вставить один столбец, строки из Sheets или таблицу целиком.",
        foreign_keys_title: "Чужие ключи в тексте",
        foreign_keys_empty: "Пока не найдено.",
        btn_clear_sem: "Очистить семантику",
        empty_foreign: "Чужие ключи появятся после проверки.",
        settings_table_title: "Ключи из таблицы",
        settings_table_desc: "Просто скопируйте строки из Google Sheets и вставьте сюда. Шапка не обязательна.",
        mapping_title: "Маппинг колонок",
        mapping_hint: "Обычно не нужен. Откройте только если приложение неправильно определило колонки.",
        map_page: "Страница",
        map_key: "Ключ",
        map_volume: "Частотность",
        map_comment: "Комментарий/Тип",
        map_text_volume: "Объем текста",
        map_required: "Вхождения",
        preview_title: "Предпросмотр ключей",
        preview_empty: "Пока ничего не распознано.",
        btn_clear_keys: "Очистить ключи",
        preview_empty_table: "Вставьте таблицу выше.",
        legacy_format_title: "Ручной формат через |",
        settings_match_mode: "Режим поиска",
        match_exact: "Точное совпадение",
        match_broad: "Широкое совпадение",
        settings_count_mode: "Режим подсчета",
        count_strict: "Strict Exact Match",
        count_independent: "Independent Exact Match",
        settings_case_mode: "Регистр",
        case_insensitive: "Не учитывать",
        case_sensitive: "Учитывать",
        settings_punctuation_mode: "Пунктуация",
        punct_ignore: "Игнорировать",
        punct_respect: "Учитывать",
        btn_save: "Сохранить",
        btn_demo_keys: "Демо-ключи",
        status_foreign: "Чужой",
        status_forbidden: "Запрещен",
        status_ok: "OK",
        status_low: "Мало",
        status_missing: "Нет",
        status_overused: "Переспам",
        issue_no_h1: "Нет H1.",
        issue_multi_h1: "Найдено несколько H1: {count}.",
        issue_empty_tag: "Пустой {tag} в блоке {block}.",
        issue_tag_too_long: "{tag} слишком длинный: {words} слов.",
        issue_hierarchy: "Нарушена иерархия: {tag} идет сразу после {prevTag}.",
        issue_h1_missing: "Основной ключ \"{key}\" не встречается в H1.",
        issue_p1_missing: "Основной ключ \"{key}\" не встречается в первом абзаце.",
        issue_p_too_long: "Слишком длинный абзац: блок {block}, {words} слов.",
        issue_short_text: "Текст очень короткий: меньше 100 слов.",
        issue_foreign_found: "Найден чужой ключ из общей семантики: \"{key}\" ({found})."
    },
    en: {
        title: "SEO Text Checker",
        header_subtitle: "Local SEO Editor",
        btn_demo: "Demo",
        btn_check: "Analyze",
        btn_instructions: "Instructions 📚",
        pane_text: "Editor",
        btn_infer_structure: "Parse Structure",
        btn_clear: "Clear",
        editor_placeholder_title: "Paste your text here",
        editor_placeholder_desc: "You can paste from Google Docs, Word, WordPress, or plain text. If headings are lost, click 'Parse Structure'.",
        tab_summary: "Summary",
        tab_keywords: "Keywords",
        tab_structure: "Structure",
        tab_issues: "Issues",
        tab_all_semantics: "All Semantics",
        tab_settings: "Settings",
        stat_chars: "Characters",
        stat_sbt: "Chars (no space)",
        stat_words: "Words",
        stat_blocks: "Blocks",
        stat_h1: "H1",
        stat_lists: "Lists",
        stat_keys_ok: "Keys OK",
        stat_issues: "Issues",
        label_target_volume: "Target Volume (Chars)",
        msg_no_target_volume: "Target volume not specified.",
        msg_current_volume: "Currently {current}/{target} chars ({delta}).",
        btn_highlight_keys: "Highlight Keys",
        btn_clear_highlight: "Clear Highlights",
        btn_csv: "CSV",
        hint_highlight: "On large texts, auto-highlighting only shows overused and forbidden keys. The button highlights all.",
        total_occurrences: "Total occurrences: <strong>{found}/{required}</strong>",
        total_keys: "Total Keys: <strong>{total}</strong>",
        keys_ok: "OK: <strong>{count}</strong>",
        keys_low: "Low: <strong>{count}</strong>",
        keys_missing: "Missing: <strong>{count}</strong>",
        keys_overused: "Overuse: <strong>{count}</strong>",
        keys_forbidden: "Forbidden: <strong>{count}</strong>",
        th_key: "Keyword",
        th_required: "Required",
        th_found: "Found",
        th_status: "Status",
        th_density: "Density",
        th_line: "Line",
        empty_keys: "Add keywords in Settings.",
        btn_copy_html: "Copy HTML for WP",
        btn_copy_text: "Copy Text",
        empty_structure: "Structure will appear after analysis.",
        empty_issues: "Issues will appear after analysis.",
        all_sem_title: "Project Full Semantics",
        all_sem_desc: "Paste the entire keyword list. If a key is found in the text but is not tracked on this page, it will trigger a warning.",
        btn_update: "Update",
        all_sem_placeholder: "You can paste a single column, Sheet rows, or the entire table.",
        foreign_keys_title: "Foreign Keys in Text",
        foreign_keys_empty: "Not found yet.",
        btn_clear_sem: "Clear Semantics",
        empty_foreign: "Foreign keys will appear after analysis.",
        settings_table_title: "Keywords from Spreadsheet",
        settings_table_desc: "Just copy rows from Google Sheets and paste here. Headers are optional.",
        mapping_title: "Column Mapping",
        mapping_hint: "Usually not needed. Open only if the app misidentified the columns.",
        map_page: "Page",
        map_key: "Keyword",
        map_volume: "Search Volume",
        map_comment: "Comment/Type",
        map_text_volume: "Text Volume (Chars)",
        map_required: "Required Occurences",
        preview_title: "Keyword Preview",
        preview_empty: "Nothing parsed yet.",
        btn_clear_keys: "Clear Keys",
        preview_empty_table: "Paste the table above.",
        legacy_format_title: "Manual Format via |",
        settings_match_mode: "Match Mode",
        match_exact: "Exact Match",
        match_broad: "Broad Match",
        settings_count_mode: "Counting Mode",
        count_strict: "Strict Exact Match",
        count_independent: "Independent Exact Match",
        settings_case_mode: "Case Sensitivity",
        case_insensitive: "Case Insensitive",
        case_sensitive: "Case Sensitive",
        settings_punctuation_mode: "Punctuation",
        punct_ignore: "Ignore Punctuation",
        punct_respect: "Respect Punctuation",
        btn_save: "Save",
        btn_demo_keys: "Demo Keys",
        status_foreign: "Foreign",
        status_forbidden: "Forbidden",
        status_ok: "OK",
        status_low: "Low",
        status_missing: "Missing",
        status_overused: "Overuse",
        issue_no_h1: "No H1 heading.",
        issue_multi_h1: "Found multiple H1: {count}.",
        issue_empty_tag: "Empty {tag} in block {block}.",
        issue_tag_too_long: "Heading {tag} is too long: {words} words.",
        issue_hierarchy: "Broken hierarchy: {tag} appears directly after {prevTag}.",
        issue_h1_missing: "Primary keyword \"{key}\" is missing in H1.",
        issue_p1_missing: "Primary keyword \"{key}\" is missing in the first paragraph.",
        issue_p_too_long: "Paragraph is too long: block {block}, {words} words.",
        issue_short_text: "Text is extremely short: less than 100 words.",
        issue_foreign_found: "Foreign keyword found from global semantics: \"{key}\" ({found})."
    }
};

let currentLang = localStorage.getItem('appLang');
if (!currentLang) {
    currentLang = navigator.language.startsWith('ru') ? 'ru' : 'en';
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('appLang', lang);
    updateDOM();
    if (typeof analyze === "function" && document.getElementById("editor").innerText.trim().length > 0) {
        analyze();
    }
}

function t(key, params = {}) {
    let str = i18n[currentLang][key] || i18n['en'][key] || key;
    for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`{${k}}`, 'g'), v);
    }
    return str;
}

function updateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if (el.placeholder) el.placeholder = t(key);
        } else {
            el.innerHTML = t(key);
        }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.getAttribute('data-i18n-title'));
    });

    const langs = document.querySelectorAll('.lang-btn');
    langs.forEach(btn => {
        if (btn.dataset.lang === currentLang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

window.addEventListener('DOMContentLoaded', updateDOM);
