<script setup lang="ts">
// Окно «Вы уверены?» поверх страницы (и поверх корзины). Открывается через useConfirm().ask(…).
import { nextTick, ref, watch } from 'vue'
import { useConfirm } from '../../stores/confirm'
import OverlayShell from './OverlayShell.vue'
import AppButton from '../atoms/AppButton.vue'

const c = useConfirm()
const yesBtn = ref<{ $el: HTMLElement } | null>(null)
const noBtn = ref<HTMLButtonElement | null>(null)
// фокус — на безопасной кнопке: для необратимого действия это «нет», иначе — «да» (Enter подтверждает)
watch(() => c.current, async (o) => {
  if (!o) return
  await nextTick()
  if (o.tone === 'danger') noBtn.value?.focus({ preventScroll: true })
  else yesBtn.value?.$el.focus({ preventScroll: true })
})
</script>

<template>
  <Transition name="overlay">
    <OverlayShell v-if="c.current" class="confirm-layer" role="alertdialog" :label="c.current.title" @close="c.answer(false)">
      <div class="cf" :class="`cf--${c.current.tone ?? 'primary'}`">
        <span v-if="c.current.icon" class="cf__icon" aria-hidden="true">{{ c.current.icon }}</span>
        <h2 class="cf__title">{{ c.current.title }}</h2>
        <p v-if="c.current.text" class="cf__text">{{ c.current.text }}</p>
        <dl v-if="c.current.rows?.length" class="cf__rows">
          <template v-for="r in c.current.rows" :key="r.label">
            <dt :class="{ strong: r.strong }">{{ r.label }}</dt>
            <dd :class="{ strong: r.strong }">{{ r.value }}</dd>
          </template>
        </dl>
        <div class="cf__btns">
          <button ref="noBtn" type="button" class="cf__no" @click="c.answer(false)">{{ c.current.no ?? $t('confirm.no') }}</button>
          <button v-if="c.current.tone === 'danger'" type="button" class="cf__danger" @click="c.answer(true)">{{ c.current.yes }}</button>
          <AppButton v-else ref="yesBtn" @click="c.answer(true)">{{ c.current.yes }}</AppButton>
        </div>
      </div>
    </OverlayShell>
  </Transition>
</template>

<style scoped>
.overlay.confirm-layer { z-index:80; } /* поверх корзины и других окон */
.cf { display:flex; flex-direction:column; gap:12px; padding:clamp(20px, 4vw, 28px); }
.cf__icon { font-size:34px; line-height:1; }
.cf__title { margin:0; font-size:21px; line-height:1.3; }
.cf__text { margin:0; color:var(--muted); font-size:14.5px; line-height:1.55; }
.cf__rows { display:grid; grid-template-columns:auto 1fr; gap:8px 16px; margin:4px 0 0; padding:14px 16px; border-radius:var(--r-md); background:var(--bg); font-size:14px; }
.cf__rows dt { color:var(--muted); }
.cf__rows dd { margin:0; text-align:right; overflow-wrap:anywhere; }
.cf__rows .strong { padding-top:8px; border-top:1px dashed var(--line); color:var(--ink); font-size:17px; font-weight:800; }
.cf__rows dt.strong { margin-right:-16px; padding-right:16px; } /* черта итога — через всю строку, без разрыва между колонками */
.cf__btns { display:flex; justify-content:flex-end; gap:10px; margin-top:8px; }
.cf__no { padding:11px 18px; border:2px solid var(--line); border-radius:var(--r-md); background:#fff; color:var(--ink); font-size:14px; font-weight:700; transition:border-color .2s, background .2s; }
.cf__no:hover { border-color:var(--yellow); background:var(--cream); }
.cf__danger { padding:11px 18px; border:0; border-radius:var(--r-md); background:var(--red); color:#fff; font-size:14px; font-weight:700; transition:background .2s; }
.cf__danger:hover { background:#c92a22; }
@media (max-width:700px) {
  .cf { padding-bottom:max(20px, env(safe-area-inset-bottom)); }
  /* на телефоне окно — снизу, кнопки во всю ширину: «да» ближе к большому пальцу */
  .cf__btns { flex-direction:column-reverse; }
  .cf__btns > * { width:100%; padding-block:14px; }
}
</style>
