# SEO Keyword Checker

MVP Chrome Extension для SEO-редактора. Расширение читает текст открытого Google Docs, считает ключевые фразы, показывает статусы и умеет подсвечивать найденные совпадения без изменения документа.

## Что уже есть в MVP

- Manifest V3.
- Popup-интерфейс с вкладками Summary, Keywords, Issues, Settings.
- Ручной ввод ключей.
- Подсчет символов с пробелами, символов без пробелов и слов.
- Exact match и упрощенный broad match.
- Регистронезависимый поиск.
- Защита от совпадения внутри слова: `star` не считается внутри `vegastars`.
- Статусы `OK`, `Missing`, `Low`, `Overused`, `Forbidden`, `Not tracked`.
- Плотность ключа в процентах от количества слов.
- Временная подсветка через CSS Highlight API, если текст доступен в DOM.
- Экспорт CSV.
- Базовый тест анализатора.

## Установка локально

1. Откройте Chrome.
2. Перейдите на `chrome://extensions/`.
3. Включите `Developer mode`.
4. Нажмите `Load unpacked`.
5. Выберите папку `D:\WORK\checker_keywoard`.
6. Откройте Google Docs документ.
7. Нажмите иконку расширения.
8. На вкладке Settings вставьте ключи и нажмите `Проверить`.

## Формат ручного ввода ключей

Каждая строка:

```text
keyword | min | max | type | comment
```

Пример:

```text
vegastars | 14 | 17 | primary | бренд
vegastars casino | 8 | 11 | primary | основной ключ
vegastars australia | 3 | 4 | secondary | гео
vegastars pokies | 1 | 2 | secondary | слот-ключ
wrong casino | 0 | 0 | forbidden | чужой интент
```

`min` и `max` можно оставить пустыми. Для запрещенного ключа используйте `type = forbidden`.

## Ограничения MVP

Google Docs часто рендерит документ сложной внутренней DOM-структурой и частично canvas-слоями. MVP читает видимый DOM-текст. В некоторых документах Google Docs может отдавать не весь текст странице сразу, особенно если документ большой и часть страниц не прогружена.

Подсветка реализована через CSS Highlight API. Она не меняет текст документа, но работает только там, где браузер дает доступ к реальным DOM text nodes.

Для стабильной версии 2 лучше добавить Google Docs API для получения полного текста и использовать DOM/overlay только для навигации и визуальной подсветки видимой области.

## Проверка

```powershell
node tests/analyzer.test.js
node --check analyzer.js
node --check content.js
node --check popup.js
```

## Основные файлы

- `manifest.json` - описание расширения.
- `popup.html` - интерфейс.
- `styles.css` - стили popup.
- `popup.js` - управление UI, storage, запуск анализа.
- `analyzer.js` - чистая логика подсчета ключей и метрик.
- `content.js` - чтение Google Docs DOM и временная подсветка.
- `docs/ARCHITECTURE.md` - архитектура.
- `docs/ROADMAP.md` - план разработки.
- `docs/GOOGLE_DOCS_LIMITATIONS.md` - ограничения Google Docs.
