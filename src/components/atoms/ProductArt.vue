<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

// Изображения товаров лежат в public/img/art (создаются tools/render-art.mjs).
// Свою фотографию товара можно передать через src, например "/img/lamb-rack.jpg".
const KINDS = ['steak', 'pork', 'ribs', 'lamb', 'chicken', 'sausage', 'mince', 'kebab', 'veg', 'bread', 'dairy', 'spice', 'drink', 'grill']
const props = withDefaults(defineProps<{ kind?: string; src?: string; alt?: string }>(), { alt: '' })
const file = computed(() => props.src || `/img/art/${KINDS.includes(props.kind ?? '') ? props.kind : 'steak'}.webp`)

// картинка проявляется из размытия, когда загрузилась (из кэша — сразу)
const img = ref<HTMLImageElement | null>(null)
const loaded = ref(false)
onMounted(() => { if (img.value?.complete) loaded.value = true })
</script>

<template>
  <img ref="img" :src="file" :alt="alt" class="photo" :class="{ loaded }" width="800" height="800" loading="lazy" decoding="async" @load="loaded = true" @error="loaded = true" />
</template>

<style scoped>
:where(.photo) { display:block; width:100%; height:100%; object-fit:contain; }
.photo { opacity:0; filter:blur(14px); transform:scale(.96); transition:opacity .6s ease, filter .7s ease, transform .7s cubic-bezier(.16,1,.3,1); }
.photo.loaded { opacity:1; filter:none; transform:none; }
@media (prefers-reduced-motion:reduce) { .photo { opacity:1; filter:none; transform:none; } }
</style>
