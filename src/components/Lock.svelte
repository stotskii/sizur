<script>
  import { ACCESS_PIN, unlock } from '../lib/gate.js'
  let { onunlock } = $props()

  let entered = $state('')
  let wrong = $state(false)

  const pads = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  function press(k) {
    if (k === '⌫') {
      entered = entered.slice(0, -1)
      return
    }
    if (k === '' || entered.length >= ACCESS_PIN.length) return
    entered += k
    if (entered.length === ACCESS_PIN.length) check()
  }

  function check() {
    if (entered === ACCESS_PIN) {
      unlock()
      onunlock()
    } else {
      wrong = true
      setTimeout(() => {
        entered = ''
        wrong = false
      }, 450)
    }
  }
</script>

<div class="lock">
  <div class="lock-mark">Стиль</div>
  <div class="lock-sub">Личный гардероб</div>

  <div class="dots" class:wrong>
    {#each Array(ACCESS_PIN.length) as _, i}
      <span class="dot" class:on={i < entered.length}></span>
    {/each}
  </div>

  <div class="pad">
    {#each pads as k}
      {#if k === ''}
        <span></span>
      {:else}
        <button class="key" onclick={() => press(k)}>{k}</button>
      {/if}
    {/each}
  </div>
</div>

<style>
  .lock {
    position: fixed; inset: 0; max-width: 480px; margin: 0 auto;
    background: var(--bg); z-index: 300;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 6px; padding: 0 32px calc(var(--safe-b) + 20px);
  }
  .lock-mark { font-size: 30px; font-weight: 650; letter-spacing: -0.4px; }
  .lock-sub { color: var(--muted); font-size: 13px; margin-bottom: 30px; }
  .dots { display: flex; gap: 16px; margin-bottom: 40px; }
  .dots.wrong { animation: shake .42s; }
  .dot { width: 13px; height: 13px; border-radius: 999px; border: 1.5px solid var(--ink); }
  .dot.on { background: var(--ink); }
  .pad { display: grid; grid-template-columns: repeat(3, 74px); gap: 18px; }
  .key {
    width: 74px; height: 74px; border-radius: 999px;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink);
    font-size: 26px; font-weight: 400;
  }
  .key:active { background: var(--surface-2); }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-9px); }
    40%, 80% { transform: translateX(9px); }
  }
</style>
