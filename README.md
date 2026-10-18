# tap-page.ru

Одностраничники для мастеров и малого бизнеса. Каждая страница — отдельная папка с `index.html`.

| Адрес | Папка |
|---|---|
| tap-page.ru | `index.html` |
| tap-page.ru/anastasia.gurieva | `anastasia-gurieva/` (адрес задан в `vercel.json`) |

Новая страница: создать папку `имя/index.html`, при необходимости добавить строку в `rewrites` в `vercel.json`, затем `git add -A`, `git commit`, `git push` — Vercel обновит сайт сам.
