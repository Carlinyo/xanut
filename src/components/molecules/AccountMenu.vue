<script setup lang="ts">
import type { PublicUser } from '../../types'

defineProps<{ user?: PublicUser | null; points?: number }>()
defineEmits<{ logout: [] }>()
</script>

<template>
  <div class="acct">
    <template v-if="user">
      <RouterLink v-if="points !== undefined" class="acct__pts" to="/bonus" :title="$t('bonus.chip')" :aria-label="`${$t('bonus.chip')}: ${points}`">⭐ {{ Math.max(0, points).toLocaleString('en-US') }}</RouterLink>
      <RouterLink class="acct__item" to="/account" :aria-label="$t('account.mine')">👤 <span class="acct__lbl">{{ user.name }}</span></RouterLink>
      <button class="acct__item acct__out" type="button" @click="$emit('logout')">{{ $t('account.logout') }}</button>
    </template>
    <RouterLink v-else class="acct__item" to="/login" :aria-label="$t('account.login')">👤 <span class="acct__lbl">{{ $t('account.login') }}</span></RouterLink>
  </div>
</template>

<style scoped>
.acct { display:flex; align-items:center; gap:2px; }
.acct__item { display:inline-flex; align-items:center; gap:6px; max-width:170px; padding:9px 12px; border:0; border-radius:var(--r-md); background:none; color:#dfe8e6; font-size:14px; transition:background .2s, color .2s; }
.acct__item:hover { background:var(--dark-2); color:#fff; }
.acct__pts { display:inline-flex; align-items:center; gap:4px; margin-right:4px; padding:6px 10px; border:1px solid rgb(246 178 26 / .5); border-radius:var(--pill); color:var(--yellow); font-size:13px; font-weight:800; white-space:nowrap; transition:background .2s, border-color .2s; }
.acct__pts:hover { background:rgb(246 178 26 / .14); border-color:var(--yellow); }
.acct__lbl { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
@media (max-width:700px) { .acct__item { font-size:13px; padding:8px 6px; max-width:120px; } .acct__pts { padding:5px 8px; font-size:12px; } }
@media (max-width:360px) { .acct__lbl, .acct__out { display:none; } .acct__pts { padding:4px 7px; margin-right:0; } }
</style>
