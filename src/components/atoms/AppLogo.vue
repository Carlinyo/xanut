<script setup lang="ts">
import LogoMark from './LogoMark.vue'
</script>

<template>
  <RouterLink to="/" class="logo" :aria-label="$t('brand.name')">
    <LogoMark class="logo__mark" />
    <span class="logo__txt"><b>{{ $t('brand.name') }}</b><small>{{ $t('brand.slogan') }}</small></span>
  </RouterLink>
</template>

<style scoped>
.logo { display:flex; align-items:center; gap:10px; color:#fff; }
.logo__mark { width:44px; height:44px; flex:none; transition:transform .5s var(--ease); }
.logo:hover .logo__mark { transform:rotate(-8deg) scale(1.07); }
.logo__txt { display:flex; flex-direction:column; line-height:1.1; }
b { font-size:clamp(18px, 1.9vw, 22px); font-weight:800; letter-spacing:-.01em; background:linear-gradient(90deg, #fff 55%, var(--yellow)); -webkit-background-clip:text; background-clip:text; color:transparent; }
small { margin-top:3px; font-size:11px; color:var(--yellow); }
@media (max-width:1000px) { small { display:none; } } /* девиз в узкой шапке переносился в три строки */
@media (max-width:480px) { .logo__mark { width:38px; height:38px; } }
</style>
