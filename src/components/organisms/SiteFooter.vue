<script setup lang="ts">
import AppLogo from '../atoms/AppLogo.vue'
</script>

<template>
  <footer class="foot">
    <div class="wrap foot__in">
      <AppLogo />
      <ul>
        <li>📞 <a :href="`tel:${$t('contact.phone').replace(/\s/g, '')}`">{{ $t('contact.phone') }}</a></li>
        <li>📍 {{ $t('contact.address') }}</li>
        <li>✉️ <a :href="`mailto:${$t('contact.email')}`">{{ $t('contact.email') }}</a></li>
        <li>🕘 {{ $t('contact.hours') }}</li>
        <li><RouterLink to="/privacy">{{ $t('privacy.title') }}</RouterLink></li>
      </ul>
    </div>
  </footer>
</template>

<style scoped>
.foot { position:relative; margin-top:clamp(40px, 6vw, 72px); padding-block:clamp(28px, 4vw, 44px); color:#d8e0de; font-size:14px;
  background:linear-gradient(180deg, rgb(14 26 25 / .97) 0%, rgb(14 26 25 / .9) 55%, rgb(20 14 10 / .78) 100%), url(/img/bg/coals.webp) center 70% / cover, var(--dark);
  box-shadow:inset 0 1px 0 rgb(255 140 50 / .28); }
.foot::before { content:''; position:absolute; inset:0 0 auto; height:2px; background:linear-gradient(90deg, transparent, #ff8a1e 30%, #f6b21a 50%, #ff8a1e 70%, transparent); opacity:.7; }
.foot__in { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px 32px; }
ul { display:flex; flex-wrap:wrap; gap:10px 28px; margin:0; padding:0; list-style:none; }
a { transition:color .2s; }
a:hover { color:var(--yellow); }
@media (max-width:700px) { .foot__in, ul { flex-direction:column; align-items:flex-start; } }
</style>
