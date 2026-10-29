<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../../i18n'
import { api } from '../../api'
import { rules } from '../../validators'
import InfoPanel from '../molecules/InfoPanel.vue'
import AppInput from '../atoms/AppInput.vue'
import AppButton from '../atoms/AppButton.vue'
import PrivacyNote from '../molecules/PrivacyNote.vue'

const email = ref(''), done = ref(false), busy = ref(false), error = ref('')
async function subscribe() {
  if (busy.value) return
  const r = rules.email(email.value)
  error.value = r === true ? '' : r
  if (error.value) return
  busy.value = true
  try {
    await api('/subscribe', { method: 'POST', body: { email: email.value } }) // сервер не дублирует один и тот же email
    done.value = true
  } catch {
    error.value = t('errors.generic')
  } finally { busy.value = false }
}
</script>

<template>
  <InfoPanel :title="'✉️ ' + $t('newsletter.title')">
    <p class="muted">{{ $t('newsletter.text') }}</p>
    <p v-if="done" class="ok">{{ $t('newsletter.thanks') }}</p>
    <form v-else class="nl" novalidate @submit.prevent="subscribe">
      <AppInput v-model="email" type="email" :invalid="!!error" :placeholder="$t('newsletter.placeholder')" :aria-label="$t('newsletter.placeholder')" />
      <AppButton type="submit" :disabled="busy">{{ busy ? $t('common.sending') : $t('newsletter.submit') }}</AppButton>
      <small v-if="error" class="nl__err" role="alert">{{ error }}</small>
    </form>
    <PrivacyNote v-if="!done" />
  </InfoPanel>
</template>

<style scoped>
.nl { display:flex; flex-wrap:wrap; gap:10px; width:100%; }
.nl > :first-child { flex:1 1 200px; }
.nl__err { flex-basis:100%; color:var(--red); font-size:12px; }
.ok { padding:12px 14px; border-radius:var(--r-md); background:#e8f6ec; color:var(--green); font-weight:700; animation:rise .5s var(--ease); }
</style>
