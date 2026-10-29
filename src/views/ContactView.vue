<script setup lang="ts">
import InfoPanel from '../components/molecules/InfoPanel.vue'
import ContactForm from '../components/organisms/ContactForm.vue'
import StoreMap from '../components/organisms/StoreMap.vue'
</script>

<template>
  <div class="wrap page">
    <h1>{{ $t('contact.title') }}</h1>
    <StoreMap v-reveal="'zoom'" class="contact__map" />
    <div class="duo">
      <InfoPanel v-reveal="'left'" :title="$t('contact.info')">
        <p>📞 <a :href="`tel:${$t('contact.phone').replace(/\s/g, '')}`">{{ $t('contact.phone') }}</a></p>
        <p>📍 {{ $t('contact.address') }}</p>
        <p>✉️ <a :href="`mailto:${$t('contact.email')}`">{{ $t('contact.email') }}</a></p>
        <p>🕘 {{ $t('contact.hours') }}</p>
      </InfoPanel>
      <ContactForm v-reveal="'right'" />
    </div>
  </div>
</template>

<style scoped>
.contact__map { margin-bottom:16px; }
.duo a { color:inherit; font-weight:600; overflow-wrap:anywhere; transition:color .2s; }
.duo a:hover { color:var(--yellow-lo); }
</style>
