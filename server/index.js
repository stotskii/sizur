// Стиль — ИИ-стилист, прокси к Claude.
// Держит ANTHROPIC_API_KEY на сервере; PWA (статика на GitHub Pages) ходит сюда.
// Модель claude-opus-4-8, structured outputs, гардероб кэшируется (prompt caching).
import http from 'node:http'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic() // читает ANTHROPIC_API_KEY из окружения
const MODEL = 'claude-opus-4-8'
const PORT = Number(process.env.PORT || 8787)
const APP_TOKEN = process.env.APP_TOKEN || '' // общий токен от клиента (занавес, не замок)
const ALLOW_ORIGINS = (process.env.ALLOW_ORIGINS ||
  'https://sizur.xyz,http://localhost:5173,http://localhost:4173')
  .split(',').map((s) => s.trim())

// ---------- helpers ----------
const json = (res, code, obj, origin) => {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    ...cors(origin),
  })
  res.end(JSON.stringify(obj))
}

function cors(origin) {
  const allow = ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0]
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-headers': 'content-type, x-app-token',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'origin',
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > 2_000_000) req.destroy() // ~2MB guard
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

// Compact, deterministic catalog (sorted → stable prefix → prompt-cache hits).
function catalogLines(items) {
  return items
    .slice()
    .sort((a, b) => (a.guid < b.guid ? -1 : 1))
    .map((i) => {
      const colors = (i.colors || [])
        .map((c) => (typeof c === 'string' ? c : c.rounded || c.hex))
        .filter(Boolean)
        .slice(0, 3)
        .join('/')
      const seasons = (i.seasons || []).join(',') || 'всесезон'
      const tag = i.archived ? ' [на выброс]' : ''
      return `${i.guid} | ${i.category} | ${i.type}${i.brand ? ' · ' + i.brand : ''} | ${seasons} | #${colors || '?'}${tag}`
    })
    .join('\n')
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
- Отвечай по-русски, кратко и по делу. Возвращай строго JSON по заданной схеме.`
}

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'короткое название образа, 1-3 слова' },
    itemGuids: { type: 'array', items: { type: 'string' }, description: 'guid вещей образа, 4-7 штук' },
    rationale: { type: 'string', description: '1-2 предложения, почему это в её стиле' },
  },
  required: ['name', 'itemGuids', 'rationale'],
  additionalProperties: false,
}

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['in_style', 'neutral', 'off'] },
    score: { type: 'integer', description: '0-100, насколько в её едином стиле' },
    dimensions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'палитра | силуэт | формальность | тир бренда' },
          verdict: { type: 'string', enum: ['good', 'neutral', 'off'] },
          note: { type: 'string' },
        },
        required: ['name', 'verdict', 'note'],
        additionalProperties: false,
      },
    },
    summary: { type: 'string', description: '1-2 предложения вердикта по-русски' },
  },
  required: ['verdict', 'score', 'dimensions', 'summary'],
  additionalProperties: false,
}

async function callClaude({ items, dna, userText, schema, effort = 'medium' }) {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    thinking: { type: 'adaptive' },
    output_config: { effort, format: { type: 'json_schema', schema } },
    system: [
      { type: 'text', text: systemPrompt(items, dna), cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userText }],
  })
  if (resp.stop_reason === 'refusal') throw new Error('refusal')
  const text = resp.content.find((b) => b.type === 'text')?.text || '{}'
  return { data: JSON.parse(text), usage: resp.usage }
}

// ---------- routes ----------
const MOCK = process.env.MOCK === '1' // local UI testing without spending credits

async function handleBuild(body) {
  const items = body.items || []
  const brief = (body.brief || '').slice(0, 300)
  const season = body.season || ''
  if (MOCK) {
    const pick = (cat) => items.find((i) => i.category === cat && !i.archived)?.guid
    const guids = [pick('Одежда'), pick('Обувь'), pick('Аксессуары'), pick('Головные уборы')]
      .concat(items.filter((i) => i.category === 'Одежда' && !i.archived).slice(1, 3).map((i) => i.guid))
      .filter(Boolean)
    return { name: 'Лёгкий городской', itemGuids: [...new Set(guids)].slice(0, 6), rationale: '(MOCK) Спокойная пудровая палитра, wide-leg силуэт — ровно ваш единый стиль.' }
  }
  const userText = `Собери ОДИН цельный образ из гардероба${brief ? ` для: ${brief}` : ''}${season ? `, сезон: ${season}` : ''}. 4–7 вещей. Верни name, itemGuids (только guid из списка), rationale.`
  const { data, usage } = await callClaude({ items, dna: body.styleDNA, userText, schema: BUILD_SCHEMA, effort: 'medium' })
  // keep only guids that really exist (guard against hallucinations)
  const valid = new Set(items.map((i) => i.guid))
  data.itemGuids = (data.itemGuids || []).filter((g) => valid.has(g)).slice(0, 8)
  return { ...data, usage }
}

async function handleCheck(body) {
  const items = body.items || []
  const outfit = body.outfit || [] // [{guid,type,brand,colors,seasons}]
  if (MOCK) {
    return {
      verdict: 'in_style', score: 82,
      dimensions: [
        { name: 'палитра', verdict: 'good', note: 'спокойные приглушённые тона, всё в гамме' },
        { name: 'силуэт', verdict: 'good', note: 'wide-leg низ + мягкий верх — ваш силуэт' },
        { name: 'формальность', verdict: 'neutral', note: 'elevated-casual, чуть на каждый день' },
        { name: 'тир бренда', verdict: 'good', note: 'quiet-luxury, согласованно' },
      ],
      summary: '(MOCK) Цельный образ в вашем едином стиле, мелкий минус по формальности.',
    }
  }
  const lines = outfit
    .map((o) => `- ${o.type}${o.brand ? ' · ' + o.brand : ''} (${(o.colors || []).map((c) => (typeof c === 'string' ? c : c.rounded || c.hex)).filter(Boolean).join('/')})`)
    .join('\n')
  const userText = `Оцени, насколько ЭТОТ образ соответствует её единому стилю. Разбери по осям: палитра, силуэт, формальность, тир бренда. Верни verdict, score (0-100), dimensions, summary.\n\nОБРАЗ:\n${lines}`
  const { data, usage } = await callClaude({ items, dna: body.styleDNA, userText, schema: CHECK_SCHEMA, effort: 'high' })
  return { ...data, usage }
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || ''
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors(origin))
    return res.end()
  }
  const url = req.url || '/'
  if (req.method === 'GET' && url === '/health') {
    return json(res, 200, { ok: true, model: MODEL }, origin)
  }
  if (req.method !== 'POST') return json(res, 404, { error: 'not found' }, origin)

  if (APP_TOKEN && req.headers['x-app-token'] !== APP_TOKEN) {
    return json(res, 401, { error: 'unauthorized' }, origin)
  }

  let body
  try {
    body = await readBody(req)
  } catch {
    return json(res, 400, { error: 'bad json' }, origin)
  }

  try {
    if (url === '/stylist/build') return json(res, 200, await handleBuild(body), origin)
    if (url === '/stylist/check') return json(res, 200, await handleCheck(body), origin)
    return json(res, 404, { error: 'not found' }, origin)
  } catch (e) {
    const msg = e?.message === 'refusal' ? 'ИИ отклонил запрос' : 'ошибка ИИ'
    console.error('error on', url, ':', e?.message || e)
    return json(res, 502, { error: msg }, origin)
  }
})

server.listen(PORT, () => console.log(`stylist-ai-proxy on :${PORT} (model ${MODEL})`))
