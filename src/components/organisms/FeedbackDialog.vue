<script setup lang="ts">
// Окно «Բողոքներ և առաջարկներ»: жалоба или предложение, о каком заказе (у вошедшего), как ответить (у гостя).
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { t } from '../../i18n'
import { api, ApiError, commonErrorKey } from '../../api'
import { useAuth } from '../../stores/auth'
import { useFeedback } from '../../stores/feedback'
import { money } from '../../utils/format'
import { formatPhone } from '../../utils/phone'
import { isEmailFormat } from '../../utils/email'
import { uuid } from '../../utils/id'
import type { FeedbackType, Order } from '../../types'
import OverlayShell from '../molecules/OverlayShell.vue'
import ChoiceToggle from '../molecules/ChoiceToggle.vue'
import FormField from '../molecules/FormField.vue'
import PrivacyNote from '../molecules/PrivacyNote.vue'
import AppButton from '../atoms/AppButton.vue'
import HoneypotField from '../atoms/HoneypotField.vue'

const emit = defineEmits<{ close: [] }>()
const fb = useFeedback(), auth = useAuth()
const MIN = 10, MAX = 2000

const form = reactive({ type: fb.type, message: '', name: '', contact: '', orderId: fb.orderId ? String(fb.orderId) : '' })
const errors = reactive({ message: '', contact: '', form: '' })
const sentId = ref<number | null>(null)
const busy = ref(false)
const trap = ref('') // скрытое поле-ловушка: заполняют только боты
// один ключ на одно и то же сообщение: повторная отправка (двойной клик, обрыв сети) не создаст вторую запись
let requestId = uuid()
watch(form, () => { requestId = uuid() })
watch(() => form.message, () => (errors.message = ''))
watch(() => form.contact, () => (errors.contact = ''))

const typeOptions = computed(() => [
  { value: 'complaint' as FeedbackType, label: t('feedback.complaint'), icon: '⚠️' },
  { value: 'suggestion' as FeedbackType, label: t('feedback.suggestion'), icon: '💡' },
])
const complaint = computed(() => form.type === 'complaint')

// вошедшему — его заказы, чтобы выбрать, о каком речь; ответ придёт на контакты из аккаунта
const orders = ref<Order[]>([])
onMounted(async () => {
  if (!auth.isAuth) return
  try { orders.value = (await api<Order[]>('/orders')).slice(0, 20) } catch { /* без списка можно написать и без заказа */ }
})
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB')
const accountContact = computed(() => (auth.user ? [auth.user.email, auth.user.phone && formatPhone(auth.user.phone)].filter(Boolean).join(', ') : ''))
const canReply = computed(() => !!auth.user || !!form.contact.trim())

function validate(): boolean {
  errors.message = form.message.trim().length >= MIN ? '' : t('feedback.errors.message', { n: MIN })
  const c = form.contact.trim()
  const ok = !c || (c.includes('@') ? isEmailFormat(c) : /^\+?\d[\d\s()-]{6,18}$/.test(c))
  errors.contact = ok ? '' : t('feedback.errors.contact')
  return !errors.message && !errors.contact
}

async function send() {
  if (busy.value) return // защита от двойного клика и Enter
  errors.form = ''
  if (!validate()) return
  busy.value = true
  try {
    sentId.value = await fb.send({
      type: form.type, message: form.message.trim(),
      name: auth.user ? undefined : form.name.trim() || undefined,
      contact: auth.user ? undefined : form.contact.trim() || undefined,
      orderId: form.orderId ? Number(form.orderId) : undefined,
      website: trap.value || undefined,
    }, requestId)
  } catch (e) {
    const issues = e instanceof ApiError && e.code === 'VALIDATION' ? e.issues ?? [] : []
    if (issues.some((i) => i.path === 'contact')) errors.contact = t('feedback.errors.contact')
    if (issues.some((i) => i.path === 'message')) errors.message = t('feedback.errors.message', { n: MIN })
    if (!errors.contact && !errors.message) errors.form = t(commonErrorKey(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <OverlayShell side="center" :label="$t('feedback.title')" @close="emit('close')">
    <div class="fb">
      <header class="fb__head">
        <h2>💬 {{ $t('feedback.title') }}</h2>
        <AppButton variant="close" :aria-label="$t('common.close')" @click="emit('close')">✕</AppButton>
      </header>

      <div v-if="sentId" class="fb__done" role="status">
        <span class="fb__check" aria-hidden="true">✓</span>
        <p class="fb__done-title">{{ $t(complaint ? 'feedback.doneComplaint' : 'feedback.doneSuggestion', { id: sentId }) }}</p>
        <p class="fb__done-text">{{ $t(canReply ? 'feedback.doneReply' : 'feedback.doneNoReply') }}</p>
        <AppButton block @click="emit('close')">{{ $t('common.close') }}</AppButton>
      </div>

      <form v-else class="fb__form" novalidate @submit.prevent="send">
        <p class="fb__lead">{{ $t('feedback.lead') }}</p>
        <ChoiceToggle v-model="form.type" :options="typeOptions" :label="$t('feedback.typeLabel')" />
        <FormField v-if="orders.length" v-model="form.orderId" as="select" :label="$t('feedback.order')">
          <option value="">{{ $t('feedback.noOrder') }}</option>
          <option v-for="o in orders" :key="o.id" :value="String(o.id)">№{{ o.id }} · {{ day(o.createdAt) }} · {{ money(o.total) }}</option>
        </FormField>
        <div class="fb__msg">
          <FormField
            v-model="form.message" as="textarea" rows="5" :maxlength="MAX" :error="errors.message"
            :label="$t(complaint ? 'feedback.messageComplaint' : 'feedback.messageSuggestion')"
            :placeholder="$t(complaint ? 'feedback.placeholderComplaint' : 'feedback.placeholderSuggestion')"
          />
          <small class="fb__count" :class="{ low: form.message.trim().length > 0 && form.message.trim().length < MIN }">{{ form.message.trim().length }} / {{ MAX }}</small>
        </div>
        <p v-if="auth.user" class="fb__reply">↩ {{ $t('feedback.replyTo', { contact: accountContact }) }}</p>
        <template v-else>
          <FormField v-model="form.name" :label="$t('feedback.name')" autocomplete="name" maxlength="80" />
          <FormField
            v-model="form.contact" :label="$t('feedback.contact')" :error="errors.contact" :placeholder="$t('feedback.contactPlaceholder')"
            autocomplete="email" inputmode="email" maxlength="120"
          />
          <small class="fb__hint">{{ $t('feedback.contactHint') }}</small>
        </template>
        <HoneypotField v-model="trap" />
        <p v-if="errors.form" class="fb__err" role="alert">{{ errors.form }}</p>
        <PrivacyNote />
        <AppButton type="submit" block size="lg" :disabled="busy">{{ busy ? $t('common.sending') : $t('feedback.send') }}</AppButton>
      </form>
    </div>
  </OverlayShell>
</template>

<style scoped>
.fb { display:flex; flex-direction:column; gap:14px; padding:clamp(16px, 3vw, 24px); }
.fb__head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.fb__head h2 { margin:0; font-size:clamp(19px, 2.6vw, 22px); }
.fb__form { display:flex; flex-direction:column; gap:12px; }
.fb__lead { margin:0; color:var(--muted); font-size:14px; line-height:1.5; }
.fb__msg { display:flex; flex-direction:column; gap:4px; }
.fb__count { align-self:flex-end; color:var(--muted); font-size:12px; font-variant-numeric:tabular-nums; }
.fb__count.low { color:var(--red); }
.fb__reply { margin:0; padding:10px 12px; border-radius:var(--r-md); background:var(--bg); color:var(--ink); font-size:13px; line-height:1.45; overflow-wrap:anywhere; }
.fb__hint { margin-top:-6px; color:var(--muted); font-size:12px; }
.fb__err { margin:0; padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:13px; }
.fb__done { display:flex; flex-direction:column; align-items:center; gap:10px; padding:10px 4px 4px; text-align:center; animation:rise .45s var(--ease); }
.fb__check { display:grid; place-items:center; width:56px; height:56px; border-radius:50%; background:#e6f4ea; color:var(--green); font-size:28px; font-weight:800; }
.fb__done-title { margin:0; font-size:17px; font-weight:800; line-height:1.4; }
.fb__done-text { margin:0 0 6px; color:var(--muted); font-size:14px; line-height:1.5; }
@media (prefers-reduced-motion:reduce) { .fb__done { animation:none; } }
</style>
