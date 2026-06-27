<script>
  import { data } from '../lib/store.svelte.js'
  import {
    CATEGORY_ORDER,
    SEASONS,
    SEASON_ORDER,
    buildPalette,
    itemMatchesColor,
  } from '../lib/catalog.js'
  import { ui } from '../lib/state.svelte.js'
  import ItemCard from './ItemCard.svelte'

  const palette = $derived(buildPalette(data.items))

  // filters
  let category = $state(null)
  let season = $state(null)
  let color = $state(null)

  const total = $derived(data.items.length)

  const filtered = $derived(
    data.items.filter((it) => {
      if (category && it.category !== category) return false
      if (season && !(it.seasons || []).includes(season)) return false
      if (color && !itemMatchesColor(it, color)) return false
      return true
    })
  )

  const hasFilter = $derived(!!(category || season || color))
  function reset() {
    category = season = color = null
  }
</script>

<div class="screen-head row">
  <div>
    <h1>Гардероб</h1>
    <div class="sub">{total} вещей · тихий люкс</div>
  </div>
  <button class="ghost-btn" onclick={() => (ui.screen = 'suitcases')}>
    🧳 Чемоданы
  </button>
</div>

<!-- category -->
<div class="chips">
  <button class="chip" class:on={!category} onclick={() => (category = null)}>Все</button>
  {#each CATEGORY_ORDER as c}
    <button class="chip" class:on={category === c} onclick={() => (category = category === c ? null : c)}>
      {c}
    </button>
  {/each}
</div>

<!-- season + colors -->
<div class="chips">
  {#each SEASON_ORDER as s}
    <button class="chip" class:on={season === s} onclick={() => (season = season === s ? null : s)}>
      {SEASONS[s]}
    </button>
  {/each}
  {#each palette as p}
    <button
      class="swatch"
      class:on={color === p.hex}
      style="background:#{p.hex}"
      aria-label="цвет"
      onclick={() => (color = color === p.hex ? null : p.hex)}
    ></button>
  {/each}
</div>

<div class="counter">
  {filtered.length} из {total}
  {#if hasFilter}· <button class="chip reset" style="padding:2px 8px" onclick={reset}>сбросить</button>{/if}
</div>

<div class="grid">
  {#each filtered as item (item.guid)}
    <ItemCard {item} onclick={() => (ui.detailItem = item)} />
  {/each}
</div>
