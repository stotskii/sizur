<script>
  import { onMount } from 'svelte'
  import { data } from '../lib/store.svelte.js'
  import { ui, toast } from '../lib/state.svelte.js'
  import { getCalendar, setCalendarEntry, removeCalendarEntry } from '../lib/db.js'
  import { outfitThumbSmall } from '../lib/catalog.js'

  const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const MON = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

  const now = new Date()
  let year = $state(now.getFullYear())
  let month = $state(now.getMonth())
  let entries = $state({}) // 'YYYY-MM-DD' -> { outfitGuid }
  let pickDate = $state(null) // date string being assigned

  const outfitsById = $derived(new Map(data.outfits.map((o) => [o.guid, o])))

  onMount(async () => {
    const all = await getCalendar()
    entries = Object.fromEntries(all.map((e) => [e.date, e]))
  })

  const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate())

  const cells = $derived(
    (() => {
      const first = new Date(year, month, 1)
      const lead = (first.getDay() + 6) % 7 // Mon=0
      const days = new Date(year, month + 1, 0).getDate()
      const arr = []
      for (let i = 0; i < lead; i++) arr.push(null)
      for (let d = 1; d <= days; d++) arr.push(d)
      return arr
    })()
  )

  function prev() { if (month === 0) { month = 11; year-- } else month-- }
  function next() { if (month === 11) { month = 0; year++ } else month++ }

  async function assign(o) {
    await setCalendarEntry(pickDate, o.guid)
    entries = { ...entries, [pickDate]: { date: pickDate, outfitGuid: o.guid } }
    pickDate = null
    toast('Назначено на день')
  }
  async function clearDay() {
    await removeCalendarEntry(pickDate)
    const e = { ...entries }; delete e[pickDate]; entries = e
    pickDate = null
  }
  const close = () => (ui.screen = '')
</script>

<div class="pushed">
  <div class="pushed-bar">
    <button class="ebtn" onclick={close} aria-label="Назад">‹</button>
    <div class="title">{MON[month]} {year}</div>
    <div class="navs">
      <button class="ebtn" onclick={prev} aria-label="Назад месяц">‹</button>
      <button class="ebtn" onclick={next} aria-label="Вперёд месяц">›</button>
    </div>
  </div>

  <div class="pushed-body">
    <div class="cal-wd">{#each WD as w}<span>{w}</span>{/each}</div>
    <div class="cal-grid">
      {#each cells as d}
        {#if d === null}
          <span class="cal-cell empty"></span>
        {:else}
          {@const ds = iso(year, month, d)}
          {@const e = entries[ds]}
          <button class="cal-cell" class:has={!!e} class:today={ds === todayIso} onclick={() => (pickDate = ds)}>
            <span class="dn">{d}</span>
            {#if e && outfitsById.get(e.outfitGuid)}
              <img class="dthumb" src={outfitThumbSmall(outfitsById.get(e.outfitGuid))} alt="" loading="lazy" />
            {/if}
          </button>
        {/if}
      {/each}
    </div>
    <p class="note">Тапните день, чтобы назначить образ. Связь с «Сегодня» — по дате.</p>
  </div>
</div>

{#if pickDate}
  <div class="sheet-backdrop" onclick={() => (pickDate = null)} role="presentation">
    <div class="sheet tall" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Выбрать образ">
      <div class="sheet-head">
        <h3>Образ на {pickDate}</h3>
        <button class="ebtn" onclick={clearDay} aria-label="Очистить">Очистить</button>
      </div>
      <div class="sheet-grid">
        <div class="grid outfits">
          {#each data.outfits as o (o.guid)}
            <button class="card ocard" onclick={() => assign(o)}>
              <div class="thumb"><img src={outfitThumbSmall(o)} alt={o.name} loading="lazy" /></div>
              <div class="meta"><div class="name">{o.name}</div></div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .navs { display: flex; gap: 2px; }
  .cal-wd { display: grid; grid-template-columns: repeat(7, 1fr); padding: 4px 4px 8px; }
  .cal-wd span { text-align: center; font-size: 11px; color: var(--muted); }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
  .cal-cell {
    aspect-ratio: 3 / 4; border: 1px solid var(--line); border-radius: 10px; background: var(--surface);
    position: relative; padding: 0; overflow: hidden;
  }
  .cal-cell.empty { border: none; background: none; }
  .cal-cell .dn { position: absolute; top: 4px; left: 6px; font-size: 12px; color: var(--ink-2); z-index: 1; }
  .cal-cell.has .dn { color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.6); }
  .cal-cell.today { box-shadow: inset 0 0 0 2px var(--ink); }
  .cal-cell.today .dn { font-weight: 700; color: var(--ink); }
  .cal-cell.today.has .dn { color: #fff; }
  .dthumb { width: 100%; height: 100%; object-fit: cover; }
  .note { color: var(--muted); font-size: 12px; margin-top: 14px; text-align: center; }
</style>
