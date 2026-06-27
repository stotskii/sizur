<script>
  import { data } from '../lib/store.svelte.js'
  import { ui } from '../lib/state.svelte.js'
  import { picUrl, outfitThumb } from '../lib/catalog.js'
  import ItemCard from './ItemCard.svelte'

  const s = ui.suitcase
  const isToss = /выброс/i.test(s.name)

  let seg = $state('items') // items | outfits

  const itemsById = $derived(new Map(data.items.map((i) => [i.guid, i])))
  const outfitsById = $derived(new Map(data.outfits.map((o) => [o.guid, o])))

  const items = $derived((s.articles || []).map((g) => itemsById.get(g)).filter(Boolean))
  const outfits = $derived((s.outfits || []).map((g) => outfitsById.get(g)).filter(Boolean))

  const close = () => { ui.screen = ''; ui.suitcase = null }
  function openOutfit(o) {
    ui.editorOutfit = { ...o, objects: o.objects.map((x) => ({ ...x })) }
  }
</script>

<div class="pushed">
  <div class="pushed-bar">
    <button class="ebtn" onclick={close} aria-label="Назад">‹</button>
    <div class="title">{isToss ? '🗑 ' : '🧳 '}{s.name}</div>
    <div style="width:38px"></div>
  </div>

  {#if outfits.length}
    <div class="seg">
      <button class:on={seg === 'items'} onclick={() => (seg = 'items')}>Вещи · {items.length}</button>
      <button class:on={seg === 'outfits'} onclick={() => (seg = 'outfits')}>Образы · {outfits.length}</button>
    </div>
  {/if}

  <div class="pushed-body">
    {#if seg === 'items'}
      {#if isToss}<div class="note">Эти вещи приглушены, но остаются в поиске и образах.</div>{/if}
      <div class="grid">
        {#each items as item (item.guid)}
          <div class:dim={isToss}>
            <ItemCard {item} onclick={() => (ui.detailItem = item)} />
          </div>
        {/each}
      </div>
      {#if !items.length}<div class="note">Чемодан пуст.</div>{/if}
    {:else}
      <div class="grid outfits">
        {#each outfits as o (o.guid)}
          <button class="card ocard" onclick={() => openOutfit(o)}>
            <div class="thumb"><img src={outfitThumb(o)} alt={o.name} loading="lazy" /></div>
            <div class="meta"><div class="name">{o.name}</div></div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
