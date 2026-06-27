<script>
  import { data } from '../lib/store.svelte.js'
  import { toast } from '../lib/state.svelte.js'
  import { paletteWithShare, itemMatchesColor } from '../lib/catalog.js'

  const palette = $derived(paletteWithShare(data.items, 8))

  const topBrands = $derived(
    Object.entries(
      data.items.reduce((m, i) => {
        if (i.brand) m[i.brand] = (m[i.brand] || 0) + 1
        return m
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  )

  const topTypes = $derived(
    Object.entries(
      data.items.reduce((m, i) => {
        if (i.type) m[i.type] = (m[i.type] || 0) + 1
        return m
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  )

  function tapColor(p) {
    const n = data.items.filter((i) => itemMatchesColor(i, p.hex)).length
    toast(`${n} вещей этого цвета`)
  }
</script>

<div class="screen-head"><h1>Мой стиль</h1><div class="sub">Style DNA · собран из вашего гардероба</div></div>

<div class="dna">
  <section class="card-block">
    <h3>Палитра</h3>
    <div class="pal">
      {#each palette as p}
        <button class="pal-item" onclick={() => tapColor(p)}>
          <span class="pal-dot" style="background:#{p.hex}"></span>
          <span class="pal-pct">{p.pct}%</span>
        </button>
      {/each}
    </div>
    <p class="hint">Приглушённые «сложные» тона — пудра, серо-голубой, серо-зелёный, бордо-шоколад.</p>
  </section>

  <section class="card-block">
    <h3>Силуэты и типы</h3>
    <div class="tagrow">
      {#each topTypes as [t, n]}
        <span class="tag">{t} · {n}</span>
      {/each}
    </div>
  </section>

  <section class="card-block">
    <h3>Тир бренда</h3>
    <div class="tagrow">
      {#each topBrands as [b, n]}
        <span class="tag brand">{b} · {n}</span>
      {/each}
    </div>
    <p class="hint">Quiet-luxury / elevated contemporary.</p>
  </section>

  <section class="card-block built">
    Собрано из: <b>{data.items.length} вещей</b> · <b>{data.outfits.length} образов</b>
  </section>

  <button class="dna-cta" onclick={() => toast('ИИ-стилист — в P1')}>
    Собрать лук <span class="soon">скоро · P1</span>
  </button>
</div>

<style>
  .dna { padding: 6px 18px 0; display: flex; flex-direction: column; gap: 14px; }
  .card-block { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; }
  .card-block h3 { margin: 0 0 12px; font-size: 14px; font-weight: 600; }
  .pal { display: flex; gap: 12px; flex-wrap: wrap; }
  .pal-item { border: none; background: none; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 0; }
  .pal-dot { width: 40px; height: 40px; border-radius: 999px; border: 1px solid rgba(0,0,0,.1); display: block; }
  .pal-pct { font-size: 11px; color: var(--muted); }
  .hint { color: var(--muted); font-size: 12px; margin: 12px 0 0; line-height: 1.4; }
  .tagrow { display: flex; flex-wrap: wrap; gap: 8px; }
  .tag { border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px; font-size: 12.5px; color: var(--ink-2); }
  .tag.brand { background: var(--surface-2); }
  .built { text-align: center; color: var(--ink-2); font-size: 14px; }
  .dna-cta {
    border: none; background: var(--ink); color: #fff; border-radius: 14px;
    padding: 15px; font: inherit; font-size: 15px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .dna-cta .soon {
    background: rgba(255,255,255,.18); border-radius: 999px; padding: 3px 9px;
    font-size: 10px; letter-spacing: 1px; text-transform: uppercase; font-weight: 500;
  }
</style>
