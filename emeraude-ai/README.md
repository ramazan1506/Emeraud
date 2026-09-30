# Émeraude AI

Сайт ИИ-стилиста: главная, о нас, генератор образов, ИИ-консультант, гардероб. Чистые HTML, CSS и JavaScript, без сборки.

## Структура
- `index.html` — разметка
- `css/style.css` — стили и адаптивность
- `js/ai.js` — слой ИИ (сейчас заглушка, здесь подключается Gemini или Grok)
- `js/main.js` — интерфейс и логика

## Запуск
Откройте `index.html` в браузере или запустите расширение Live Server в VS Code.

## Загрузка на GitHub
```
git init
git add .
git commit -m "Émeraude AI: первая версия"
git branch -M main
git remote add origin https://github.com/<логин>/emeraude-ai.git
git push -u origin main
```

## Подключение ИИ
В `js/ai.js` замените тело `askAI()` запросом к вашему серверу, который обращается к Gemini API или API Grok. Ключ API не храните в браузере.
