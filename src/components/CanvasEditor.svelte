<script>
  import { onMount, onDestroy } from 'svelte'
  import Konva from 'konva'
  import { ui, toast } from '../lib/state.svelte.js'
  import { saveOutfit } from '../lib/db.js'
  import { patchOutfit } from '../lib/store.svelte.js'
  import { picUrl } from '../lib/catalog.js'
  import ItemPicker from './ItemPicker.svelte'

  const outfit = ui.editorOutfit

  let host // canvas container element
  let name = $state(outfit.name)
  let hasSel = $state(false)
  let canUndo = $state(false)
  let canRedo = $state(false)
  let picking = $state(false)
  let dirty = $state(false)

  let stage, layer, tr
  const imgCache = new Map() // pictureGuid -> HTMLImageElement
  let history = []
  let hIndex = -1

  function loadImage(guid) {
    if (imgCache.has(guid)) return Promise.resolve(imgCache.get(guid))
    return new Promise((resolve, reject) => {
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.onload = () => { imgCache.set(guid, im); resolve(im) }
      im.onerror = reject
      im.src = picUrl(guid)
    })
  }

  function createNode(o) {
    const im = imgCache.get(o.picture)
    if (!im) return null
    const w = o.w, h = o.h
    const node = new Konva.Image({
      image: im,
      width: w, height: h,
      offsetX: w / 2, offsetY: h / 2, // center origin -> rotate/flip about center
      x: o.x + w / 2, y: o.y + h / 2,
      rotation: o.rotation || 0,
      scaleX: o.flipH ? -1 : 1, scaleY: 1,
      draggable: true,
    })
    node.setAttr('articleGuid', o.article_guid)
    node.setAttr('picGuid', o.picture)
    node.on('mousedown touchstart', () => select(node))
    node.on('dragend', commit)
    node.on('transformend', () => { normalize(node); commit() })
    return node
  }

  function normalize(node) {
    const sx = node.scaleX(), sy = node.scaleY()
    const w = Math.max(24, node.width() * Math.abs(sx))
    const h = Math.max(24, node.height() * Math.abs(sy))
    node.width(w); node.height(h)
    node.offsetX(w / 2); node.offsetY(h / 2)
    node.scaleX(sx < 0 ? -1 : 1); node.scaleY(1)
  }

  function imageNodes() {
    return layer
      .getChildren((n) => n.getClassName() === 'Image')
      .slice()
      .sort((a, b) => a.zIndex() - b.zIndex())
  }

  function serialize() {
    return imageNodes().map((node, idx) => {
      const w = node.width(), h = node.height()
      return {
        article_guid: node.getAttr('articleGuid'),
        picture: node.getAttr('picGuid'),
        kind: 'picture', is_article: true,
        x: Math.round(node.x() - w / 2),
        y: Math.round(node.y() - h / 2),
        w: Math.round(w), h: Math.round(h),
        rotation: Math.round(node.rotation()),
        flipH: node.scaleX() < 0,
        z: idx,
      }
    })
  }

  function select(node) {
    tr.nodes(node ? [node] : [])
    hasSel = !!node
    layer.batchDraw()
  }
  const selected = () => tr.nodes()[0] || null

  function pushHistory() {
    history = history.slice(0, hIndex + 1)
    history.push(serialize())
    hIndex = history.length - 1
    canUndo = hIndex > 0
    canRedo = false
  }
  function commit() {
    dirty = true
    pushHistory()
  }

  function rebuild(snap) {
    select(null)
    imageNodes().forEach((n) => n.destroy())
    snap.slice().sort((a, b) => a.z - b.z).forEach((o) => {
      const n = createNode(o)
      if (n) layer.add(n)
    })
    tr.moveToTop()
    layer.draw()
  }
  function undo() {
    if (hIndex <= 0) return
    hIndex--
    rebuild(history[hIndex])
    canUndo = hIndex > 0; canRedo = true
  }
  function redo() {
    if (hIndex >= history.length - 1) return
    hIndex++
    rebuild(history[hIndex])
    canRedo = hIndex < history.length - 1; canUndo = true
  }

  function fitView(objs) {
    const W = stage.width(), H = stage.height(), pad = 36
    if (!objs.length) {
      layer.scale({ x: 1, y: 1 })
      layer.position({ x: W / 2, y: H / 2 })
      layer.draw()
      return
    }
    const minX = Math.min(...objs.map((o) => o.x))
    const minY = Math.min(...objs.map((o) => o.y))
    const maxX = Math.max(...objs.map((o) => o.x + o.w))
    const maxY = Math.max(...objs.map((o) => o.y + o.h))
    const cw = maxX - minX, ch = maxY - minY
    const s = Math.min((W - 2 * pad) / cw, (H - 2 * pad) / ch)
    layer.scale({ x: s, y: s })
    layer.position({ x: (W - cw * s) / 2 - minX * s, y: (H - ch * s) / 2 - minY * s })
    layer.draw()
  }

  function viewCenterLogical() {
    return layer.getAbsoluteTransform().copy().invert().point({ x: stage.width() / 2, y: stage.height() / 2 })
  }
  function nextZ() {
    return imageNodes().length
  }

  // ---- toolbar actions ----
  async function addItem(item) {
    picking = false
    const guid = item.main_picture
    try { await loadImage(guid) } catch { toast('Не удалось загрузить картинку'); return }
    const im = imgCache.get(guid)
    const baseW = 220
    const ar = im.naturalHeight / im.naturalWidth || 1.3
    const w = baseW, h = Math.round(baseW * ar)
    const c = viewCenterLogical()
    const node = createNode({
      article_guid: item.guid, picture: guid,
      x: c.x - w / 2, y: c.y - h / 2, w, h, rotation: 0, flipH: false,
    })
    layer.add(node); tr.moveToTop(); select(node); commit()
  }
  function duplicate() {
    const n = selected(); if (!n) return
    const w = n.width(), h = n.height()
    const node = createNode({
      article_guid: n.getAttr('articleGuid'), picture: n.getAttr('picGuid'),
      x: n.x() - w / 2 + 24, y: n.y() - h / 2 + 24, w, h,
      rotation: n.rotation(), flipH: n.scaleX() < 0,
    })
    layer.add(node); tr.moveToTop(); select(node); commit()
  }
  function flip() { const n = selected(); if (!n) return; n.scaleX(n.scaleX() * -1); commit() }
  function forward() { const n = selected(); if (!n) return; n.moveUp(); tr.moveToTop(); commit() }
  function backward() { const n = selected(); if (!n) return; n.moveDown(); commit() }
  function remove() { const n = selected(); if (!n) return; n.destroy(); select(null); commit() }

  function renderThumb(objects) {
    if (!objects.length) return ''
    const minX = Math.min(...objects.map((o) => o.x))
    const minY = Math.min(...objects.map((o) => o.y))
    const maxX = Math.max(...objects.map((o) => o.x + o.w))
    const maxY = Math.max(...objects.map((o) => o.y + o.h))
    const cw = maxX - minX, ch = maxY - minY
    const sc = layer.scale(), ps = layer.position()
    layer.scale({ x: 1, y: 1 }); layer.position({ x: 0, y: 0 })
    const ratio = Math.min(600 / cw, 600 / ch, 1)
    let url = ''
    try {
      url = layer.toDataURL({ x: minX, y: minY, width: cw, height: ch, pixelRatio: ratio, mimeType: 'image/webp', quality: 0.82 })
    } catch (e) { url = '' }
    layer.scale(sc); layer.position(ps); layer.draw()
    return url
  }

  async function save() {
    select(null)
    const objects = serialize()
    const thumb = renderThumb(objects)
    const { isNew, ...rest } = outfit
    const record = { ...rest, name: name.trim() || 'Образ', objects, thumbDataUrl: thumb }
    await saveOutfit(record)
    patchOutfit(JSON.parse(JSON.stringify(record)))
    toast(isNew ? 'Образ создан' : 'Образ сохранён')
    ui.editorOutfit = null
  }
  function close() {
    if (dirty && !confirm('Выйти без сохранения? Изменения не сохранятся.')) return
    ui.editorOutfit = null
  }

  let ro
  onMount(async () => {
    const objs = outfit.objects || []
    await Promise.allSettled(objs.map((o) => loadImage(o.picture)))

    stage = new Konva.Stage({
      container: host,
      width: host.clientWidth,
      height: host.clientHeight,
    })
    layer = new Konva.Layer()
    stage.add(layer)
    tr = new Konva.Transformer({
      keepRatio: true,
      rotateEnabled: true,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      anchorSize: 20,
      anchorStroke: '#2b2723',
      anchorCornerRadius: 10,
      borderStroke: '#2b2723',
      borderStrokeWidth: 1.5,
      rotateAnchorOffset: 28,
    })
    layer.add(tr)

    objs.filter((o) => imgCache.has(o.picture))
      .slice().sort((a, b) => a.z - b.z)
      .forEach((o) => { const n = createNode(o); if (n) layer.add(n) })
    tr.moveToTop()
    fitView(objs)

    // tap empty canvas -> deselect
    stage.on('mousedown touchstart', (e) => { if (e.target === stage) select(null) })

    pushHistory() // baseline snapshot

    ro = new ResizeObserver(() => {
      if (!stage) return
      stage.width(host.clientWidth); stage.height(host.clientHeight)
      fitView(serialize())
    })
    ro.observe(host)
  })

  onDestroy(() => {
    ro?.disconnect()
    stage?.destroy()
  })
</script>

<div class="editor">
  <div class="editor-bar">
    <button class="ebtn" onclick={close} aria-label="Закрыть">‹</button>
    <input class="title" bind:value={name} placeholder="Название образа"
           style="border:none;background:none;outline:none;font:inherit;font-weight:600" />
    <button class="ebtn" onclick={undo} disabled={!canUndo} aria-label="Отменить">↶</button>
    <button class="ebtn" onclick={redo} disabled={!canRedo} aria-label="Повторить">↷</button>
    <button class="ebtn primary" onclick={save}>Сохранить</button>
  </div>

  <div class="canvas-host" bind:this={host}></div>

  <div class="editor-tools">
    <button class="tool" onclick={() => (picking = true)}><span class="ic">＋</span>Вещь</button>
    <button class="tool" onclick={duplicate} disabled={!hasSel}><span class="ic">⧉</span>Дубль</button>
    <button class="tool" onclick={flip} disabled={!hasSel}><span class="ic">⇋</span>Зеркало</button>
    <button class="tool" onclick={forward} disabled={!hasSel}><span class="ic">⬆</span>Вперёд</button>
    <button class="tool" onclick={backward} disabled={!hasSel}><span class="ic">⬇</span>Назад</button>
    <button class="tool" onclick={remove} disabled={!hasSel}><span class="ic">🗑</span>Удалить</button>
  </div>
</div>

{#if picking}
  <ItemPicker onpick={addItem} onclose={() => (picking = false)} />
{/if}
