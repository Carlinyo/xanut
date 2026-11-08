<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { artUrl, thumbUrl } from '../../utils/art'

// Изображения товаров лежат в public/img/art (см. utils/art.ts).
// Свою фотографию товара можно передать через src, например "/img/lamb-rack.jpg".
// Картинка в карточке, корзине или окне — не больше ~200 px, поэтому берётся маленькая копия (до 400 px, в 5 раз легче);
// full — полное фото (страница товара). Копии нет (фото добавили, а tools/shrink-photos.mjs не запускали) — полное фото.
const props = withDefaults(defineProps<{ kind?: string; src?: string; alt?: string; full?: boolean }>(), { alt: '' })
const original = computed(() => props.src || artUrl(props.kind))
const noThumb = ref(false)
const file = computed(() => (props.full || noThumb.value ? original.value : thumbUrl(original.value) ?? original.value))

// картинка проявляется из размытия, когда загрузилась (из кэша — сразу)
const img = ref<HTMLImageElement | null>(null)
const loaded = ref(false)
onMounted(() => { if (img.value?.complete) loaded.value = true })
function failed() {
  if (file.value !== original.value) noThumb.value = true // копии нет — полное фото
  else loaded.value = true
}
</script>

<template>
  <img ref="img" :src="file" :alt="alt" class="photo" :class="{ loaded }" width="800" height="800" loading="lazy" decoding="async" @load="loaded = true" @error="failed" />
</template>

<style scoped>
:where(.photo) { display:block; width:100%; height:100%; object-fit:contain; }
.photo { opacity:0; filter:blur(14px); transform:scale(.96); transition:opacity .6s ease, filter .7s ease, transform .7s cubic-bezier(.16,1,.3,1); }
.photo.loaded { opacity:1; filter:none; transform:none; }
@media (prefers-reduced-motion:reduce) { .photo { opacity:1; filter:none; transform:none; } }
</style>
