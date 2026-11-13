<script setup lang="ts">
// Подсказка рядом с кодом из письма: письмо могло попасть в «Спам» или «Промоакции». Если покупатель отметит его
// «Не спам», следующие письма магазина почтовый сервис будет класть во «Входящие».
</script>

<template>
  <div class="spam" role="note">
    <span class="spam__icon" aria-hidden="true">📬</span>
    <div>
      <b>{{ $t('otp.spam.title') }}</b>
      <p>{{ $t('otp.spam.text') }}</p>
    </div>
  </div>
</template>

<style scoped>
.spam { display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border:1.5px dashed #e9a300; border-radius:var(--r-md); background:#fff8e1; color:var(--dark, #1b1500); text-align:left; }
.spam__icon { font-size:20px; line-height:1.2; }
.spam b { display:block; margin-bottom:2px; font-size:13.5px; }
.spam p { margin:0; font-size:12.5px; line-height:1.45; }
</style>
