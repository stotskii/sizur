// Lightweight access curtain — NOT real security. The code lives in the client
// bundle and the static data files (/pictures, wardrobe_export.json) are still
// fetchable directly on GitHub Pages. It only deters casual visitors who open
// the URL. For real protection, host behind server auth.
//
// >>> CHANGE THE PIN HERE <<<
export const ACCESS_PIN = '5719'

const KEY = 'stylist_unlocked'

export function isUnlocked() {
  try {
    return localStorage.getItem(KEY) === 'yes'
  } catch {
    return false
  }
}

export function unlock() {
  try {
    localStorage.setItem(KEY, 'yes')
  } catch {
    /* ignore */
  }
}
