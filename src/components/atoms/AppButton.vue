<script setup lang="ts">
import type { LinkTo } from '../../types'

withDefaults(defineProps<{
  to?: LinkTo
  variant?: 'primary' | 'ghost' | 'light' | 'icon' | 'close'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  type?: 'button' | 'submit'
}>(), { variant: 'primary', size: 'md', type: 'button' })
</script>

<template>
  <component :is="to ? 'RouterLink' : 'button'" :to="to" :type="to ? undefined : type"
    class="btn" :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block }]">
    <slot />
  </component>
</template>

<style scoped>
.btn { position:relative; display:inline-flex; align-items:center; justify-content:center; gap:8px; border:0; border-radius:var(--r-md); font-weight:700; line-height:1.2; text-align:center; transition:transform var(--t) var(--ease), background var(--t), box-shadow var(--t), border-color var(--t), color var(--t); }
.btn:active { transform:translateY(1px) scale(.98); }
.btn:disabled { opacity:.5; cursor:not-allowed; }
.btn--sm { padding:9px 12px; font-size:13px; }
.btn--md { padding:11px 18px; font-size:14px; }
.btn--lg { padding:15px 28px; font-size:16px; }
.btn--block { display:flex; width:100%; }
.btn--primary { background:linear-gradient(180deg, var(--yellow-hi), var(--yellow)); color:#1b1500; box-shadow:0 1px 0 var(--yellow-lo), 0 8px 16px -8px rgb(246 178 26 / .8); }
.btn--primary:hover { transform:translateY(-2px); box-shadow:0 1px 0 var(--yellow-lo), 0 14px 22px -10px rgb(246 178 26 / .9); }
.btn--ghost { background:transparent; color:#fff; border:2px solid rgb(255 255 255 / .4); }
.btn--ghost:hover { background:rgb(255 255 255 / .12); border-color:#fff; }
.btn--light { background:#fff; color:var(--ink); border:2px solid var(--yellow); }
.btn--light:hover { background:var(--cream); }
.btn--icon { width:44px; height:44px; padding:0; border-radius:50%; background:var(--dark-2); color:#fff; font-size:20px; }
.btn--icon:hover { background:var(--dark-3); transform:translateY(-2px); }
.btn--close { width:40px; height:40px; padding:0; border-radius:50%; background:var(--bg); color:var(--ink); }
.btn--close:hover { background:var(--line); transform:rotate(90deg); }
</style>
