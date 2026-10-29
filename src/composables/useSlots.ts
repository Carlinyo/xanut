import { ref } from 'vue'
import { api } from '../api'
import type { SlotsResponse } from '../types'

/** Часовые окна доставки с сервера (сегодня и завтра, до 22:00). */
export function useSlots() {
  const data = ref<SlotsResponse | null>(null)
  const loading = ref(false)
  const failed = ref(false)
  async function load() {
    loading.value = true
    failed.value = false
    try { data.value = await api<SlotsResponse>('/slots') }
    catch { failed.value = true }
    finally { loading.value = false }
  }
  return { data, loading, failed, load }
}
