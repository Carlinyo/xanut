<script setup lang="ts">
// Окно «Вы уверены?» поверх страницы (и поверх корзины). Открывается через useConfirm().ask(…).
import { nextTick, ref, watch } from 'vue'
import { NOTE_MAX, useConfirm } from '../../stores/confirm'
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

/** Готовый вариант: пустое поле или другой вариант — заменить им; повторное нажатие — убрать;
 *  написанный от руки текст не стираем — вариант дописывается к нему. */
function pick(p: string) {
  const cur = c.note.trim()
  const presets = c.current?.note?.presets ?? []
  if (cur === p) c.note = ''
  else if (!cur || presets.includes(cur)) c.note = p
  else c.note = `${cur} ${p}`.slice(0, NOTE_MAX)
}
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
        <div v-if="c.current.note" class="cf__note">
          <label class="cf__note-label" for="cf-note">{{ c.current.note.label }}</label>
          <div v-if="c.current.note.presets?.length" class="cf__presets" role="group" :aria-label="$t('confirm.presets')">
            <button
              v-for="p in c.current.note.presets" :key="p" type="button" class="cf__preset" :class="{ 'is-on': c.note.trim() === p }"
              :aria-pressed="c.note.trim() === p" @click="pick(p)"
            >{{ p }}</button>
          </div>
          <textarea
            id="cf-note" v-model="c.note" class="cf__area" rows="3" :maxlength="NOTE_MAX" :placeholder="c.current.note.placeholder"
            aria-describedby="cf-note-hint"
          />
          <div id="cf-note-hint" class="cf__note-foot">
            <small>{{ c.current.note.hint }}</small>
            <small class="cf__count" :class="{ 'is-full': c.note.length >= NOTE_MAX }">{{ c.note.length }}/{{ NOTE_MAX }}</small>
          </div>
        </div>
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
.cf__note { display:flex; flex-direction:column; gap:8px; }
.cf__note-label { font-size:14px; font-weight:700; }
.cf__presets { display:flex; flex-wrap:wrap; gap:6px; }
.cf__preset { padding:7px 12px; border:1.5px solid var(--line); border-radius:var(--pill); background:#fff; color:var(--ink); font-size:13px; font-weight:600; line-height:1.3; text-align:left; transition:border-color .2s, background .2s; }
.cf__preset:hover { border-color:var(--yellow); background:var(--cream); }
.cf__preset.is-on { border-color:var(--yellow-lo); background:var(--yellow); color:#1b1500; }
.cf__area { width:100%; min-height:76px; padding:10px 12px; border:1.5px solid var(--line); border-radius:var(--r-md); background:#fff; color:var(--ink); font:inherit; font-size:14px; line-height:1.45; resize:vertical; transition:border-color .2s, box-shadow .2s; }
.cf__area:focus { outline:none; border-color:var(--yellow); box-shadow:0 0 0 4px rgb(246 178 26 / .22); }
.cf__note-foot { display:flex; justify-content:space-between; gap:12px; color:var(--muted); font-size:12px; line-height:1.4; }
.cf__count { flex:none; font-variant-numeric:tabular-nums; }
.cf__count.is-full { color:var(--red); font-weight:700; }
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
