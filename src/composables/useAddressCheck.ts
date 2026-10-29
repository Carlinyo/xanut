import { ref, watch } from 'vue'
import { api } from '../api'

export type AddressState = 'idle' | 'checking' | 'ok' | 'invalid' | 'unavailable'

/** Проверка существования адреса на сервере. Результат сбрасывается, как только пользователь меняет адрес. */
export function useAddressCheck(address: () => string) {
  const state = ref<AddressState>('idle')
  const formatted = ref('')
  let verified = ''

  watch(address, () => { state.value = 'idle'; formatted.value = ''; verified = '' })

  async function check(): Promise<boolean> {
    const value = address().trim()
    if (state.value === 'ok' && verified === value) return true // уже проверено, сеть не нужна
    state.value = 'checking'
    try {
      const r = await api<{ valid: boolean; formatted?: string }>('/address/check', { method: 'POST', body: { address: value } })
      if (value !== address().trim()) return false // пока шла проверка, адрес изменили
      state.value = r.valid ? 'ok' : 'invalid'
      formatted.value = r.formatted ?? ''
      verified = r.valid ? value : ''
      return r.valid
    } catch {
      state.value = 'unavailable'
      return false
    }
  }
  return { state, formatted, check }
}
