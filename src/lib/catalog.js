// Shared constants + helpers for the wardrobe domain.

export const BASE = import.meta.env.BASE_URL

/**
 * URL of a cutout/collage image. Migrated images are GUIDs resolving to
 * /public/pictures/<guid>.webp; user-added cutouts are already data:/blob URLs
 * and pass through unchanged.
 */
export const picUrl = (g) => {
  if (!g) return ''
  if (g.startsWith('data:') || g.startsWith('blob:') || g.startsWith('http')) return g
  return `${BASE}pictures/${g}.webp`
}

/** Display image for an item: a user-added cutout if present, else its migrated picture. */
export const itemImg = (item) => (item && (item.picData || picUrl(item.main_picture))) || ''

/**
 * Best available thumbnail for an outfit, in order:
 *  1. our freshly re-rendered thumb (after an edit)
 *  2. the clean collage we composited from transparent cutouts (col_*)
 *  3. the migrated GetWardrobe collage (last resort — has black item boxes)
 */
export const outfitThumb = (o) =>
  (o && (o.thumbDataUrl || (o.collage && picUrl(o.collage)) || picUrl(o.picture))) || ''

export const SEASONS = {
  spring: 'Весна',
  summer: 'Лето',
  autumn: 'Осень',
  winter: 'Зима',
}
export const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter']

// Category order matches her usage (clothes dominate, then accessories/shoes/hats).
export const CATEGORY_ORDER = ['Одежда', 'Обувь', 'Аксессуары', 'Головные уборы']

/** sRGB hex (e.g. "6E5B5E") -> {r,g,b} */
export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function dist(a, b) {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
}

/**
 * Build a compact, deduped color palette from all items by clustering their
 * dominant `rounded` colors. Returns [{hex, count}] sorted by frequency,
 * capped to `max` (anti-overload: no bloated color list).
 */
export function buildPalette(items, max = 10, mergeThreshold = 1100) {
  const buckets = []
  for (const it of items) {
    const top = (it.colors || [])[0]
    if (!top) continue
    const rgb = hexToRgb(top.rounded || top.hex)
    let hit = null
    for (const b of buckets) {
      if (dist(b.rgb, rgb) < mergeThreshold) {
        hit = b
        break
      }
    }
    if (hit) hit.count++
    else buckets.push({ hex: (top.rounded || top.hex).toUpperCase(), rgb, count: 1 })
  }
  return buckets.sort((a, b) => b.count - a.count).slice(0, max)
}

/** Does an item belong to a chosen palette color (nearest-bucket match)? */
export function itemMatchesColor(item, swatchHex, threshold = 1100) {
  const target = hexToRgb(swatchHex)
  return (item.colors || []).some((c) => dist(hexToRgb(c.rounded || c.hex), target) < threshold)
}

/** Palette with share %, for the Style DNA passport. */
export function paletteWithShare(items, max = 8) {
  const pal = buildPalette(items, max)
  const total = pal.reduce((s, p) => s + p.count, 0) || 1
  return pal.map((p) => ({ ...p, pct: Math.round((p.count / total) * 100) }))
}

/** Northern-hemisphere season from a Date (Cyprus). */
export function currentSeason(d = new Date()) {
  const m = d.getMonth() // 0..11
  if (m <= 1 || m === 11) return 'winter'
  if (m <= 4) return 'spring'
  if (m <= 7) return 'summer'
  return 'autumn'
}

export const isoDate = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}
