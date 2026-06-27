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
