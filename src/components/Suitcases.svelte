<script>
  import { data } from '../lib/store.svelte.js'
  import { ui } from '../lib/state.svelte.js'
  import { itemThumb } from '../lib/catalog.js'

  const byGuid = $derived(new Map(data.items.map((i) => [i.guid, i])))

  // NB: a regex literal right after `{` in text would read as `{/` (a block close),
  // so the toss check lives in a function.
  const isToss = (s) => /выброс/i.test(s.name)

  // special "throw away" suitcase sorts last
  const list = $derived(
    [...data.suitcases].sort((a, b) => (isToss(a) ? 1 : 0) - (isToss(b) ? 1 : 0))
  )

  const thumbs = (s) =>
    (s.articles || [])
      .map((g) => byGuid.get(g))
      .filter(Boolean)
      .slice(0, 4)

  function open(s) {
    ui.suitcase = s
    ui.screen = 'suitcase'
  }
  const close = () => (ui.screen = '')
</script>

<div class="pushed">
  <div class="pushed-bar">
    <button class="ebtn" onclick={close} aria-label="Назад">‹</button>
    <div class="title">Чемоданы</div>
    <div style="width:38px"></div>
  </div>

  <div class="pushed-body">
    <div class="suit-list">
      {#each list as s (s.guid)}
        <button class="suit-card" class:toss={isToss(s)} onclick={() => open(s)}>
          <div class="mosaic">
            {#each thumbs(s) as it}
              <span class="cell"><img src={itemThumb(it)} alt="" loading="lazy" /></span>
            {/each}
            {#if !thumbs(s).length}<span class="empty">пусто</span>{/if}
          </div>
          <div class="suit-meta">
            <div class="name">{isToss(s) ? '🗑 ' : '🧳 '}{s.name}</div>
            <div class="sub">
              {(s.articles || []).length} вещей{(s.outfits || []).length ? ` · ${s.outfits.length} образов` : ''}
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>
