<script setup lang="ts">
import { useFeedback } from '../stores/feedback'
import InfoPanel from '../components/molecules/InfoPanel.vue'
import ContactForm from '../components/organisms/ContactForm.vue'
import StoreMap from '../components/organisms/StoreMap.vue'
import AppButton from '../components/atoms/AppButton.vue'
const feedback = useFeedback()
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
    <section class="fb-cta">
      <div>
        <h2>💬 {{ $t('feedback.ctaTitle') }}</h2>
        <p>{{ $t('feedback.ctaText') }}</p>
      </div>
      <AppButton variant="light" @click="feedback.open()">{{ $t('feedback.link') }}</AppButton>
    </section>
  </div>
</template>

<style scoped>
.contact__map { margin-bottom:16px; }
.duo a { color:inherit; font-weight:600; overflow-wrap:anywhere; transition:color .2s; }
.duo a:hover { color:var(--yellow-lo); }
.fb-cta { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px 24px; margin-top:16px; padding:clamp(16px, 2.6vw, 24px); border:1.5px dashed var(--yellow); border-radius:var(--r-lg); background:var(--cream); }
.fb-cta > div { flex:1 1 320px; min-width:0; }
.fb-cta h2 { margin:0 0 4px; font-size:clamp(17px, 2.2vw, 20px); }
.fb-cta p { margin:0; color:#5c4a1c; font-size:14px; line-height:1.5; }
</style>
