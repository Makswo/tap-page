# tap-page.ru

Одностраничники для мастеров и малого бизнеса. Каждая страница — отдельная папка с `index.html`.

| Адрес | Папка |
|---|---|
| tap-page.ru | `index.html` |
| tap-page.ru/anastasia.gurieva | `anastasia-gurieva/` (адрес задан в `vercel.json`) |

Новая страница: создать папку `имя/index.html`; если адрес должен отличаться от имени папки (например, с точкой), добавить в `rewrites` строку вида `{ "source": "/адрес", "destination": "/папка" }`, затем `git add -A`, `git commit`, `git push` — Vercel обновит сайт сам.
