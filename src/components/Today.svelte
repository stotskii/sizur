<script>
  import { data } from '../lib/store.svelte.js'
  import { ui, toast } from '../lib/state.svelte.js'
  import { setCalendarEntry, uid } from '../lib/db.js'
  import { outfitThumb, picUrl, SEASONS, currentSeason, isoDate } from '../lib/catalog.js'

  const season = currentSeason()
  const today = new Date()
  const dateStr = today.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  const pool = $derived(
    (() => {
      const inSeason = data.outfits.filter((o) => (o.seasons || []).includes(season))
      return inSeason.length ? inSeason : data.outfits
    })()
  )

  let idx = $state(0)
  const hero = $derived(pool.length ? pool[idx % pool.length] : null)

  const reason = $derived(
    hero ? `${SEASONS[season]} · ${hero.objects.length} вещей в вашей палитре` : ''
  )

  function another() {
    if (pool.length) idx = (idx + 1) % pool.length
  }
  async function wear() {
    if (!hero) return
    await setCalendarEntry(isoDate(today), hero.guid, '')
    toast('Образ на сегодня отмечен')
  }
  function buildOwn() {
    ui.editorOutfit = { guid: uid('outfit'), name: 'Новый образ', seasons: [season], picture: '', objects: [], isNew: true }
  }
  function openHero() {
    if (hero) ui.editorOutfit = { ...hero, objects: hero.objects.map((x) => ({ ...x })) }
  }
</script>

<div class="screen-head">
  <h1>Сегодня</h1>
  <div class="sub">{dateStr} · Лимасол</div>
</div>

{#if hero}
  <div class="today-hero">
    <button class="hero-collage" onclick={openHero} aria-label="Открыть образ">
      <img src={outfitThumb(hero)} alt={hero.name} />
    </button>
    <div class="hero-name">{hero.name}</div>
    <div class="hero-reason">{reason}</div>

    <div class="hero-items">
      {#each hero.objects.slice(0, 6) as ob}
        <span class="hi"><img src={picUrl(ob.picture)} alt="" loading="lazy" /></span>
      {/each}
    </div>

    <div class="hero-actions">
      <button class="primary" onclick={wear}>Надеть</button>
      <button onclick={another}>Другой вариант</button>
      <button onclick={buildOwn}>Собрать самой</button>
    </div>
  </div>
{:else}
  <div class="stub"><h2>Нет образов на сезон</h2></div>
{/if}

<style>
  .today-hero { padding: 8px 18px 0; }
  .hero-collage {
    width: 100%; border: 1px solid var(--line); border-radius: 18px; overflow: hidden;
    background: var(--surface); padding: 0; aspect-ratio: 4 / 5; display: grid; place-items: center;
  }
  .hero-collage img { width: 100%; height: 100%; object-fit: contain; }
  .hero-name { font-size: 19px; font-weight: 650; margin: 12px 2px 2px; }
  .hero-reason { color: var(--muted); font-size: 13px; margin: 0 2px 12px; }
  .hero-items { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; }
  .hi { flex: 0 0 auto; width: 56px; height: 70px; background: var(--surface-2); border-radius: 10px; overflow: hidden; display: grid; place-items: center; }
  .hi img { width: 90%; height: 90%; object-fit: contain; mix-blend-mode: multiply; }
  .hero-actions { display: flex; gap: 8px; }
  .hero-actions button {
    flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink);
    border-radius: 12px; padding: 12px 6px; font: inherit; font-size: 13px;
  }
  .hero-actions .primary { background: var(--ink); color: #fff; border-color: var(--ink); font-weight: 600; }
</style>
