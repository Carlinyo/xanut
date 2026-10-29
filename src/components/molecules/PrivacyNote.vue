<template>
  <p class="pn">{{ $t('privacy.noteBefore') }}<RouterLink to="/privacy" target="_blank" rel="noopener">{{ $t('privacy.linkText') }}</RouterLink>{{ $t('privacy.noteAfter') }}</p>
</template>

<style scoped>
.pn { margin:0; color:var(--muted); font-size:12px; line-height:1.45; }
a { color:var(--yellow-lo); font-weight:600; text-decoration:underline; }
</style>
