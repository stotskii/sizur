// Predictive preloading: warm the heavy canvas-editor chunk and decode an
// outfit's full-resolution images BEFORE the user actually opens it, so the
// editor appears instantly on tap. Called from card pointerdown handlers.

import { picUrl } from './catalog.js'

// Single dynamic import, deduped. App.svelte awaits this same promise so the
// chunk is shared (Vite resolves both specifiers to one module).
let editorPromise
export function prefetchEditor() {
  return (editorPromise ??= import('../components/CanvasEditor.svelte'))
}

// Decode each full image once; crossOrigin matches the editor's loader so the
// browser reuses the same cache entry (no double fetch).
const warmed = new Set()
export function prefetchOutfitImages(o) {
  if (!o || !o.objects) return
  for (const ob of o.objects) {
    const g = ob.picture
    if (!g || warmed.has(g)) continue
    warmed.add(g)
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.decoding = 'async'
    im.src = picUrl(g)
  }
}

/** Convenience: warm both the editor chunk and the outfit's images. */
export function prefetchOutfit(o) {
  prefetchEditor()
  prefetchOutfitImages(o)
}
