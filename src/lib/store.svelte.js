// Central reactive data store (Svelte 5 runes). Loaded once after seeding;
// mutating these arrays reflects everywhere that reads them.
import { getItems, getOutfits, getSuitcases } from './db.js'

export const data = $state({
  items: [],
  outfits: [],
  suitcases: [],
  loaded: false,
})

export async function loadAll() {
  const [items, outfits, suitcases] = await Promise.all([
    getItems(),
    getOutfits(),
    getSuitcases(),
  ])
  data.items = items
  data.outfits = outfits
  data.suitcases = suitcases
  data.loaded = true
}

export function patchItem(updated) {
  const i = data.items.findIndex((x) => x.guid === updated.guid)
  if (i >= 0) data.items[i] = updated
}

export function addItemToStore(item) {
  data.items = [item, ...data.items]
}

export function patchOutfit(updated) {
  const i = data.outfits.findIndex((x) => x.guid === updated.guid)
  if (i >= 0) data.outfits[i] = updated
  else data.outfits.push(updated)
}
