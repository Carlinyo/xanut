<script setup lang="ts">
import InfoCard from '../components/molecules/InfoCard.vue'
import DecorSprite from '../components/atoms/DecorSprite.vue'
</script>

<template>
  <div class="wrap page has-decor">
    <DecorSprite side="right" top="-20px" />
    <h1>{{ $t('about.title') }}</h1>
    <p v-reveal="'blur'" class="lead">{{ $t('about.lead') }}</p>
    <div v-reveal.stagger="'zoom'" class="values">
      <InfoCard v-for="v in $t('about.values')" :key="v.title" v-bind="v" />
    </div>

    <!-- онлайн-оплата: тот же порядок, что на сайте — заказ → магазин подтвердил → оплата в банке → готовим -->
    <section v-reveal class="pay" aria-labelledby="pay-title">
      <h2 id="pay-title">💳 {{ $t('about.payment.title') }}</h2>
      <p class="pay__lead">{{ $t('about.payment.lead') }}</p>
      <ol class="pay__steps">
        <li v-for="(s, i) in $t('about.payment.steps')" :key="i"><span class="pay__num" aria-hidden="true">{{ i + 1 }}</span><span>{{ s }}</span></li>
      </ol>
      <ul class="pay__notes">
        <li>🔒 {{ $t('about.payment.safe') }}</li>
        <li>↩️ {{ $t('about.payment.refund') }}</li>
        <li>💵 {{ $t('about.payment.other') }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.lead { max-width:720px; color:#3b4745; font-size:clamp(16px, 1.6vw, 19px); }
.values { display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-top:28px; }
@media (max-width:700px) { .values { grid-template-columns:1fr; } }

.pay { margin-top:clamp(28px, 4vw, 44px); padding:clamp(18px, 3vw, 28px); border-radius:var(--r-lg); background:var(--bg); }
.pay h2 { margin:0 0 6px; font-size:clamp(20px, 2.2vw, 26px); }
.pay__lead { margin:0 0 18px; color:#3b4745; }
.pay__steps { display:grid; grid-template-columns:repeat(4, 1fr); gap:14px; margin:0 0 18px; padding:0; list-style:none; counter-reset:none; }
.pay__steps li { display:flex; flex-direction:column; gap:10px; padding:16px; border-radius:var(--r-md); background:#fff; box-shadow:var(--shadow-sm); font-size:14.5px; line-height:1.5; }
.pay__num { display:grid; place-items:center; width:32px; height:32px; border-radius:50%; background:var(--yellow); color:#1b1500; font-weight:800; }
.pay__notes { display:flex; flex-direction:column; gap:6px; margin:0; padding:0; list-style:none; color:var(--muted); font-size:14px; }
@media (max-width:900px) { .pay__steps { grid-template-columns:1fr 1fr; } }
@media (max-width:520px) { .pay__steps { grid-template-columns:1fr; } .pay__steps li { flex-direction:row; align-items:flex-start; } .pay__num { flex:none; } }
</style>
