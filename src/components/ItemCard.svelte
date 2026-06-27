<script>
  import { itemImg } from '../lib/catalog.js'
  let { item, onclick } = $props()
</script>

<button class="card" class:dim={item.archived} {onclick}>
  <div class="thumb">
    <img src={itemImg(item)} alt={item.name} loading="lazy" />
  </div>
  <div class="meta">
    <div class="name">{item.name || item.type}</div>
    {#if item.brand}<div class="brand">{item.brand}</div>{/if}
  </div>
</button>
