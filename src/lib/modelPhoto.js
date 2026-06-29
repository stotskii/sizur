// Фото владелицы для примерки («Облагородить» → на ней, а не на чужой модели).
// Приватно: лежит в localStorage на её устройстве; уходит на image-API только в момент рендера.
const KEY = 'stylist_model_photo'

export const getModelPhoto = () => {
  try { return localStorage.getItem(KEY) || '' } catch { return '' }
}
export const setModelPhoto = (dataUrl) => {
  try { localStorage.setItem(KEY, dataUrl) } catch {}
}
export const clearModelPhoto = () => {
  try { localStorage.removeItem(KEY) } catch {}
}

/** Уменьшает фото до ~max по длинной стороне и возвращает webp data URL (компактно для хранения и API). */
export function downscaleImageFile(file, max = 800) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const im = new Image()
    im.onload = () => {
      const s = Math.min(max / im.naturalWidth, max / im.naturalHeight, 1)
      const w = Math.round(im.naturalWidth * s)
      const h = Math.round(im.naturalHeight * s)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d').drawImage(im, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/webp', 0.9))
    }
    im.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    im.src = url
  })
}
