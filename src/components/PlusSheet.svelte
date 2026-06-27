<script>
  import { ui } from '../lib/state.svelte.js'
  import { uid } from '../lib/db.js'
  import { currentSeason } from '../lib/catalog.js'

  const close = () => (ui.plusSheet = false)
  function newOutfit() {
    close()
    ui.editorOutfit = { guid: uid('outfit'), name: 'Новый образ', seasons: [], picture: '', objects: [], isNew: true }
  }
  function photo() {
    close()
    ui.photoImport = true
  }
</script>

<div class="sheet-backdrop" onclick={close} role="presentation">
  <div class="sheet" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Добавить">
    <div class="sheet-head"><h3>Добавить</h3><button class="ebtn" onclick={close} aria-label="Закрыть">✕</button></div>
    <div class="plus-actions">
      <button class="plus-act" onclick={photo}>
        <span class="pa-ic">📷</span>
        <span class="pa-t"><b>Сфотографировать вещь</b><i>фото → вырезка без фона → в гардероб</i></span>
      </button>
      <button class="plus-act" onclick={newOutfit}>
        <span class="pa-ic">◳</span>
        <span class="pa-t"><b>Новый образ</b><i>собрать коллаж на холсте</i></span>
      </button>
    </div>
  </div>
</div>

<style>
  .plus-actions { padding: 4px 16px 20px; display: flex; flex-direction: column; gap: 10px; }
  .plus-act {
    display: flex; align-items: center; gap: 14px; text-align: left; width: 100%;
    background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px;
  }
  .pa-ic { font-size: 24px; width: 30px; text-align: center; }
  .pa-t { display: flex; flex-direction: column; gap: 3px; }
  .pa-t b { font-size: 15px; }
  .pa-t i { font-size: 12px; color: var(--muted); font-style: normal; }
</style>
