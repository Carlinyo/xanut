<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { t } from '../../i18n'
import { api } from '../../api'
import { uuid } from '../../utils/id'
import { rules } from '../../validators'
import InfoPanel from '../molecules/InfoPanel.vue'
import FormField from '../molecules/FormField.vue'
import AppButton from '../atoms/AppButton.vue'
import PrivacyNote from '../molecules/PrivacyNote.vue'

const form = reactive({ name: '', phone: '', message: '' })
const errors = reactive({ name: '', phone: '', message: '', form: '' })
const sent = ref(false)
const busy = ref(false)
// один ключ на одно и то же сообщение: повторная отправка того же текста не создаст дубль
let requestId = uuid()
watch(form, () => { requestId = uuid() })

async function send() {
  if (busy.value) return // защита от двойного клика и Enter
  errors.form = ''
  for (const k of ['name', 'phone'] as const) { const r = rules[k === 'phone' ? 'phoneAny' : k](form[k]); errors[k] = r === true ? '' : r }
  errors.message = form.message.trim().length >= 2 ? '' : t('errors.message')
  if (errors.name || errors.phone || errors.message) return
  busy.value = true
  try {
    await api('/contact', { method: 'POST', body: { ...form, requestId } })
    sent.value = true
  } catch {
    errors.form = t('errors.generic')
  } finally { busy.value = false }
}
</script>

<template>
  <InfoPanel>
    <p v-if="sent" class="ok">{{ $t('contact.thanks') }}</p>
    <form v-else class="cf" novalidate @submit.prevent="send">
      <FormField v-model="form.name" :label="$t('contact.name')" :error="errors.name" autocomplete="name" />
      <FormField v-model="form.phone" type="tel" :label="$t('contact.phoneLabel')" :error="errors.phone" autocomplete="tel" />
      <FormField v-model="form.message" as="textarea" rows="4" :label="$t('contact.message')" :error="errors.message" />
      <p v-if="errors.form" class="err" role="alert">{{ errors.form }}</p>
      <PrivacyNote />
      <AppButton type="submit" :disabled="busy">{{ busy ? $t('common.sending') : $t('contact.send') }}</AppButton>
    </form>
  </InfoPanel>
</template>

<style scoped>
.cf { display:flex; flex-direction:column; align-items:stretch; gap:12px; width:100%; }
.ok { padding:14px; border-radius:var(--r-md); background:#e8f6ec; color:var(--green); font-weight:700; animation:rise .5s var(--ease); }
.err { margin:0; padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:13px; }
</style>
