import { tick } from 'svelte'

// Tiny global UI state using Svelte 5 runes. Mutate properties to stay reactive
// across modules (don't reassign the export).
export const ui = $state({
  tab: 'wardrobe', // today | wardrobe | outfits | stylist
  editorOutfit: null, // outfit open in the canvas editor, or null
  detailItem: null, // item open in the detail sheet, or null
  screen: '', // pushed full-screen route: '' | 'suitcases' | 'suitcase' | 'calendar'
  suitcase: null, // open suitcase object (for screen 'suitcase')
  plusSheet: false, // the "+" action menu
  photoImport: false, // add-item-from-photo flow
  toast: '',
})

let _t
export function toast(msg) {
  ui.toast = msg
  clearTimeout(_t)
  _t = setTimeout(() => (ui.toast = ''), 2200)
}

/**
 * Run a state mutation inside a View Transition for a smooth crossfade
 * (used for opening/closing the canvas editor — masks its lazy-chunk load).
 * Feature-detected: falls back to an instant mutation where unsupported.
 */
export function vt(mutate) {
  if (typeof document === 'undefined' || !document.startViewTransition) {
    mutate()
    return
  }
  document.startViewTransition(async () => {
    mutate()
    await tick()
  })
}
