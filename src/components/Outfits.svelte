<script>
  import { data } from '../lib/store.svelte.js'
  import { outfitThumbSmall } from '../lib/catalog.js'
  import { ui, vt } from '../lib/state.svelte.js'
  import { prefetchOutfit } from '../lib/prefetch.js'

  function open(o) {
    // edit a draft copy, not the live store object
    vt(() => (ui.editorOutfit = { ...o, objects: o.objects.map((ob) => ({ ...ob })) }))
  }
</script>

<div class="screen-head row">
  <div>
    <h1>Образы</h1>
    <div class="sub">{data.outfits.length} образов · коллажи</div>
  </div>
  <button class="ghost-btn" onclick={() => (ui.screen = 'calendar')}>📅 Календарь</button>
</div>

<div class="grid outfits">
  {#each data.outfits as o (o.guid)}
    <button class="card ocard" onclick={() => open(o)} onpointerdown={() => prefetchOutfit(o)}>
      <div class="thumb">
        {#if outfitThumbSmall(o)}
          <img src={outfitThumbSmall(o)} alt={o.name} loading="lazy" decoding="async" />
        {/if}
      </div>
      <div class="meta">
        <div class="name">{o.name}</div>
        <div class="brand">{o.objects.length} вещей</div>
      </div>
    </button>
  {/each}
</div>
