<script setup lang="ts">
import type { PublicUser } from '../../types'

defineProps<{ user?: PublicUser | null; points?: number }>()
defineEmits<{ logout: [] }>()
</script>

<template>
  <div class="acct">
    <template v-if="user">
      <RouterLink v-if="points !== undefined" class="acct__pts" to="/bonus" :title="$t('bonus.chip')" :aria-label="`${$t('bonus.chip')}: ${points}`">⭐ {{ Math.max(0, points).toLocaleString('en-US') }}</RouterLink>
      <RouterLink v-if="user.role === 'admin'" class="acct__item acct__admin" to="/admin" :aria-label="$t('admin.title')">⚙ <span class="acct__lbl acct__lbl--md">{{ $t('admin.link') }}</span></RouterLink>
      <RouterLink class="acct__item" to="/account" :aria-label="$t('account.mine')">👤 <span class="acct__lbl">{{ user.name }}</span></RouterLink>
      <button class="acct__item acct__out" type="button" :aria-label="$t('account.logout')" @click="$emit('logout')">
        <span class="acct__lbl acct__lbl--md">{{ $t('account.logout') }}</span><span class="acct__ico" aria-hidden="true">🚪</span>
      </button>
    </template>
    <RouterLink v-else class="acct__item" to="/login" :aria-label="$t('account.login')">
      👤 <span class="acct__lbl">{{ $t('account.login') }}</span><span class="acct__short">{{ $t('account.loginShort') }}</span>
    </RouterLink>
  </div>
</template>

<style scoped>
.acct { display:flex; align-items:center; gap:2px; }
.acct__item { display:inline-flex; align-items:center; gap:6px; max-width:170px; padding:9px 12px; border:0; border-radius:var(--r-md); background:none; color:#dfe8e6; font-size:14px; transition:background .2s, color .2s; }
.acct__item:hover { background:var(--dark-2); color:#fff; }
.acct__pts { display:inline-flex; align-items:center; gap:4px; margin-right:4px; padding:6px 10px; border:1px solid rgb(246 178 26 / .5); border-radius:var(--pill); color:var(--yellow); font-size:13px; font-weight:800; white-space:nowrap; transition:background .2s, border-color .2s; }
.acct__pts:hover { background:rgb(246 178 26 / .14); border-color:var(--yellow); }
.acct__lbl { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.acct__admin { color:var(--yellow); font-weight:700; }
.acct__ico, .acct__short { display:none; }
/* планшет и узкий ноутбук: «Ադմին» и «Ելք» — значками, иначе шапка не помещается и корзина уезжает за край */
@media (max-width:1100px) { .acct__lbl--md { display:none; } .acct__out .acct__ico { display:inline; } .acct__item { max-width:140px; } }
/* телефон: значки вместо подписей — меню помещается в строку с логотипом и корзиной (раньше уезжало на вторую строку,
   и после входа вся страница сдвигалась вниз) */
@media (max-width:700px) {
  .acct__item { font-size:13px; padding:8px 7px; }
  .acct__lbl { display:none; }
  .acct__ico, .acct__short { display:inline; }
  .acct__pts { padding:5px 8px; font-size:12px; }
}
@media (max-width:360px) { .acct__pts { padding:4px 7px; margin-right:0; } .acct__item { padding:8px 5px; } }
</style>
