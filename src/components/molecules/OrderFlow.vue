<script setup lang="ts">
// Баннер в корзине: как идёт заказ — заказ → магазин подтверждает или отказывает → оплата онлайн (только при оплате
// картой на сайте) → начинаем готовить. Письма покупателю (сервер, lib/orderStatus.ts): «принят» (у онлайн-заказа —
// со ссылкой на оплату), «отменён» с причиной и «готов».
// online: true — выбрана оплата онлайн; false — другая; null — ещё не выбрана (гость): шаг оплаты с пометкой «если выберете».
import { computed } from 'vue'

const props = defineProps<{ online: boolean | null; email?: string }>()
const steps = computed(() => [
  { key: 'order', icon: '🛒' },
  { key: 'confirm', icon: '✅' },
  ...(props.online === false ? [] : [{ key: 'pay', icon: '💳' }]),
  { key: 'start', icon: '🔥' },
])
</script>

<template>
  <section class="flow" :aria-label="$t('orderFlow.title')">
    <h3 class="flow__title">{{ $t('orderFlow.title') }}</h3>
    <ol class="flow__steps">
      <li v-for="(s, i) in steps" :key="s.key" class="flow__step">
        <span class="flow__num" aria-hidden="true">{{ i + 1 }}</span>
        <span class="flow__body">
          <b>{{ s.icon }} {{ $t(`orderFlow.steps.${s.key}.title`) }}</b>
          <small v-if="s.key === 'pay' && online === null" class="flow__opt">{{ $t('orderFlow.ifOnline') }}</small>
          <span class="flow__text">{{ $t(s.key === 'start' && online ? 'orderFlow.steps.start.textPaid' : `orderFlow.steps.${s.key}.text`) }}</span>
        </span>
      </li>
    </ol>
    <p class="flow__mail">
      <span aria-hidden="true">📧</span>
      <span>
        {{$t('orderFlow.email') }}
        <template v-if="online">{{ $t('orderFlow.emailPay') }}</template>
      </span>
    </p>
  </section>
</template>

<style scoped>
.flow { padding:14px 16px; border:1.5px solid rgb(217 151 0 / .45); border-radius:var(--r-md); background:var(--cream); }
.flow__title { margin:0 0 10px; font-size:15px; font-weight:800; }
.flow__steps { position:relative; display:flex; flex-direction:column; gap:10px; margin:0; padding:0; list-style:none; }
.flow__step { position:relative; display:flex; gap:10px; }
/* линия между номерами шагов */
.flow__step:not(:last-child)::before { content:''; position:absolute; top:26px; bottom:-10px; left:12px; width:2px; background:rgb(217 151 0 / .35); }
.flow__num { display:grid; place-items:center; flex:none; width:26px; height:26px; border-radius:50%; background:var(--yellow); color:#1b1500; font-size:13px; font-weight:800; }
.flow__body { display:flex; flex-direction:column; min-width:0; font-size:14px; line-height:1.4; }
.flow__opt { align-self:flex-start; margin-top:2px; padding:1px 8px; border-radius:var(--pill); background:#fff; color:#7a5600; font-size:11.5px; font-weight:700; }
.flow__text { color:var(--muted); font-size:12.5px; }
.flow__mail { display:flex; gap:8px; margin:12px 0 0; padding:10px 12px; border-radius:var(--r-md); background:#fff; color:var(--ink); font-size:13px; line-height:1.45; overflow-wrap:anywhere; }
</style>
