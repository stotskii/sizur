# Стиль — ИИ-стилист (прокси к Claude)

Тонкий бэкенд, который держит `ANTHROPIC_API_KEY` на сервере и ходит в Claude
(`claude-opus-4-8`). PWA на GitHub Pages статическая — ключ в клиент класть нельзя,
поэтому ИИ-функции ходят сюда.

## Эндпоинты
- `GET /health` → `{ ok, model }`
- `POST /stylist/build` — «собери лук». Тело: `{ items[], styleDNA, brief?, season? }` → `{ name, itemGuids[], rationale }`
- `POST /stylist/check` — «проверка образа». Тело: `{ items[], outfit[], styleDNA }` → `{ verdict, score, dimensions[], summary }`

`items` — компактный гардероб (guid/категория/тип/бренд/цвета/сезоны). Каталог
кэшируется (prompt caching), так что повторные вызовы дешёвые.

## Локально
```bash
cp stylist-ai.env.example stylist-ai.env   # вписать ANTHROPIC_API_KEY
npm install
ANTHROPIC_API_KEY=... node index.js        # или через env_file
curl localhost:8787/health
```

## Деплой на Hetzner (46.224.164.185)
1. Скопировать папку `server/` на сервер (или склонировать репо и взять её).
2. Создать `stylist-ai.env`:
   - `ANTHROPIC_API_KEY` — можно переиспользовать из `~/secrets/server1/cyprus.env`.
   - `APP_TOKEN` — придумать строку (та же пойдёт в PWA как `VITE_AI_TOKEN`).
   - `ALLOW_ORIGINS=https://sizur.xyz,http://localhost:5173`
3. `docker compose up -d --build` (слушает `127.0.0.1:8787`).
4. Завести поддомен и TLS, например `ai.sizur.xyz`:
   - DNS: A-запись `ai.sizur.xyz → 46.224.164.185` (Spaceship).
   - Реверс-прокси (nginx/Caddy) с Let's Encrypt → `proxy_pass http://127.0.0.1:8787;`
     Caddy одной строкой: `ai.sizur.xyz { reverse_proxy 127.0.0.1:8787 }`
5. В PWA выставить `VITE_AI_BASE=https://ai.sizur.xyz` и `VITE_AI_TOKEN=<APP_TOKEN>` при сборке
   (или поправить дефолт в `src/lib/ai.js`), пересобрать и задеплоить.

## Безопасность
- `APP_TOKEN` виден в клиентском бандле (PWA публичная) — это занавес от случайных, не замок.
  Настоящая защита доступа к ИИ — серверный rate-limit/квоты. Для 1 пользователя ок.
- CORS ограничен `ALLOW_ORIGINS`. Контейнер слушает только loopback; наружу — через TLS-прокси.
