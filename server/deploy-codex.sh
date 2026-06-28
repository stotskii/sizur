#!/usr/bin/env bash
# Развёртывание ИИ-стилиста на codex (подписка ChatGPT) на server1.
# Запускать ПОД root ПОСЛЕ восстановления SSH. Идемпотентно.
set -euo pipefail

command -v node >/dev/null || { echo "Нужен Node 20+. Поставь node и повтори."; exit 1; }
echo ">> ставлю codex CLI…"
npm i -g @openai/codex

mkdir -p /opt/stylist && cd /opt/stylist
if [ -d sizur/.git ]; then (cd sizur && git pull --ff-only); else git clone https://github.com/stotskii/sizur; fi

cat > /opt/stylist/sizur/server/stylist-ai.env <<'ENV'
AI_PROVIDER=codex
# CODEX_MODEL=  (пусто = дефолтная модель codex, проверено: gpt-5.5)
PORT=8787
ALLOW_ORIGINS=https://sizur.xyz
APP_TOKEN=
ENV

cp /opt/stylist/sizur/server/stylist-ai.service /etc/systemd/system/stylist-ai.service
systemctl daemon-reload

cat <<'NEXT'

================ ДАЛЬШЕ ВРУЧНУЮ (1 раз) ================
1) Войти подпиской ChatGPT:
     codex login
   (на headless-сервере codex покажет URL — открой его в браузере; колбэк через
    ssh -L 1455:localhost:1455 root@46.224.164.185, либо codex login --help)

2) Проверить, что codex ровно отдаёт JSON:
     codex exec --skip-git-repo-check 'Reply with ONLY this JSON: {"ok": true}'

3) Запустить сервис и проверить:
     systemctl enable --now stylist-ai
     curl localhost:8787/health        # provider: codex

4) Реверс-прокси с TLS (Caddy):  ai.sizur.xyz { reverse_proxy 127.0.0.1:8787 }
   DNS ai.sizur.xyz уже указывает на этот сервер.
=======================================================
NEXT
