// Повторяющийся таймер для опроса сервера. В скрытой вкладке браузер замедляет обычные таймеры
// (Chrome — до раза в минуту, если вкладка скрыта дольше 5 минут), а таймеры внутри Web Worker — нет:
// так новый заказ слышно и тогда, когда админка открыта в другой вкладке. Нет Worker — обычный setInterval.
const WORKER_SRC = 'let t;onmessage=(e)=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(0),e.data)}'

export interface Ticker {
  /** Запустить (или перезапустить) с периодом ms. */
  start(ms: number): void
  stop(): void
  /** Остановить насовсем (компонент закрыт). */
  dispose(): void
}

export function createTicker(tick: () => void): Ticker {
  let worker: Worker | null = null, url = '', timer: ReturnType<typeof setInterval> | undefined, period = 0
  const fallback = () => {
    worker?.terminate()
    worker = null
    if (period) { clearInterval(timer); timer = setInterval(tick, period) }
  }
  try {
    url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }))
    worker = new Worker(url)
    worker.onmessage = () => tick()
    worker.onerror = fallback // worker не запустился (запрет на сайте, старый браузер)
  } catch {
    worker = null
  }
  const stop = () => {
    period = 0
    worker?.postMessage(0)
    clearInterval(timer)
  }
  return {
    start(ms) {
      period = ms
      if (worker) worker.postMessage(ms)
      else { clearInterval(timer); timer = setInterval(tick, ms) }
    },
    stop,
    dispose() {
      stop()
      worker?.terminate()
      worker = null
      if (url) URL.revokeObjectURL(url)
    },
  }
}
