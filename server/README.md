# Стиль — ИИ-стилист (прокси)

Тонкий бэкенд без npm-зависимостей (только Node 20+, global `fetch`). Держит ключ
на сервере; PWA на GitHub Pages статическая — ключ в клиент класть нельзя.

**Мультипровайдер** — выбор одним env `AI_PROVIDER` (все три проверены кодом, OpenAI и
OpenRouter — на реальных вызовах):

| `AI_PROVIDER` | модель | ключ | статус |
|---|---|---|---|
| `openai` | `gpt-4.1` | `OPENAI_API_KEY` (shared.env) | ✓ работает сразу |
| `anthropic` | `claude-opus-4-8` | `ANTHROPIC_API_KEY` (cyprus.env) | нужен баланс (сейчас $0) |
| `openrouter` | `anthropic/claude-opus-4.8` | `OPENROUTER_API_KEY` (cyprus.env) | ✓ работает, но через посредника |

Сменить модель внутри провайдера — `AI_MODEL`. Промпты одинаковы для всех.

**`AI_PROVIDER=codex`** — по подписке ChatGPT через официальный CLI `codex exec` (Sign in with
ChatGPT). Не HTTP, а shell-out в codex; на сервере должен быть установлен `codex` и сделан
`codex login` твоей подпиской. Флаги codex задаются `CODEX_ARGS`, модель — `CODEX_MODEL`/`AI_MODEL`.
Не проверено отсюда (codex не установлен) — тестировать на сервере. Тяжелее/медленнее HTTP-провайдеров
и юзает кодинг-агент с песочницей как движок; для этой задачи overkill. См. ниже.

## Эндпоинты
- `GET /health` → `{ ok, model, base, hasKey }`
- `POST /stylist/build` — «собери лук». `{ items[], styleDNA, brief?, season? }` → `{ name, itemGuids[], rationale }`
- `POST /stylist/check` — «проверка образа». `{ items[], outfit[], styleDNA }` → `{ verdict, score, dimensions[], summary }`

`items` — компактный гардероб (guid/категория/тип/бренд/цвета/сезоны).

## Локально
```bash
cp stylist-ai.env.example stylist-ai.env   # вписать OPENROUTER_API_KEY
OPENROUTER_API_KEY=sk-or-... node index.js
curl localhost:8787/health
# MOCK=1 node index.js  — без вызовов модели, для проверки UI
```

## Деплой на Hetzner (46.224.164.185)
1. Скопировать `server/` на сервер.
2. Создать `stylist-ai.env`:
   - По умолчанию **как у агента hermes**: `AI_PROVIDER=openrouter` + `OPENROUTER_API_KEY`
     из `~/secrets/server1/cyprus.env` (тот же ключ с балансом, что читает hermes).
     Альтернативы: `openai` + `OPENAI_API_KEY` (shared.env) или `anthropic` + пополненный ключ.
   - `APP_TOKEN` — можно пусто (занавес; для 1 пользователя достаточно CORS).
   - `ALLOW_ORIGINS=https://sizur.xyz,http://localhost:5173`
3. `docker compose up -d --build` (слушает `127.0.0.1:8787`).
4. Поддомен + TLS, например `ai.sizur.xyz`:
   - DNS: A-запись `ai.sizur.xyz → 46.224.164.185` (Spaceship).
   - Caddy одной строкой: `ai.sizur.xyz { reverse_proxy 127.0.0.1:8787 }`
5. PWA уже смотрит на `https://ai.sizur.xyz` по умолчанию — после шагов 1–4 ИИ заработает
   без пересборки фронта (если `APP_TOKEN` пустой). Если задашь токен — собрать PWA
   с `VITE_AI_TOKEN=<токен>`.

## Вариант: подписка ChatGPT через Codex (`AI_PROVIDER=codex`)
Не HTTP, а shell-out в официальный `codex exec`. Прокси запускать **на хосте** (где codex
установлен и залогинен), не в Docker.
```bash
npm i -g @openai/codex            # или brew install codex
codex login                       # вход твоей подпиской ChatGPT (headless: codex login --help)
cd sizur/server
AI_PROVIDER=codex CODEX_MODEL=gpt-5-codex PORT=8787 \
  ALLOW_ORIGINS=https://sizur.xyz node index.js
curl localhost:8787/health        # provider: codex
```
Затем тот же Caddy `ai.sizur.xyz { reverse_proxy 127.0.0.1:8787 }`. Флаги codex могут отличаться
по версии — правятся через `CODEX_ARGS`. Минусы: медленнее, кодинг-агент с песочницей как движок,
ToS-серость (OpenAI может троттлить app-бэкенд на подписке). Выгоды над OpenRouter нет.

## Стоимость
claude-opus-4.8 ($5/$25 за 1M ток.). Один вызов «собери лук» ≈ 10–12k входных
(гардероб кэшируется у Anthropic) + ~0.3k выход → центы. Для 1 пользователя пару раз
в неделю — копейки. Хочешь дешевле — `AI_MODEL=anthropic/claude-sonnet-4.6`.

## Безопасность
- Контейнер слушает только loopback; наружу — через TLS-прокси. CORS ограничен `ALLOW_ORIGINS`.
- `APP_TOKEN` виден в клиентском бандле (PWA публичная) — занавес, не замок. Реальная защита
  от абуза ИИ — серверный rate-limit/квоты. Для одного пользователя не критично.
