<script>
  import { ui, toast } from '../lib/state.svelte.js'
  import { data, patchItem } from '../lib/store.svelte.js'
  import { saveItem } from '../lib/db.js'
  import { itemImg, SEASONS, SEASON_ORDER, outfitThumb } from '../lib/catalog.js'

  const item = ui.detailItem

  // editable draft
  let name = $state(item.name || '')
  let brand = $state(item.brand || '')
  let seasons = $state([...(item.seasons || [])])
  let archived = $state(!!item.archived)
  let showMore = $state(false)

  const inOutfits = $derived(
    data.outfits.filter((o) => o.objects.some((ob) => ob.article_guid === item.guid))
  )

  function toggleSeason(s) {
    seasons = seasons.includes(s) ? seasons.filter((x) => x !== s) : [...seasons, s]
  }

  async function save() {
    const updated = { ...item, name: name.trim() || item.type, brand: brand.trim() || null, seasons, archived }
    await saveItem(updated)
    patchItem(JSON.parse(JSON.stringify(updated)))
    toast('Сохранено')
    ui.detailItem = null
  }
  const close = () => (ui.detailItem = null)
</script>

<div class="sheet-backdrop" onclick={close} role="presentation">
  <div class="sheet tall" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Вещь">
    <div class="sheet-head">
      <h3>Вещь</h3>
      <button class="ebtn" onclick={close} aria-label="Закрыть">✕</button>
    </div>

    <div class="sheet-grid">
      <div class="detail-photo">
        <img src={itemImg(item)} alt={name} />
      </div>

      <label class="field">
        <span>Название</span>
        <input bind:value={name} placeholder={item.type} />
      </label>

      <div class="rowline">
        <span class="pill">{item.category}</span>
        {#if item.type}<span class="muted">{item.type}</span>{/if}
        {#if (item.colors || []).length}
          <span class="dots">
            {#each item.colors.slice(0, 4) as c}
              <span class="dot" style="background:#{c.hex}"></span>
            {/each}
          </span>
        {/if}
      </div>

      <div class="field">
        <span>Сезоны · метка поверх вещи, не прячет её</span>
        <div class="chips wrap">
          {#each SEASON_ORDER as s}
            <button class="chip" class:on={seasons.includes(s)} onclick={() => toggleSeason(s)}>
              {SEASONS[s]}
            </button>
          {/each}
        </div>
      </div>

      <button class="more" onclick={() => (showMore = !showMore)}>
        {showMore ? 'Скрыть' : 'Показать больше'} ▾
      </button>

      {#if showMore}
        <label class="field">
          <span>Бренд</span>
          <input bind:value={brand} placeholder="—" />
        </label>
        <label class="toggle">
          <input type="checkbox" bind:checked={archived} />
          <span>На выброс / архив (приглушить, но не удалять)</span>
        </label>
      {/if}

      <div class="field">
        <span>В образах · {inOutfits.length}</span>
        {#if inOutfits.length}
          <div class="mini-row">
            {#each inOutfits.slice(0, 12) as o (o.guid)}
              <button class="mini" onclick={() => { ui.detailItem = null; ui.editorOutfit = { ...o, objects: o.objects.map((x) => ({ ...x })) } }}>
                <img src={outfitThumb(o)} alt={o.name} loading="lazy" />
              </button>
            {/each}
          </div>
        {:else}
          <div class="muted small">пока ни в одном</div>
        {/if}
      </div>

      <button class="save-cta" onclick={save}>Готово</button>
    </div>
  </div>
</div>

<style>
  .detail-photo {
    background: var(--surface-2);
    border-radius: 14px;
    aspect-ratio: 1 / 1;
    display: grid;
    place-items: center;
    margin-bottom: 14px;
    overflow: hidden;
  }
  .detail-photo img { max-width: 86%; max-height: 86%; object-fit: contain; mix-blend-mode: multiply; }
  .field { display: block; margin-bottom: 14px; }
  .field > span { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
  .field input {
    width: 100%; border: 1px solid var(--line); border-radius: 12px;
    padding: 11px 12px; font: inherit; background: var(--surface); color: var(--ink);
  }
  .chips.wrap { flex-wrap: wrap; padding: 0; overflow: visible; }
  .rowline { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
  .pill { background: var(--ink); color: #fff; border-radius: 999px; padding: 4px 10px; font-size: 12px; }
  .muted { color: var(--muted); font-size: 13px; }
  .small { font-size: 12px; }
  .dots { display: flex; gap: 4px; margin-left: auto; }
  .dot { width: 16px; height: 16px; border-radius: 999px; border: 1px solid rgba(0,0,0,.12); }
  .more { border: none; background: none; color: var(--accent); font: inherit; padding: 0 0 14px; }
  .toggle { display: flex; gap: 10px; align-items: center; font-size: 13px; margin-bottom: 14px; color: var(--ink-2); }
  .mini-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
  .mini { flex: 0 0 auto; width: 64px; height: 80px; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--surface); padding: 0; }
  .mini img { width: 100%; height: 100%; object-fit: contain; }
  .save-cta {
    width: 100%; border: none; background: var(--ink); color: #fff;
    border-radius: 14px; padding: 14px; font-size: 15px; font-weight: 600; margin: 8px 0 4px;
  }
</style>
