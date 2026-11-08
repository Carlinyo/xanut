import { onUnmounted, ref } from 'vue'

// Текущее время, обновляется раз в секунду — для обратного отсчёта (чек взвешивания). Один таймер на всё приложение:
// он идёт, пока на экране есть хоть один компонент, который его использует.
const now = ref(Date.now())
let users = 0
let timer: ReturnType<typeof setInterval> | undefined

export function useNow() {
  if (users++ === 0) timer = setInterval(() => (now.value = Date.now()), 1000)
  now.value = Date.now()
  onUnmounted(() => { if (--users === 0) clearInterval(timer) })
  return now
}
