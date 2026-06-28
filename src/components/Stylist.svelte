<script>
  import { data } from '../lib/store.svelte.js'
  import { ui, toast } from '../lib/state.svelte.js'
  import { paletteWithShare, itemMatchesColor, SEASONS, SEASON_ORDER, outfitThumb } from '../lib/catalog.js'
  import { buildLook, lookToOutfit, checkOutfit } from '../lib/ai.js'

  const palette = $derived(paletteWithShare(data.items, 8))

  const topBrands = $derived(
    Object.entries(data.items.reduce((m, i) => (i.brand ? ((m[i.brand] = (m[i.brand] || 0) + 1), m) : m), {}))
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
  )
  const topTypes = $derived(
    Object.entries(data.items.reduce((m, i) => (i.type ? ((m[i.type] = (m[i.type] || 0) + 1), m) : m), {}))
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
  )

  function tapColor(p) {
    toast(`${data.items.filter((i) => itemMatchesColor(i, p.hex)).length} вещей этого цвета`)
  }

  // ---- AI ----
  let showBrief = $state(false)
  let brief = $state('')
  let briefSeason = $state('')
  let busy = $state('')
  let verdict = $state(null)
  let pickForCheck = $state(false)

  async function runBuild() {
    showBrief = false
    busy = 'Стилист собирает образ из ваших вещей…'
    try {
      const look = await buildLook({ brief: brief.trim(), season: briefSeason })
      const outfit = await lookToOutfit(look)
      busy = ''
      if (!outfit.objects.length) return toast('ИИ не подобрал вещи')
      toast(look.rationale ? look.rationale.slice(0, 90) : 'Образ собран')
      ui.editorOutfit = outfit
    } catch (e) {
      busy = ''
      toast(e.message || 'Ошибка ИИ')
    }
  }

  async function runCheck(o) {
    pickForCheck = false
    busy = 'Стилист изучает образ…'
    try {
      const v = await checkOutfit(o.objects)
      v.outfitName = o.name
      verdict = v
      busy = ''
    } catch (e) {
      busy = ''
      toast(e.message || 'Ошибка ИИ')
    }
  }

  const verdictLabel = (v) => ({ in_style: 'В вашем стиле', neutral: 'Нейтрально', off: 'Выбивается' })[v] || v
  const verdictClass = (v) => ({ in_style: 'good', neutral: 'neu', off: 'off' })[v] || 'neu'
</script>

<div class="screen-head"><h1>Мой стиль</h1><div class="sub">Style DNA · собран из вашего гардероба</div></div>

<div class="dna">
  <div class="ai-actions">
    <button class="ai-primary" onclick={() => (showBrief = true)}>✦ Собрать лук</button>
    <button class="ai-secondary" onclick={() => (pickForCheck = true)}>Проверить образ</button>
  </div>

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
    <div class="tagrow">{#each topTypes as [t, n]}<span class="tag">{t} · {n}</span>{/each}</div>
  </section>

  <section class="card-block">
    <h3>Тир бренда</h3>
    <div class="tagrow">{#each topBrands as [b, n]}<span class="tag brand">{b} · {n}</span>{/each}</div>
    <p class="hint">Quiet-luxury / elevated contemporary.</p>
  </section>

  <section class="card-block built">
    Собрано из: <b>{data.items.length} вещей</b> · <b>{data.outfits.length} образов</b>
  </section>
</div>

<!-- brief sheet -->
{#if showBrief}
  <div class="sheet-backdrop" onclick={() => (showBrief = false)} role="presentation">
    <div class="sheet" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Собрать лук">
      <div class="sheet-head"><h3>Собрать лук</h3><button class="ebtn" onclick={() => (showBrief = false)}>✕</button></div>
      <div style="padding:4px 18px 20px">
        <label class="ai-field"><span>Повод (по желанию)</span>
          <input bind:value={brief} placeholder="на выход, прогулка, офис…" /></label>
        <div class="ai-field"><span>Сезон</span>
          <div class="chips wrap">
            <button class="chip" class:on={!briefSeason} onclick={() => (briefSeason = '')}>Любой</button>
            {#each SEASON_ORDER as s}
              <button class="chip" class:on={briefSeason === SEASONS[s]} onclick={() => (briefSeason = SEASONS[s])}>{SEASONS[s]}</button>
            {/each}
          </div>
        </div>
        <button class="ai-primary wide" onclick={runBuild}>✦ Собрать из моих вещей</button>
      </div>
    </div>
  </div>
{/if}

<!-- pick outfit to check -->
{#if pickForCheck}
  <div class="sheet-backdrop" onclick={() => (pickForCheck = false)} role="presentation">
    <div class="sheet tall" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Проверить образ">
      <div class="sheet-head"><h3>Какой образ проверить?</h3><button class="ebtn" onclick={() => (pickForCheck = false)}>✕</button></div>
      <div class="sheet-grid">
        <div class="grid outfits">
          {#each data.outfits as o (o.guid)}
            <button class="card ocard" onclick={() => runCheck(o)}>
              <div class="thumb"><img src={outfitThumb(o)} alt={o.name} loading="lazy" /></div>
              <div class="meta"><div class="name">{o.name}</div></div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- verdict -->
{#if verdict}
  <div class="sheet-backdrop" onclick={() => (verdict = null)} role="presentation">
    <div class="sheet" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Вердикт">
      <div class="sheet-head"><h3>{verdict.outfitName}</h3><button class="ebtn" onclick={() => (verdict = null)}>✕</button></div>
      <div style="padding:4px 18px 22px">
        <div class="verdict-top">
          <div class="score-ring {verdictClass(verdict.verdict)}">{verdict.score}</div>
          <div class="verdict-text">
            <div class="vlabel {verdictClass(verdict.verdict)}">{verdictLabel(verdict.verdict)}</div>
            <div class="vsum">{verdict.summary}</div>
          </div>
        </div>
        <div class="dims">
          {#each verdict.dimensions as d}
            <div class="dim">
              <span class="dot {d.verdict}"></span>
              <span class="dname">{d.name}</span>
              <span class="dnote">{d.note}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

{#if busy}
  <div class="ai-busy"><div class="spin"></div><div class="busy-t">{busy}</div></div>
{/if}

<style>
  .dna { padding: 6px 18px 0; display: flex; flex-direction: column; gap: 14px; }
  .ai-actions { display: flex; gap: 10px; }
  .ai-primary { flex: 1; border: none; background: var(--ink); color: #fff; border-radius: 14px; padding: 15px; font: inherit; font-size: 15px; font-weight: 600; }
  .ai-primary.wide { width: 100%; margin-top: 8px; }
  .ai-secondary { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 14px; padding: 15px; font: inherit; font-size: 15px; }
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

  .ai-field { display: block; margin-bottom: 14px; }
  .ai-field > span { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
  .ai-field input { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 11px 12px; font: inherit; background: var(--surface); }
  .chips.wrap { flex-wrap: wrap; padding: 0; overflow: visible; }

  .verdict-top { display: flex; gap: 14px; align-items: center; margin-bottom: 16px; }
  .score-ring { flex: 0 0 auto; width: 64px; height: 64px; border-radius: 999px; display: grid; place-items: center; font-size: 22px; font-weight: 650; color: #fff; }
  .score-ring.good { background: var(--good); }
  .score-ring.neu { background: var(--muted); }
  .score-ring.off { background: var(--warn); }
  .vlabel { font-size: 15px; font-weight: 600; }
  .vlabel.good { color: var(--good); }
  .vlabel.off { color: var(--warn); }
  .vsum { color: var(--ink-2); font-size: 13px; margin-top: 3px; line-height: 1.35; }
  .dims { display: flex; flex-direction: column; gap: 10px; }
  .dim { display: grid; grid-template-columns: 12px auto 1fr; gap: 8px; align-items: baseline; font-size: 13px; }
  .dim .dot { width: 9px; height: 9px; border-radius: 999px; margin-top: 4px; }
  .dim .dot.good { background: var(--good); }
  .dim .dot.neutral { background: var(--muted); }
  .dim .dot.off { background: var(--warn); }
  .dname { font-weight: 600; }
  .dnote { color: var(--ink-2); }

  .ai-busy { position: fixed; inset: 0; max-width: 480px; margin: 0 auto; background: rgba(244,241,236,.86); backdrop-filter: blur(4px); display: grid; place-content: center; justify-items: center; gap: 16px; z-index: 250; }
  .spin { width: 34px; height: 34px; border: 3px solid var(--line); border-top-color: var(--ink); border-radius: 999px; animation: spin 0.9s linear infinite; }
  .busy-t { color: var(--ink-2); font-size: 14px; text-align: center; padding: 0 40px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
