<script>
  import { onMount } from 'svelte'
  import { ensureSeeded, ensureCollages } from './lib/db.js'
  import { loadAll } from './lib/store.svelte.js'
  import { ui } from './lib/state.svelte.js'
  import { isUnlocked } from './lib/gate.js'
  import Lock from './components/Lock.svelte'
  import TabBar from './components/TabBar.svelte'
  import Wardrobe from './components/Wardrobe.svelte'
  import Outfits from './components/Outfits.svelte'
  import Today from './components/Today.svelte'
  import Stylist from './components/Stylist.svelte'
  import { prefetchEditor } from './lib/prefetch.js'
  import ItemDetail from './components/ItemDetail.svelte'
  import Suitcases from './components/Suitcases.svelte'
  import SuitcaseDetail from './components/SuitcaseDetail.svelte'
  import Calendar from './components/Calendar.svelte'
  import PlusSheet from './components/PlusSheet.svelte'
  import PhotoImport from './components/PhotoImport.svelte'
  import HomeControls from './components/HomeControls.svelte'

  let unlocked = $state(isUnlocked())
  let ready = $state(false)
  let error = $state(null)

  onMount(async () => {
    try {
      await ensureSeeded()
      await ensureCollages()
      await loadAll()
      ready = true
    } catch (e) {
      error = e.message || String(e)
    }
  })

  function openPlus() {
    ui.plusSheet = true
  }
</script>

{#if !unlocked}
  <Lock onunlock={() => (unlocked = true)} />
{:else if error}
  <div class="boot">Ошибка загрузки: {error}</div>
{:else if !ready}
  <div class="boot">Загрузка гардероба…</div>
{:else if ui.editorOutfit}
  {#await prefetchEditor()}
    <div class="boot">Открываю редактор…</div>
  {:then mod}
    {@const Editor = mod.default}
    <Editor />
  {/await}
{:else}
  <main class="screen">
    {#if ui.tab === 'wardrobe'}
      <Wardrobe />
    {:else if ui.tab === 'outfits'}
      <Outfits />
    {:else if ui.tab === 'today'}
      <Today />
    {:else if ui.tab === 'stylist'}
      <Stylist />
    {/if}
  </main>
  <TabBar onplus={openPlus} />

  <!-- pushed full-screen routes -->
  {#if ui.screen === 'suitcases'}
    <Suitcases />
  {:else if ui.screen === 'suitcase'}
    <SuitcaseDetail />
  {:else if ui.screen === 'calendar'}
    <Calendar />
  {/if}

  {#if ui.photoImport}
    <PhotoImport />
  {/if}

  <!-- item detail sheet sits above everything -->
  {#if ui.detailItem}
    <ItemDetail />
  {/if}

  {#if ui.plusSheet}
    <PlusSheet />
  {/if}

  <!-- умный дом: свет/зеркала гардеробной, сквозь все экраны -->
  {#if !ui.photoImport}
    <HomeControls />
  {/if}
{/if}

{#if ui.toast}
  <div class="toast">{ui.toast}</div>
{/if}
