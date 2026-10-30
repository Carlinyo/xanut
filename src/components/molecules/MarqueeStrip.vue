<script setup lang="ts">
// Бегущая строка с преимуществами магазина (тексты — locales/hy.json → marquee). Пауза при наведении.
defineProps<{ items: string[] }>()
</script>

<template>
  <!-- обёртка обрезает наклонённую ленту по краям экрана: иначе страницу можно сдвинуть вбок на несколько пикселей -->
  <div class="mq-wrap" aria-hidden="true">
    <div class="mq">
      <div class="mq__track">
        <template v-for="n in 2" :key="n">
          <span v-for="(t, i) in items" :key="`${n}-${i}`" class="mq__item">{{ t }}<i>🔥</i></span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mq-wrap { overflow:hidden; padding-block:22px; margin-block:-22px; }
.mq { overflow:hidden; padding:14px 0; background:linear-gradient(90deg, #f6b21a, #ff8a1e); color:#1b1000; transform:rotate(-1.2deg) scale(1.02); box-shadow:0 10px 30px -14px rgb(226 52 28 / .6); }
.mq__track { display:flex; width:max-content; animation:marquee 32s linear infinite; }
.mq:hover .mq__track { animation-play-state:paused; }
.mq__item { display:inline-flex; align-items:center; gap:22px; padding-right:22px; font-weight:800; font-size:clamp(14px, 1.6vw, 18px); white-space:nowrap; letter-spacing:.01em; }
.mq__item i { font-style:normal; }
@keyframes marquee { to { transform:translateX(-50%); } }
</style>
