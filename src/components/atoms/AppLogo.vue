<script setup lang="ts">
// Эмблема — картинка public/img/logo-180.webp (олень, водопад Джермука, мангал и лента с названием);
// рядом название текстом: на эмблеме в шапке буквы слишком мелкие. big — крупная эмблема без текста (подвал).
defineProps<{ big?: boolean }>()
</script>

<template>
  <RouterLink to="/" class="logo" :class="{ 'logo--big': big }" :aria-label="$t('brand.name')">
    <img class="logo__mark" :src="big ? '/img/logo-480.webp' : '/img/logo-180.webp'" :width="big ? 180 : 62" :height="big ? 160 : 55" alt="" decoding="async" />
    <span v-if="!big" class="logo__txt"><b>{{ $t('brand.name') }}</b><small>{{ $t('brand.slogan') }}</small></span>
  </RouterLink>
</template>

<style scoped>
.logo { display:flex; align-items:center; gap:10px; color:#fff; }
.logo__mark { width:62px; height:55px; flex:none; margin-block:-6px; filter:drop-shadow(0 3px 6px rgb(0 0 0 / .45)); transition:transform .5s var(--ease); }
.logo:hover .logo__mark { transform:rotate(-4deg) scale(1.06); }
.logo--big .logo__mark { width:180px; height:160px; margin:0; }
@media (max-width:480px) { .logo--big .logo__mark { width:158px; height:140px; margin:0; } }
.logo__txt { display:flex; flex-direction:column; line-height:1.1; }
b { font-size:clamp(18px, 1.9vw, 22px); font-weight:800; letter-spacing:-.01em; background:linear-gradient(90deg, #fff 55%, var(--yellow)); -webkit-background-clip:text; background-clip:text; color:transparent; }
small { margin-top:3px; font-size:11px; color:var(--yellow); }
@media (max-width:1000px) { small { display:none; } } /* девиз в узкой шапке переносился в три строки */
/* телефон: название в две строки («Միս ու» / «մթերք»), чтобы шапка помещалась в одну строку и у вошедшего (баллы, кабинет, корзина) */
@media (max-width:480px) { .logo { gap:7px; } .logo__mark { width:45px; height:40px; margin-block:-2px; } b { max-width:5.4em; font-size:16px; line-height:1.05; } }
@media (max-width:380px) { .logo { gap:6px; } .logo__mark { width:38px; height:34px; margin:0; } b { font-size:15px; } }
</style>
