// Дошло ли письмо с кодом. Почтовый сервис сообщает об отказе (ящик переполнен, адреса нет) не сразу, а письмом
// магазину через несколько секунд — поэтому после отправки кода сайт трижды спрашивает сервер: через 15, 35 и 70 секунд.
// Отказ найден — проверки прекращаются, страница показывает, что случилось и что делать.
import { onUnmounted, ref } from 'vue'
import { api } from '../api'

export type CodeDelivery = 'full' | 'missing' | 'failed'
const CHECKS_SEC = [15, 35, 70]

export function useCodeDelivery() {
  const problem = ref<CodeDelivery | null>(null)
  let timers: ReturnType<typeof setTimeout>[] = []
  let run = 0
  const stop = () => { timers.forEach(clearTimeout); timers = [] }

  /** Код (заново) отправлен на почту проверки challengeId — начать проверки сначала. */
  function watch(challengeId: string) {
    stop()
    problem.value = null
    const mine = ++run
    timers = CHECKS_SEC.map((sec) => setTimeout(async () => {
      try {
        const r = await api<{ delivery: string }>('/auth/delivery', { method: 'POST', body: { challengeId } })
        if (mine !== run) return // за это время код отправили заново
        if (r.delivery === 'full' || r.delivery === 'missing' || r.delivery === 'failed') { problem.value = r.delivery; stop() }
        else if (r.delivery === 'unknown') stop() // сервер не может проверить — не спрашиваем зря
      } catch { stop() } // проверки нет (код истёк, принят) или нет связи
    }, sec * 1000))
  }

  onUnmounted(stop)
  return { problem, watch, stop }
}
