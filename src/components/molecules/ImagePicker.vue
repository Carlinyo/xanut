<script setup lang="ts">
// Картинка товара: своя фотография (уменьшается в браузере и загружается на сервер) или готовый рисунок из набора сайта.
import { ref } from 'vue'
import { t } from '../../i18n'
import { commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { shrinkImage } from '../../utils/image'
import ProductArt from '../atoms/ProductArt.vue'

const ARTS = ['grill', 'spice', 'bread', 'drink', 'dairy', 'veg', 'kebab', 'sausage', 'mince', 'chicken', 'pork', 'ribs', 'lamb', 'steak']
const image = defineModel<string>('image', { default: '' })
const art = defineModel<string>('art', { default: 'grill' })
const admin = useAdmin(), authError = useAuthRedirect()
const uploading = ref(false)
const error = ref('')
const input = ref<HTMLInputElement | null>(null)

async function pick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (input.value) input.value.value = '' // тот же файл можно выбрать снова
  if (!file) return
  error.value = ''
  uploading.value = true
  try {
    image.value = await admin.uploadImage(await shrinkImage(file))
  } catch (err) {
    if (authError(err)) return
    const code = (err as Error).message
    error.value = code === 'IMAGE_TYPE' ? t('admin.rewards.errors.imageType')
      : code === 'IMAGE_BIG' || code === 'IMAGE_TOO_BIG' ? t('admin.rewards.errors.imageBig')
      : code === 'IMAGE_FORMAT' ? t('admin.rewards.errors.imageType')
      : `${t('admin.rewards.errors.imageFailed')} ${t(commonErrorKey(err))}`
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <fieldset class="ip">
    <legend>{{ $t('admin.rewards.form.image') }}</legend>
    <div class="ip__row">
      <div class="ip__preview" :class="{ 'is-loading': uploading }">
        <ProductArt :key="image || art" :kind="art" :src="image || undefined" alt="" />
      </div>
      <div class="ip__btns">
        <label class="ip__upload" :class="{ 'is-disabled': uploading }">
          <input ref="input" type="file" accept="image/png,image/jpeg,image/webp,image/*" :disabled="uploading" @change="pick" />
          📷 {{ uploading ? $t('admin.rewards.form.uploading') : image ? $t('admin.rewards.form.replace') : $t('admin.rewards.form.upload') }}
        </label>
        <button v-if="image && !uploading" type="button" class="ip__remove" @click="image = ''">{{ $t('admin.rewards.form.removeImage') }}</button>
        <small v-if="error" class="ip__err" role="alert">{{ error }}</small>
      </div>
    </div>
    <p class="ip__or">{{ $t('admin.rewards.form.art') }}</p>
    <div class="ip__arts" role="radiogroup" :aria-label="$t('admin.rewards.form.art')">
      <button
        v-for="a in ARTS" :key="a" type="button" role="radio" class="ip__art" :class="{ on: !image && art === a }"
        :aria-checked="!image && art === a" :title="$t('admin.rewards.arts.' + a)" :aria-label="$t('admin.rewards.arts.' + a)"
        @click="art = a; image = ''"
      >
        <img :src="`/img/art/${a}.webp`" alt="" width="40" height="40" loading="lazy" />
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.ip { min-width:0; margin:0; padding:0; border:0; font-size:14px; }
legend { padding:0 0 8px; font-weight:600; }
.ip__row { display:flex; align-items:center; gap:14px; }
.ip__preview { flex:none; width:96px; height:96px; padding:10px; border:1.5px solid var(--line); border-radius:var(--r-md); background:radial-gradient(circle at 50% 40%, #fff, var(--cream)); transition:opacity .2s; }
.ip__preview.is-loading { opacity:.45; }
.ip__btns { display:flex; flex-direction:column; align-items:flex-start; gap:6px; min-width:0; }
.ip__upload { position:relative; display:inline-flex; align-items:center; gap:6px; padding:9px 14px; border:2px solid var(--yellow); border-radius:var(--r-md); background:#fff; font-size:13px; font-weight:700; cursor:pointer; transition:background .2s; }
.ip__upload:hover { background:var(--cream); }
.ip__upload:focus-within { outline:3px solid var(--yellow); outline-offset:2px; }
.ip__upload.is-disabled { opacity:.6; cursor:progress; }
.ip__upload input { position:absolute; inset:0; opacity:0; cursor:pointer; }
.ip__remove { padding:2px 0; border:0; background:none; color:var(--muted); font-size:13px; text-decoration:underline; text-underline-offset:3px; }
.ip__remove:hover { color:var(--red); }
.ip__err { color:var(--red); font-size:12px; }
.ip__or { margin:12px 0 6px; color:var(--muted); font-size:13px; }
.ip__arts { display:grid; grid-template-columns:repeat(auto-fill, minmax(46px, 1fr)); gap:6px; }
.ip__art { display:grid; place-items:center; aspect-ratio:1; padding:4px; border:1.5px solid var(--line); border-radius:var(--r-sm); background:#fff; transition:border-color .2s, background .2s; }
.ip__art:hover { border-color:var(--yellow); }
.ip__art.on { border-color:var(--yellow-lo); background:var(--cream); }
.ip__art img { width:100%; height:auto; }
</style>
