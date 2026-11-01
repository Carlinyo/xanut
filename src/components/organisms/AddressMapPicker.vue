<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type * as Leaflet from 'leaflet'
import { t } from '../../i18n'
import { SHOP_LOCATION } from '../../shop'
import { geoErrorKey, inZone, locate, reverseAddress } from '../../utils/geo'
import type { DeliveryZone, GeoPoint } from '../../types'
import OverlayShell from '../molecules/OverlayShell.vue'
import AppButton from '../atoms/AppButton.vue'

// Точка доставки на карте: покупатель двигает карту, булавка всегда в центре; под картой — адрес этого места.
// Карта OpenStreetMap (Leaflet) загружается, только когда окно открыли.
const props = defineProps<{
  /** С чего начать: прежняя точка или геолокация; нет — магазин. */
  start?: GeoPoint | null
  /** Погрешность геолокации (м): показываем «вы здесь» и круг погрешности. */
  accuracy?: number
  zone?: DeliveryZone
  /** Подсказка над картой вместо обычной (например, «геолокация неточная — поправьте точку»). */
  note?: string
}>()
const emit = defineEmits<{ pick: [point: GeoPoint, formatted: string]; close: [] }>()

type State = 'loading' | 'failed' | 'moving' | 'checking' | 'ok' | 'empty' | 'unavailable' | 'out'
const state = ref<State>('loading')
const formatted = ref('')
const center = shallowRef<GeoPoint | null>(null)
const locating = ref(false)
const geoError = ref('')
const box = ref<HTMLElement | null>(null)

let L: typeof Leaflet | null = null
let map: Leaflet.Map | null = null
let here: Leaflet.LayerGroup | null = null
let seq = 0 // ответ геокодера для старого положения карты не показываем
let timer: ReturnType<typeof setTimeout> | undefined
// карту тянут мышью: если отпустили над затемнённым фоном, браузер считает это кликом по фону — окно закрывать нельзя
let dragging = false

const round = (v: number) => Math.round(v * 1e6) / 1e6
/** Масштаб по погрешности: точное место — до дома, грубое — район. */
const zoomFor = (acc?: number) => (acc === undefined ? 17 : acc > 1500 ? 14 : acc > 400 ? 15 : acc > 120 ? 16 : 17)

onMounted(async () => {
  try {
    const [mod] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
    L = ((mod as { default?: typeof Leaflet }).default ?? mod) as typeof Leaflet // Leaflet — CommonJS-модуль
  } catch {
    state.value = 'failed' // не загрузился код карты (нет сети)
    return
  }
  if (!box.value) return // окно успели закрыть
  const s = props.start ?? { lat: SHOP_LOCATION.lat, lon: SHOP_LOCATION.lon }
  map = L.map(box.value).setView([s.lat, s.lon], props.start ? zoomFor(props.accuracy) : 14)
  map.attributionControl.setPrefix(false)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map)
  if (props.zone) {
    L.circle([props.zone.lat, props.zone.lon], { radius: props.zone.radiusKm * 1000, color: '#d99700', weight: 2, dashArray: '6 8', fill: false, interactive: false }).addTo(map)
  }
  if (props.start && props.accuracy !== undefined) showHere(props.start, props.accuracy)
  map.on('movestart', () => { seq++; clearTimeout(timer); state.value = 'moving' })
  map.on('moveend', () => { clearTimeout(timer); timer = setTimeout(lookup, 500) })
  map.on('dragstart', () => { dragging = true })
  map.on('dragend', () => { setTimeout(() => { dragging = false }, 100) }) // клик после отпускания мыши приходит раньше
  void lookup() // адрес начальной точки
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  seq++
  map?.stop() // карта ещё катится по инерции — останавливаем, иначе Leaflet обратится к уже удалённым элементам
  map?.remove()
  map = null
})
/** Escape или клик по фону (но не конец перетаскивания карты над фоном). */
function close() {
  if (!dragging) emit('close')
}

/** «Вы здесь»: синяя точка и круг погрешности геолокации. */
function showHere(p: GeoPoint, accuracy: number) {
  if (!L || !map) return
  here?.remove()
  here = L.layerGroup([
    ...(accuracy > 20 ? [L.circle([p.lat, p.lon], { radius: accuracy, color: '#2b7de9', weight: 1, fillOpacity: 0.08, interactive: false })] : []),
    L.circleMarker([p.lat, p.lon], { radius: 7, color: '#fff', weight: 3, fillColor: '#2b7de9', fillOpacity: 1, interactive: false }),
  ]).addTo(map)
}

async function lookup() {
  if (!map) return
  const c = map.getCenter()
  const p = { lat: round(c.lat), lon: round(c.lng) }
  const my = ++seq
  center.value = p
  formatted.value = ''
  if (!inZone(props.zone, p)) { state.value = 'out'; return } // вне зоны — геокодер не спрашиваем
  state.value = 'checking'
  try {
    const r = await reverseAddress(p)
    if (my !== seq) return
    formatted.value = r.formatted
    state.value = !r.inZone ? 'out' : r.formatted ? 'ok' : 'empty'
  } catch {
    if (my !== seq) return
    // адрес не узнали (геокодер, сеть, лимит запросов) — точку всё равно можно выбрать, адрес покупатель напишет сам
    state.value = 'unavailable'
  }
}

async function locateMe() {
  if (locating.value) return
  geoError.value = ''
  locating.value = true
  try {
    const p = await locate()
    if (!map) return
    showHere(p, p.accuracy)
    map.setView([p.lat, p.lon], zoomFor(p.accuracy))
  } catch (e) {
    geoError.value = t(geoErrorKey(e))
  } finally {
    locating.value = false
  }
}

const canPick = computed(() => !!center.value && ['ok', 'empty', 'unavailable'].includes(state.value))
const status = computed(() => {
  switch (state.value) {
    case 'moving': case 'checking': return t('map.checking')
    case 'ok': return formatted.value
    case 'empty': return t('map.noAddress')
    case 'unavailable': return t('map.unavailable')
    case 'out': return t('map.outOfZone', { km: props.zone?.radiusKm ?? '' })
    default: return ''
  }
})
function pick() {
  if (canPick.value && center.value) emit('pick', center.value, formatted.value)
}
</script>

<template>
  <OverlayShell class="map-layer" :label="$t('map.title')" @close="close">
    <div class="mp">
      <header class="mp__head">
        <h2>📍 {{ $t('map.title') }}</h2>
        <AppButton variant="close" :aria-label="$t('common.close')" @click="emit('close')">✕</AppButton>
      </header>
      <p class="mp__lead" :class="{ 'mp__lead--note': note }">{{ note || $t('map.lead') }}</p>
      <div class="mp__frame">
        <div ref="box" class="mp__map" />
        <div v-if="state === 'loading' || state === 'failed'" class="mp__skeleton" :class="{ failed: state === 'failed' }">
          <span>{{ $t(state === 'failed' ? 'map.failed' : 'map.loading') }}</span>
        </div>
        <template v-else>
          <span class="mp__pin" :class="{ up: state === 'moving' }" aria-hidden="true">
            <svg viewBox="0 0 32 44" width="34" height="46"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 43 16 43s15-16 15-27.2C31 7.6 24.3 1 16 1Z" fill="#e5342b" stroke="#fff" stroke-width="2" /><circle cx="16" cy="16" r="5.5" fill="#fff" /></svg>
          </span>
          <span class="mp__shadow" aria-hidden="true" />
          <button type="button" class="mp__locate" :class="{ busy: locating }" :disabled="locating" :aria-label="$t('map.locate')" :title="$t('map.locate')" @click="locateMe">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" /><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </template>
      </div>
      <p class="mp__addr" :class="`mp__addr--${state}`" aria-live="polite">{{ status }}</p>
      <small v-if="geoError" class="mp__err" role="alert">{{ geoError }}</small>
      <AppButton block size="lg" :disabled="!canPick" @click="pick">{{ $t('map.confirm') }}</AppButton>
    </div>
  </OverlayShell>
</template>

<style scoped>
.overlay.map-layer { z-index:70; } /* поверх корзины, но под окном подтверждения */
@media (min-width:701px) { .overlay.map-layer :deep(.sheet) { width:min(680px, 94vw); } }
.mp { display:flex; flex-direction:column; gap:12px; padding:clamp(16px, 3vw, 24px); }
.mp__head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.mp__head h2 { margin:0; font-size:clamp(19px, 2.6vw, 22px); }
.mp__lead { margin:0; color:var(--muted); font-size:14px; line-height:1.5; }
.mp__lead--note { padding:10px 12px; border-radius:var(--r-md); background:var(--cream); color:var(--ink); }
.mp__frame { position:relative; height:min(56vh, 440px); min-height:260px; overflow:hidden; border:1px solid var(--line); border-radius:var(--r-md); background:var(--bg); }
.mp__map { position:absolute; inset:0; z-index:0; } /* свои слои Leaflet (z-index 400–1000) — внутри карты */
.mp__skeleton { position:absolute; inset:0; z-index:2; display:grid; place-items:center; padding:16px; color:var(--muted); font-size:14px; text-align:center; background:linear-gradient(110deg, var(--bg) 30%, #fff 50%, var(--bg) 70%); background-size:200% 100%; animation:shimmer 1.4s linear infinite; }
.mp__skeleton.failed { animation:none; background:var(--bg); color:var(--red); }
/* остриё булавки — ровно в центре карты: это и есть выбранная точка */
.mp__pin { position:absolute; left:50%; top:50%; z-index:1; display:block; transform:translate(-50%, -100%); transition:transform .2s var(--ease); pointer-events:none; filter:drop-shadow(0 3px 3px rgb(0 0 0 / .3)); }
.mp__pin svg { display:block; }
.mp__pin.up { transform:translate(-50%, calc(-100% - 10px)); }
.mp__shadow { position:absolute; left:50%; top:50%; z-index:1; width:10px; height:4px; border-radius:50%; background:rgb(0 0 0 / .35); transform:translate(-50%, -50%); pointer-events:none; }
.mp__locate { position:absolute; right:10px; bottom:30px; z-index:1; display:grid; place-items:center; width:44px; height:44px; border:0; border-radius:50%; background:#fff; color:#2b7de9; box-shadow:var(--shadow-sm), 0 0 0 1px rgb(0 0 0 / .08); cursor:pointer; transition:transform var(--t) var(--ease); }
.mp__locate:hover { transform:scale(1.06); }
.mp__locate:disabled { cursor:progress; }
.mp__locate.busy svg { animation:spin 1s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.mp__addr { min-height:2.9em; margin:0; padding:10px 12px; border-radius:var(--r-md); background:var(--bg); font-size:14px; font-weight:600; line-height:1.45; overflow-wrap:anywhere; }
.mp__addr--moving, .mp__addr--checking { color:var(--muted); font-weight:500; }
.mp__addr--empty, .mp__addr--unavailable { color:var(--muted); font-weight:500; }
.mp__addr--out { background:#fdecea; color:var(--red); }
.mp__err { color:var(--red); font-size:12px; line-height:1.4; }
@media (max-width:700px) { .mp__frame { height:52vh; } }
</style>
