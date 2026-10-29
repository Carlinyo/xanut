<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { t } from '../../i18n'
import { PASSWORD_MIN, passwordProblems, passwordStrength, type PasswordContext, type PasswordProblem } from '../../utils/passwordPolicy'

// Пароль с кнопкой «показать». С policy=true — индикатор надёжности и список требований,
// которые отмечаются по мере ввода (те же правила проверяет сервер).
const props = withDefaults(defineProps<{
  modelValue: string; label: string; error?: string; autocomplete?: string; policy?: boolean; context?: PasswordContext
}>(), { autocomplete: 'current-password' })
const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: [] }>()
const id = useId()
const shown = ref(false)

const problems = computed(() => (props.policy ? passwordProblems(props.modelValue, props.context) : []))
const strength = computed(() => passwordStrength(props.modelValue, problems.value))
// основные требования видны всегда (с галочками), остальные — только когда нарушены
const BASE: PasswordProblem[] = ['LENGTH', 'CASE', 'DIGIT', 'SPECIAL']
const EXTRA: PasswordProblem[] = ['SPACES', 'SEQUENCE', 'PERSONAL', 'COMMON', 'TOO_LONG']
const checklist = computed(() => [
  ...BASE.map((p) => ({ key: p, ok: !problems.value.includes(p), text: t(`password.rule.${p}`, { min: PASSWORD_MIN }) })),
  ...EXTRA.filter((p) => problems.value.includes(p)).map((p) => ({ key: p, ok: false, text: t(`password.rule.${p}`) })),
])
</script>

<template>
  <div class="pw">
    <label class="pw__label" :for="id">{{ label }}</label>
    <span class="pw__box" :class="{ 'is-invalid': !!error }">
      <input
        :id="id" :type="shown ? 'text' : 'password'" :value="modelValue" :autocomplete="autocomplete"
        spellcheck="false" autocapitalize="off" :aria-invalid="!!error || undefined"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" @blur="emit('blur')"
      />
      <button type="button" class="pw__eye" :aria-label="shown ? $t('password.hide') : $t('password.show')" :aria-pressed="shown" @click="shown = !shown">
        {{ shown ? '🙈' : '👁' }}
      </button>
    </span>
    <Transition name="err"><small v-if="error" class="pw__err" role="alert">{{ error }}</small></Transition>
    <template v-if="policy && modelValue">
      <span class="pw__meter" aria-hidden="true"><i v-for="n in 4" :key="n" :class="{ on: n <= strength }" :data-level="strength" /></span>
      <small class="pw__level" :data-level="strength">{{ $t('password.strength') }}՝ {{ $t('password.level.' + strength) }}</small>
    </template>
    <ul v-if="policy" class="pw__rules" aria-live="polite">
      <li v-for="r in checklist" :key="r.key" :class="{ ok: r.ok, bad: !r.ok && !!modelValue }">
        <span aria-hidden="true">{{ r.ok ? '✓' : r.key === 'LENGTH' || r.key === 'CASE' || r.key === 'DIGIT' || r.key === 'SPECIAL' ? '○' : '✕' }}</span>{{ r.text }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.pw { display:flex; flex-direction:column; gap:6px; font-size:14px; }
.pw__label { font-weight:600; }
.pw__box { display:flex; align-items:center; border:1.5px solid var(--line); border-radius:var(--r-md); background:#fff; transition:border-color .2s, box-shadow .2s; }
.pw__box:focus-within { border-color:var(--yellow); box-shadow:0 0 0 4px rgb(246 178 26 / .22); }
.pw__box.is-invalid { border-color:var(--red); }
input { flex:1; min-width:0; padding:12px 14px; border:0; background:none; font:inherit; color:inherit; }
input:focus { outline:none; }
.pw__eye { width:44px; align-self:stretch; border:0; background:none; font-size:17px; opacity:.7; transition:opacity .2s; }
.pw__eye:hover { opacity:1; }
.pw__err { color:var(--red); font-size:12px; }
.pw__meter { display:grid; grid-template-columns:repeat(4, 1fr); gap:4px; margin-top:2px; }
.pw__meter i { height:5px; border-radius:3px; background:var(--line); transition:background .3s; }
.pw__meter i.on[data-level="1"] { background:#e5342b; }
.pw__meter i.on[data-level="2"] { background:#f08a1a; }
.pw__meter i.on[data-level="3"] { background:#9cc23a; }
.pw__meter i.on[data-level="4"] { background:#1a7f37; }
.pw__level { font-size:12px; font-weight:600; color:var(--muted); }
.pw__level[data-level="1"] { color:#c62a22; } .pw__level[data-level="2"] { color:#c06a0a; } .pw__level[data-level="4"] { color:var(--green); }
.pw__rules { display:grid; gap:3px; margin:2px 0 0; padding:0; list-style:none; font-size:12.5px; color:var(--muted); }
.pw__rules li { display:flex; gap:8px; align-items:baseline; transition:color .2s; }
.pw__rules li span { width:12px; flex:none; text-align:center; font-weight:800; }
.pw__rules li.ok { color:var(--green); }
.pw__rules li.bad { color:#c62a22; }
.err-enter-active, .err-leave-active { transition:opacity .25s, transform .25s var(--ease); }
.err-enter-from, .err-leave-to { opacity:0; transform:translateY(-4px); }
@media (max-width:700px) { input { font-size:16px; } }
</style>
