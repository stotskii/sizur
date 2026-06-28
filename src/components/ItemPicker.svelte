<script>
  import { data } from '../lib/store.svelte.js'
  import { CATEGORY_ORDER, itemThumb } from '../lib/catalog.js'

  let { onpick, onclose } = $props()

  let category = $state(null)

  const filtered = $derived(
    category ? data.items.filter((i) => i.category === category) : data.items
  )
</script>

<div class="sheet-backdrop" onclick={onclose} role="presentation">
  <div class="sheet" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Добавить вещь">
    <div class="sheet-head">
      <h3>Добавить вещь</h3>
      <button class="ebtn" onclick={onclose} aria-label="Закрыть">✕</button>
    </div>
    <div class="chips">
      <button class="chip" class:on={!category} onclick={() => (category = null)}>Все</button>
      {#each CATEGORY_ORDER as c}
        <button class="chip" class:on={category === c} onclick={() => (category = category === c ? null : c)}>
          {c}
        </button>
      {/each}
    </div>
    <div class="sheet-grid">
      <div class="grid">
        {#each filtered as item (item.guid)}
          <button class="card" onclick={() => onpick(item)}>
            <div class="thumb">
              <img src={itemThumb(item)} alt={item.name} loading="lazy" />
            </div>
            <div class="meta"><div class="name">{item.name || item.type}</div></div>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>
