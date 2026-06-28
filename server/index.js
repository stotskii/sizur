// Стиль — ИИ-стилист, прокси. Держит ключ на сервере; PWA (статика) ходит сюда.
// Мультипровайдер: AI_PROVIDER = anthropic | openai | openrouter (по умолч. openrouter).
//   anthropic  → нативный Messages API, claude-opus-4-8 (нужен ANTHROPIC_API_KEY с балансом)
//   openai     → gpt-4.1 (OPENAI_API_KEY)
//   openrouter → anthropic/claude-opus-4.8 (OPENROUTER_API_KEY)
import http from 'node:http'
import fs from 'node:fs'
import { execFile } from 'node:child_process'

const PROVIDER = process.env.AI_PROVIDER || 'openrouter'
const DEFAULTS = {
  // claude по ПОДПИСКЕ через OAuth (как Claude Code) — без API-кредитов
  'anthropic-oauth': { model: 'claude-opus-4-8', base: 'https://api.anthropic.com/v1', key: null },
  anthropic: { model: 'claude-opus-4-8', base: 'https://api.anthropic.com/v1', key: process.env.ANTHROPIC_API_KEY },
  openai: { model: 'gpt-4.1', base: 'https://api.openai.com/v1', key: process.env.OPENAI_API_KEY },
  openrouter: { model: 'anthropic/claude-opus-4.8', base: 'https://openrouter.ai/api/v1', key: process.env.OPENROUTER_API_KEY },
}
// codex — официальный CLI `codex exec` по подписке ChatGPT (Sign in with ChatGPT).
DEFAULTS.codex = { model: process.env.CODEX_MODEL || 'gpt-5-codex', base: '', key: null }
const cfg = DEFAULTS[PROVIDER] || DEFAULTS.openrouter
const MODEL = process.env.AI_MODEL || cfg.model
const AI_BASE = process.env.AI_BASE_URL || cfg.base
const AI_KEY = process.env.AI_KEY || cfg.key || ''
const PORT = Number(process.env.PORT || 8787)
const APP_TOKEN = process.env.APP_TOKEN || ''
const MOCK = process.env.MOCK === '1'
const ALLOW_ORIGINS = (process.env.ALLOW_ORIGINS ||
  'https://sizur.xyz,http://localhost:5173,http://localhost:4173')
  .split(',').map((s) => s.trim())

// ---------- http helpers ----------
function cors(origin) {
  const allow = ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0]
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-headers': 'content-type, x-app-token',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'origin',
  }
}
const json = (res, code, obj, origin) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', ...cors(origin) })
  res.end(JSON.stringify(obj))
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => { data += c; if (data.length > 2_000_000) req.destroy() })
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}

// ---------- prompt building ----------
function catalogLines(items) {
  return items.slice().sort((a, b) => (a.guid < b.guid ? -1 : 1)).map((i) => {
    const colors = (i.colors || []).map((c) => (typeof c === 'string' ? c : c.rounded || c.hex)).filter(Boolean).slice(0, 3).join('/')
    const seasons = (i.seasons || []).join(',') || 'всесезон'
    return `${i.guid} | ${i.category} | ${i.type}${i.brand ? ' · ' + i.brand : ''} | ${seasons} | #${colors || '?'}${i.archived ? ' [на выброс]' : ''}`
  }).join('\n')
}
function dnaBlock(dna = {}) {
  return [
    `Палитра: ${dna.palette || 'приглушённые «сложные» светлые тона — пудра, серо-голубой, серо-зелёный, бордо-шоколад'}`,
    `Силуэты/типы: ${dna.silhouettes || 'wide-leg джинсы, струящиеся брюки, макси-юбки, оверсайз-футболки/свитшоты, рубашки с топами'}`,
    `Бренды/тир: ${dna.brands || 'quiet-luxury — COS, Massimo Dutti, Margiela, Acne, Lululemon'}`,
  ].join('\n- ')
}
function systemPrompt(items, dna) {
  return `Ты — личный стилист Екатерины. Её эстетика — тихий люкс, elevated-casual, спокойные приглушённые тона. Главный принцип: ЕДИНЫЙ узнаваемый стиль — согласованность палитры и силуэта важнее разнообразия.

STYLE DNA:
- ${dnaBlock(dna)}

ГАРДЕРОБ (формат: guid | категория | тип·бренд | сезоны | цвета):
${catalogLines(items)}

Правила:
- Работай ТОЛЬКО с вещами из гардероба, ссылайся строго по guid из списка.
- Цельный образ = низ+верх (или платье) + обувь, обычно сумка, по желанию верхняя одежда/аксессуар.
- Держи единую палитру и силуэт; не мешай спорт и вечер без причины.
- Не используй вещи с пометкой [на выброс].
- Отвечай по-русски, кратко. Возвращай ТОЛЬКО валидный JSON, без markdown и пояснений вокруг.`
}

async function callModel(args) {
  if (PROVIDER === 'codex') return callCodex(args)
  if (PROVIDER === 'anthropic-oauth') return callAnthropicOAuth(args)
  if (PROVIDER === 'anthropic') return callAnthropic(args)
  return callOpenAICompat(args)
}

// Codex CLI (`codex exec`) по подписке ChatGPT. Нужен установленный codex + `codex login`.
// Флаги могут отличаться по версии codex — правятся через CODEX_ARGS (через пробел).
const CODEX_BIN = process.env.CODEX_BIN || 'codex'
const CODEX_EXTRA = (process.env.CODEX_ARGS || '--skip-git-repo-check --sandbox read-only').split(' ').filter(Boolean)
function callCodex({ system, user }) {
  const prompt = `${system}\n\n${user}\n\nВыведи ТОЛЬКО валидный JSON-объект, без markdown и текста вокруг.`
  const args = ['exec', ...CODEX_EXTRA]
  if (MODEL) args.push('-m', MODEL)
  args.push(prompt)
  return new Promise((resolve, reject) => {
    execFile(CODEX_BIN, args, { timeout: 150_000, maxBuffer: 12 * 1024 * 1024 }, (err, stdout, stderr) => {
      const out = stdout || ''
      if (err && !out) return reject(new Error('codex: ' + String(stderr || err.message).slice(0, 200)))
      try { resolve(parseJson(out)) } catch (e) { reject(new Error('codex дал не JSON: ' + out.slice(-200))) }
    })
  })
}

// ---- Claude по подписке (OAuth, как Claude Code) ----
const OAUTH_CLIENT_ID = process.env.ANTHROPIC_OAUTH_CLIENT_ID || '9d1c250a-e61b-44d9-88ed-5944d1962f5e'
const OAUTH_TOKEN_URL = process.env.ANTHROPIC_OAUTH_TOKEN_URL || 'https://console.anthropic.com/v1/oauth/token'
const RT_FILE = process.env.ANTHROPIC_REFRESH_TOKEN_FILE || '/data/refresh_token'
let _oauth = { access: null, exp: 0 }

function readRefreshToken() {
  try { const t = fs.readFileSync(RT_FILE, 'utf8').trim(); if (t) return t } catch {}
  return (process.env.ANTHROPIC_REFRESH_TOKEN || '').trim()
}
function persistRefreshToken(t) {
  try { fs.mkdirSync(RT_FILE.replace(/\/[^/]*$/, ''), { recursive: true }); fs.writeFileSync(RT_FILE, t) } catch (e) { console.error('cannot persist refresh token:', e.message) }
}
async function oauthAccessToken() {
  const now = Date.now()
  if (_oauth.access && now < _oauth.exp - 60_000) return _oauth.access
  const rt = readRefreshToken()
  if (!rt) throw new Error('нет ANTHROPIC_REFRESH_TOKEN (войди в подписку через OAuth)')
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: rt, client_id: OAUTH_CLIENT_ID }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || !j.access_token) throw new Error('oauth refresh failed: ' + (j.error_description || j.error || res.status))
  _oauth.access = j.access_token
  _oauth.exp = now + (j.expires_in || 3600) * 1000
  if (j.refresh_token && j.refresh_token !== rt) persistRefreshToken(j.refresh_token) // ротация
  return _oauth.access
}
async function callAnthropicOAuth({ system, user, maxTokens = 2000 }) {
  const tok = await oauthAccessToken()
  const res = await fetch(`${AI_BASE}/messages`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${tok}`,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'oauth-2025-04-20',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.type === 'error') throw new Error(j.error?.message || `HTTP ${res.status}`)
  const text = (j.content || []).find((b) => b.type === 'text')?.text || '{}'
  return parseJson(text)
}

// Anthropic Messages API (нативно), без SDK.
async function callAnthropic({ system, user, maxTokens = 2000 }) {
  const res = await fetch(`${AI_BASE}/messages`, {
    method: 'POST',
    headers: { 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.type === 'error') throw new Error(j.error?.message || `HTTP ${res.status}`)
  const text = (j.content || []).find((b) => b.type === 'text')?.text || '{}'
  return parseJson(text)
}

// OpenAI-совместимый (OpenAI / OpenRouter).
async function callOpenAICompat({ system, user, maxTokens = 2000 }) {
  const res = await fetch(`${AI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${AI_KEY}`,
      'content-type': 'application/json',
      'http-referer': 'https://sizur.xyz',
      'x-title': 'Stylist (sizur.xyz)',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.error) throw new Error(j.error?.message || `HTTP ${res.status}`)
  const text = j.choices?.[0]?.message?.content || '{}'
  return parseJson(text)
}
function parseJson(t) {
  try { return JSON.parse(t) } catch {
    const m = t.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('модель вернула не JSON')
  }
}

// ---------- routes ----------
async function handleBuild(body) {
  const items = body.items || []
  const brief = (body.brief || '').slice(0, 300)
  const season = body.season || ''
  if (MOCK) {
    const pick = (cat) => items.find((i) => i.category === cat && !i.archived)?.guid
    const guids = [pick('Одежда'), pick('Обувь'), pick('Аксессуары'), pick('Головные уборы')]
      .concat(items.filter((i) => i.category === 'Одежда' && !i.archived).slice(1, 3).map((i) => i.guid)).filter(Boolean)
    return { name: 'Лёгкий городской', itemGuids: [...new Set(guids)].slice(0, 6), rationale: '(MOCK) Спокойная пудровая палитра, wide-leg силуэт.' }
  }
  const user = `Собери ОДИН цельный образ из гардероба${brief ? ` для: ${brief}` : ''}${season ? `, сезон: ${season}` : ''}. 4–7 вещей.
Верни ТОЛЬКО JSON вида: {"name": "короткое название", "itemGuids": ["guid", ...только из списка], "rationale": "1-2 предложения почему это в её стиле"}.`
  const data = await callModel({ system: systemPrompt(items, body.styleDNA), user, maxTokens: 1500 })
  const valid = new Set(items.map((i) => i.guid))
  data.itemGuids = (data.itemGuids || []).filter((g) => valid.has(g)).slice(0, 8)
  return data
}

async function handleCheck(body) {
  const items = body.items || []
  const outfit = body.outfit || []
  if (MOCK) {
    return {
      verdict: 'in_style', score: 82,
      dimensions: [
        { name: 'палитра', verdict: 'good', note: 'спокойные приглушённые тона' },
        { name: 'силуэт', verdict: 'good', note: 'wide-leg низ + мягкий верх' },
        { name: 'формальность', verdict: 'neutral', note: 'elevated-casual' },
        { name: 'тир бренда', verdict: 'good', note: 'quiet-luxury, согласованно' },
      ],
      summary: '(MOCK) Цельный образ в вашем стиле.',
    }
  }
  const lines = outfit.map((o) => `- ${o.type}${o.brand ? ' · ' + o.brand : ''} (${(o.colors || []).map((c) => (typeof c === 'string' ? c : c.rounded || c.hex)).filter(Boolean).join('/')})`).join('\n')
  const user = `Оцени, насколько ЭТОТ образ соответствует её единому стилю — по осям: палитра, силуэт, формальность, тир бренда.
Верни ТОЛЬКО JSON вида: {"verdict": "in_style"|"neutral"|"off", "score": 0-100, "dimensions": [{"name": "палитра"|"силуэт"|"формальность"|"тир бренда", "verdict": "good"|"neutral"|"off", "note": "коротко"}], "summary": "1-2 предложения"}.

ОБРАЗ:
${lines}`
  return callModel({ system: systemPrompt(items, body.styleDNA), user, maxTokens: 1500 })
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || ''
  if (req.method === 'OPTIONS') { res.writeHead(204, cors(origin)); return res.end() }
  const url = req.url || '/'
  if (req.method === 'GET' && url === '/health') {
    return json(res, 200, { ok: true, provider: PROVIDER, model: MODEL, base: AI_BASE, hasKey: !!AI_KEY }, origin)
  }
  if (req.method !== 'POST') return json(res, 404, { error: 'not found' }, origin)
  if (APP_TOKEN && req.headers['x-app-token'] !== APP_TOKEN) return json(res, 401, { error: 'unauthorized' }, origin)

  let body
  try { body = await readBody(req) } catch { return json(res, 400, { error: 'bad json' }, origin) }
  try {
    if (url === '/stylist/build') return json(res, 200, await handleBuild(body), origin)
    if (url === '/stylist/check') return json(res, 200, await handleCheck(body), origin)
    return json(res, 404, { error: 'not found' }, origin)
  } catch (e) {
    console.error('error on', url, ':', e?.message || e)
    return json(res, 502, { error: 'ошибка ИИ: ' + (e?.message || 'unknown') }, origin)
  }
})
server.listen(PORT, () => console.log(`stylist-ai-proxy on :${PORT} (${MODEL} via ${AI_BASE})`))
