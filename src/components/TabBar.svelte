<script>
  import { ui } from '../lib/state.svelte.js'
  let { onplus } = $props()

  const tabs = [
    { id: 'today', label: 'Сегодня', ic: '✦' },
    { id: 'wardrobe', label: 'Гардероб', ic: '▦' },
    { id: 'outfits', label: 'Образы', ic: '◳' },
    { id: 'stylist', label: 'Стилист', ic: '✶' },
  ]
</script>

<nav class="tabbar">
  <button
    class:on={ui.tab === 'today'}
    onclick={() => (ui.tab = 'today')}
  >
    <span class="ic">✦</span>Сегодня
  </button>
  <button
    class:on={ui.tab === 'wardrobe'}
    onclick={() => (ui.tab = 'wardrobe')}
  >
    <span class="ic">▦</span>Гардероб
  </button>
  <button class="plus" onclick={onplus} aria-label="Добавить">
    <span class="ic">+</span>
  </button>
  <button
    class:on={ui.tab === 'outfits'}
    onclick={() => (ui.tab = 'outfits')}
  >
    <span class="ic">◳</span>Образы
  </button>
  <button
    class:on={ui.tab === 'stylist'}
    onclick={() => (ui.tab = 'stylist')}
  >
    <span class="ic">✶</span>Стилист
  </button>
</nav>
