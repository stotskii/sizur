<script>
  import { ui, toast } from '../lib/state.svelte.js'
  import { saveItem, uid } from '../lib/db.js'
  import { addItemToStore } from '../lib/store.svelte.js'
  import { CATEGORY_ORDER } from '../lib/catalog.js'

  let fileUrl = $state('') // original preview (object URL)
  let cutUrl = $state('') // background-removed data URL
  let busy = $state(false)
  let progress = $state('')
  let name = $state('')
  let category = $state('Одежда')
  let rawFile = null

  function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    rawFile = f
    cutUrl = ''
    fileUrl = URL.createObjectURL(f)
    if (!name) name = 'Новая вещь'
  }

  async function removeBg() {
    if (!rawFile || busy) return
    busy = true
    progress = 'Загрузка модели…'
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const blob = await removeBackground(rawFile, {
        progress: (key, cur, total) => {
          progress = key.startsWith('fetch') ? 'Загрузка модели…' : 'Убираю фон…'
        },
      })
      cutUrl = await blobToDataURL(blob)
      progress = ''
    } catch (err) {
      toast('Не удалось убрать фон')
      progress = ''
    } finally {
      busy = false
    }
  }

  function blobToDataURL(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result)
      r.onerror = rej
      r.readAsDataURL(blob)
    })
  }

  async function save() {
    const picData = cutUrl || (await fileToDataURL(rawFile))
    const item = {
      guid: uid('item'),
      name: name.trim() || 'Новая вещь',
      type: 'Вещь',
      category,
      brand: null,
      size: null,
      colors: [],
      seasons: [],
      is_liked: 0,
      rating: 0,
      archived: false,
      main_picture: '',
      picData,
      pictures: [],
      created: Date.now(),
    }
    await saveItem(item)
    addItemToStore(item)
    toast('Вещь добавлена')
    close()
  }
  function fileToDataURL(f) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f) })
  }

  function close() {
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    ui.photoImport = false
  }
</script>

<div class="pushed">
  <div class="pushed-bar">
    <button class="ebtn" onclick={close} aria-label="Назад">‹</button>
    <div class="title">Вещь с фото</div>
    <button class="ebtn primary" onclick={save} disabled={!fileUrl}>Сохранить</button>
  </div>

  <div class="pushed-body photo-body">
    <div class="photo-stage">
      {#if cutUrl}
        <img class="cut" src={cutUrl} alt="вырезка" />
      {:else if fileUrl}
        <img class="orig" src={fileUrl} alt="фото" />
      {:else}
        <label class="dropzone">
          <input type="file" accept="image/*" capture="environment" onchange={onFile} hidden />
          <span class="dz-ic">📷</span>
          <span>Снять или выбрать фото вещи</span>
        </label>
      {/if}
      {#if busy}<div class="overlay">{progress || 'Обработка…'}</div>{/if}
    </div>

    {#if fileUrl}
      <div class="photo-controls">
        {#if !cutUrl}
          <button class="wide" onclick={removeBg} disabled={busy}>
            {busy ? progress || 'Обработка…' : '✂︎ Убрать фон'}
          </button>
        {:else}
          <div class="ok-row">✓ Фон убран · вырезка готова</div>
        {/if}

        <label class="re">
          <input type="file" accept="image/*" capture="environment" onchange={onFile} hidden />
          Другое фото
        </label>

        <label class="field">
          <span>Название</span>
          <input bind:value={name} placeholder="Новая вещь" />
        </label>

        <div class="field">
          <span>Категория</span>
          <div class="chips wrap">
            {#each CATEGORY_ORDER as c}
              <button class="chip" class:on={category === c} onclick={() => (category = c)}>{c}</button>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .photo-body { padding: 16px; }
  .photo-stage {
    position: relative; aspect-ratio: 1 / 1; border-radius: 16px; overflow: hidden;
    background:
      radial-gradient(circle at 1px 1px, rgba(0,0,0,.05) 1px, transparent 0) 0 0 / 18px 18px,
      var(--surface);
    border: 1px solid var(--line); display: grid; place-items: center; margin-bottom: 16px;
  }
  .photo-stage img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .dropzone { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--muted); font-size: 14px; padding: 30px; text-align: center; }
  .dz-ic { font-size: 40px; }
  .overlay { position: absolute; inset: 0; background: rgba(244,241,236,.82); display: grid; place-items: center; color: var(--ink); font-size: 14px; }
  .photo-controls { display: flex; flex-direction: column; gap: 14px; }
  .wide { border: none; background: var(--ink); color: #fff; border-radius: 12px; padding: 14px; font: inherit; font-size: 15px; font-weight: 600; }
  .wide:disabled { opacity: .6; }
  .ok-row { color: var(--good); font-size: 14px; text-align: center; }
  .re { align-self: center; color: var(--accent); font-size: 13px; }
  .field > span { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
  .field input { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 11px 12px; font: inherit; background: var(--surface); }
  .chips.wrap { flex-wrap: wrap; padding: 0; overflow: visible; }
</style>
