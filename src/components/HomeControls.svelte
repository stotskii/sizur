<script>
  import { onMount } from 'svelte'
  import { homeState, homeToggle } from '../lib/ai.js'
  import { toast } from '../lib/state.svelte.js'

  let light = $state('unknown')
  let mirror = $state('unknown')
  let configured = $state(true) // пока не знаем — показываем; уточним по /home/state
  let open = $state(false)      // компактный таб, раскрывается в две иконки
  let busy = $state('')

  async function refresh() {
    const s = await homeState()
    configured = s.configured !== false
    light = s.light || 'unknown'
    mirror = s.mirror || 'unknown'
  }
  onMount(refresh)

  async function tap(target) {
    if (busy) return
    busy = target
    try {
      const r = await homeToggle(target)
      if (target === 'light') light = r.state || 'unknown'
      else mirror = r.state || 'unknown'
    } catch (e) {
      toast(e.message?.includes('не настроен') ? 'Подключите Home Assistant' : (e.message || 'Дом недоступен'))
    } finally {
      busy = ''
    }
  }
</script>

<div class="home-ctl" class:open>
  {#if open}
    <button class="hc" class:on={light === 'on'} class:busy={busy === 'light'} onclick={() => tap('light')} aria-label="Свет гардеробной">💡</button>
    <button class="hc" class:on={mirror === 'on'} class:busy={busy === 'mirror'} onclick={() => tap('mirror')} aria-label="Зеркала">🪞</button>
  {/if}
  <button class="hc toggle" onclick={() => (open = !open)} aria-label="Умный дом">🏠</button>
</div>

<style>
  .home-ctl {
    position: fixed;
    right: 12px;
    bottom: calc(var(--tab-h) + var(--safe-b) + 16px);
    max-width: var(--app-w); /* držать в рамке приложения не нужно — fixed справа */
    z-index: 90;
    display: flex; align-items: center; gap: 7px;
  }
  .hc {
    width: 44px; height: 44px; border-radius: 14px;
    border: 1px solid var(--line); background: var(--surface);
    font-size: 19px; display: grid; place-items: center;
    box-shadow: 0 4px 16px rgba(0,0,0,.1);
    transition: transform .09s ease, background .15s, opacity .15s;
    opacity: .9;
  }
  .hc:active { transform: scale(.93); }
  .hc.on { background: var(--ink); }
  .hc.busy { opacity: .5; }
  .toggle { background: var(--surface); }
  .home-ctl.open .toggle { opacity: .7; }
</style>
