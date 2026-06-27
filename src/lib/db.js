import Dexie from 'dexie'
import { BASE } from './catalog.js'

// Local-first store. Images stay as static cached files (/pictures/<guid>.webp);
// the *mutable* data (item metadata, outfits with canvas layout, suitcases)
// lives here so edits persist offline. Single user — no sync server in P0.
export const db = new Dexie('stylist')

db.version(1).stores({
  items: 'guid, category, type, brand, archived',
  outfits: 'guid, name',
  suitcases: 'guid',
  meta: 'key',
})
// v2: calendar (date 'YYYY-MM-DD' -> { date, outfitGuid, occasion })
db.version(2).stores({
  items: 'guid, category, type, brand, archived',
  outfits: 'guid, name',
  suitcases: 'guid',
  meta: 'key',
  calendar: 'date',
})

const toPlain = (o) => JSON.parse(JSON.stringify(o))

// Bump to force a reseed from the bundled export (wipes only seeded data).
const SEED_VERSION = 1

/** Seed the DB from the migrated GetWardrobe export on first launch. */
export async function ensureSeeded() {
  const m = await db.meta.get('seed')
  if (m && m.version === SEED_VERSION) return

  const res = await fetch(`${BASE}wardrobe_export.json`)
  if (!res.ok) throw new Error(`не удалось загрузить данные (${res.status})`)
  const data = await res.json()

  await db.transaction('rw', db.items, db.outfits, db.suitcases, db.meta, async () => {
    await Promise.all([db.items.clear(), db.outfits.clear(), db.suitcases.clear()])
    await db.items.bulkPut(data.items)
    // Normalize outfit objects with our editor extensions (rotation/flip).
    const outfits = data.outfits.map((o) => ({
      ...o,
      objects: o.objects.map((ob) => ({ rotation: 0, flipH: false, ...ob })),
    }))
    await db.outfits.bulkPut(outfits)
    await db.suitcases.bulkPut(data.suitcases)
    await db.meta.put({ key: 'seed', version: SEED_VERSION, at: Date.now() })
  })
}

export async function getItems() {
  return db.items.toArray()
}

export async function getOutfits() {
  const list = await db.outfits.toArray()
  // newest-edited first if we have a timestamp, else keep insertion order
  return list
}

export async function saveOutfit(outfit) {
  // Svelte 5 deep-proxies $state; IndexedDB can't structuredClone a Proxy.
  // Round-trip to a plain, cloneable object before persisting.
  await db.outfits.put(toPlain({ ...outfit, updated: Date.now() }))
}

export async function getItem(guid) {
  return db.items.get(guid)
}

export async function saveItem(item) {
  await db.items.put(toPlain(item))
}

export async function getSuitcases() {
  return db.suitcases.toArray()
}

/** Outfits that contain a given item (by article_guid). */
export async function outfitsWithItem(itemGuid) {
  const all = await db.outfits.toArray()
  return all.filter((o) => o.objects.some((ob) => ob.article_guid === itemGuid))
}

// ---- calendar ----
export async function getCalendar() {
  return db.calendar.toArray()
}
export async function setCalendarEntry(date, outfitGuid, occasion = '') {
  await db.calendar.put(toPlain({ date, outfitGuid, occasion }))
}
export async function removeCalendarEntry(date) {
  await db.calendar.delete(date)
}

let _seq = 0
/** Cheap unique-ish id for new outfits/objects (browser, no external dep). */
export function uid(prefix = 'new') {
  _seq += 1
  return `${prefix}-${Date.now().toString(36)}-${_seq}`
}
