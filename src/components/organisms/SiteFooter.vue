<script setup lang="ts">
import { useFeedback } from '../../stores/feedback'
import AppLogo from '../atoms/AppLogo.vue'
const feedback = useFeedback()
</script>

<template>
  <footer class="foot">
    <div class="wrap foot__in">
      <div class="foot__brand">
        <AppLogo big />
        <p>{{ $t('brand.slogan') }}</p>
      </div>
      <ul>
        <li><span aria-hidden="true">📞</span><a :href="`tel:${$t('contact.phone').replace(/\s/g, '')}`">{{ $t('contact.phone') }}</a></li>
        <li><span aria-hidden="true">🕘</span>{{ $t('contact.hours') }}</li>
        <li><span aria-hidden="true">📍</span>{{ $t('contact.address') }}</li>
        <li><span aria-hidden="true">✉️</span><a :href="`mailto:${$t('contact.email')}`">{{ $t('contact.email') }}</a></li>
        <li><span aria-hidden="true">💬</span><button type="button" class="foot__fb" @click="feedback.open()">{{ $t('feedback.link') }}</button></li>
        <li><span aria-hidden="true">🔒</span><RouterLink to="/privacy">{{ $t('privacy.title') }}</RouterLink></li>
      </ul>
    </div>
    <p class="wrap foot__copy">© {{ new Date().getFullYear() }} {{ $t('brand.name') }}</p>
  </footer>
</template>

<style scoped>
.foot { position:relative; margin-top:clamp(40px, 6vw, 72px); padding-block:clamp(28px, 4vw, 44px) 18px; color:#d8e0de; font-size:14px;
  background:linear-gradient(180deg, rgb(14 26 25 / .97) 0%, rgb(14 26 25 / .9) 55%, rgb(20 14 10 / .78) 100%), url(/img/bg/coals.webp) center 70% / cover, var(--dark);
  box-shadow:inset 0 1px 0 rgb(255 140 50 / .28); }
.foot::before { content:''; position:absolute; inset:0 0 auto; height:2px; background:linear-gradient(90deg, transparent, #ff8a1e 30%, #f6b21a 50%, #ff8a1e 70%, transparent); opacity:.7; }
/* эмблема с девизом слева, контакты — двумя столбцами справа; на телефоне всё по центру одной колонкой */
.foot__in { display:flex; align-items:center; justify-content:space-between; gap:24px clamp(28px, 6vw, 80px); }
.foot__brand { display:flex; flex-direction:column; align-items:center; gap:8px; flex:none; }
.foot__brand p { margin:0; color:var(--yellow); font-size:13px; font-weight:600; }
ul { display:grid; grid-template-columns:repeat(2, minmax(0, max-content)); gap:14px clamp(24px, 5vw, 64px); margin:0; padding:0; list-style:none; }
li { display:flex; align-items:baseline; gap:9px; min-width:0; }
li > span { flex:none; }
a { transition:color .2s; }
a:hover { color:var(--yellow); }
.foot__fb { padding:0; border:0; background:none; color:inherit; font:inherit; text-align:left; text-decoration:underline; text-decoration-color:rgb(246 178 26 / .6); text-underline-offset:3px; transition:color .2s; }
.foot__fb:hover { color:var(--yellow); }
.foot__copy { margin-top:clamp(20px, 3vw, 30px); padding-top:14px; border-top:1px solid rgb(255 255 255 / .1); color:#93a19e; font-size:12.5px; text-align:center; } /* по центру: слева внизу — кнопка «наверх» */
@media (max-width:760px) {
  .foot__in { flex-direction:column; align-items:center; }
  ul { grid-template-columns:1fr; gap:11px; }
}
</style>
