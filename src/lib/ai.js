// Клиент ИИ-стилиста: ходит в бэкенд-прокси (он держит ключ Anthropic).
import { data } from './store.svelte.js'
import { uid } from './db.js'
import { itemImg, paletteWithShare } from './catalog.js'

const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname)
const BASE = import.meta.env.VITE_AI_BASE || (isLocal ? 'http://localhost:8787' : 'https://ai.sizur.xyz')
const TOKEN = import.meta.env.VITE_AI_TOKEN || ''

function compactItems() {
  return data.items.map((i) => ({
    guid: i.guid,
    category: i.category,
    type: i.type,
    brand: i.brand || null,
    seasons: i.seasons || [],
    colors: (i.colors || []).map((c) => c.rounded || c.hex).filter(Boolean).slice(0, 2),
    archived: !!i.archived,
  }))
}

function styleDNA() {
  const pal = paletteWithShare(data.items, 6).map((p) => `#${p.hex} ${p.pct}%`).join(', ')
  const count = (key) =>
    Object.entries(
      data.items.reduce((m, i) => (i[key] ? ((m[i[key]] = (m[i[key]] || 0) + 1), m) : m), {})
    ).sort((a, b) => b[1] - a[1])
  const brands = count('brand').slice(0, 6).map(([b]) => b).join(', ')
  const types = count('type').slice(0, 6).map(([t]) => t).join(', ')
  return { palette: pal, silhouettes: types, brands }
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(TOKEN ? { 'x-app-token': TOKEN } : {}) },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function buildLook({ brief = '', season = '' } = {}) {
  return post('/stylist/build', { items: compactItems(), styleDNA: styleDNA(), brief, season })
}

export async function checkOutfit(objects) {
  const byGuid = new Map(data.items.map((i) => [i.guid, i]))
  const outfit = (objects || [])
    .map((ob) => byGuid.get(ob.article_guid))
    .filter(Boolean)
    .map((i) => ({
      guid: i.guid,
      type: i.type,
      brand: i.brand || null,
      colors: (i.colors || []).map((c) => c.rounded || c.hex).filter(Boolean).slice(0, 2),
      seasons: i.seasons || [],
    }))
  return post('/stylist/check', { items: compactItems(), styleDNA: styleDNA(), outfit })
}

function loadDims(url) {
  return new Promise((resolve) => {
    const im = new Image()
    im.onload = () => resolve({ w: im.naturalWidth || 200, h: im.naturalHeight || 260 })
    im.onerror = () => resolve({ w: 200, h: 260 })
    im.src = url
  })
}

/** Turn an AI look (itemGuids) into an outfit with a clean auto-layout, ready for the canvas editor. */
export async function lookToOutfit(look) {
  const byGuid = new Map(data.items.map((i) => [i.guid, i]))
  const items = (look.itemGuids || []).map((g) => byGuid.get(g)).filter(Boolean)
  const dims = await Promise.all(items.map((i) => loadDims(itemImg(i))))
  const cols = items.length <= 4 ? 2 : 3
  const cell = 240, gap = 24
  const objects = items.map((it, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const s = Math.min(cell / dims[idx].w, cell / dims[idx].h)
    const w = Math.round(dims[idx].w * s)
    const h = Math.round(dims[idx].h * s)
    const cx = col * (cell + gap) + cell / 2
    const cy = row * (cell + gap) + cell / 2
    return {
      article_guid: it.guid,
      picture: it.picData || it.main_picture,
      kind: 'picture',
      is_article: true,
      x: Math.round(cx - w / 2),
      y: Math.round(cy - h / 2),
      w, h, z: idx, rotation: 0, flipH: false,
    }
  })
  return { guid: uid('outfit'), name: look.name || 'ИИ-образ', seasons: [], picture: '', objects, isNew: true }
}
