<script setup lang="ts">
import type { NavItem } from '../../types'

defineProps<{ items: NavItem[]; city?: string }>()
defineEmits<{ action: [id: string] }>()
</script>

<template>
  <nav class="nav" :aria-label="$t('nav.label')">
    <template v-for="i in items" :key="i.label">
      <RouterLink v-if="'to' in i" :to="i.to" class="nav__link">{{ i.label }}</RouterLink>
      <button v-else type="button" class="nav__link" @click="$emit('action', i.id)">{{ i.label }}</button>
    </template>
    <span v-if="city" class="nav__city">📍 {{ city }}</span>
  </nav>
</template>

<style scoped>
.nav { display:flex; align-items:center; gap:4px; overflow-x:auto; scrollbar-width:none; border-top:1px solid rgb(255 255 255 / .08); }
.nav::-webkit-scrollbar { display:none; }
.nav__link { position:relative; flex:none; padding:13px 14px; border:0; background:none; color:#cfdad8; font-size:14px; transition:color .2s; }
.nav__link::after { content:''; position:absolute; left:14px; right:14px; bottom:0; height:3px; border-radius:3px 3px 0 0; background:var(--yellow); transform:scaleX(0); transition:transform .4s var(--ease); }
.nav__link:hover { color:#fff; }
.nav__link:hover::after { transform:scaleX(.45); }
.nav__link.router-link-active { color:var(--yellow); font-weight:600; }
.nav__link.router-link-active::after { transform:scaleX(1); }
.nav__city { margin-left:auto; flex:none; padding-left:12px; color:var(--yellow); font-size:14px; }
@media (max-width:900px) { .nav__city { display:none; } }
@media (max-width:480px) { .nav__link { padding:12px 10px; font-size:13px; } .nav__link::after { left:10px; right:10px; } }
</style>
