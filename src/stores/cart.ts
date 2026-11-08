import { defineStore } from 'pinia'
import { api } from '../api'
import { t } from '../i18n'
import { useCatalog } from './catalog'
import { useBonus } from './bonus'
import { isKebab, isMeat, isValidKg, kebabPrice, weightPrice } from '../utils/kebab'
import { applyPerks } from '../utils/segments'
import { uuid } from '../utils/id'
import { WEIGH_DEFAULT } from '../utils/weigh'
import type { CartItem, GeoPoint, KebabOptions, KebabSelection, Order, PaymentMethod, Perks, ProductUnit } from '../types'

/** selection — порция из окна шашлыка; kg (+ productId) — мясо на вес из окна выбора веса; иначе — штучный товар
 *  (сюда передают и сам товар каталога: его поле kebab — «это хоровац», а не выбор из окна шашлыка). */
export interface Addable {
  id: number | string; name: string; price: number; art?: string; image?: string; note?: string; selection?: KebabSelection
  kg?: number; productId?: number
  orderable?: boolean; inStock?: boolean; unit?: ProductUnit
  /** На развес (рыба, кролик): мясо — порциями (qty), шашлык — selection.portions; цену мяса посчитают после взвешивания. */
  weighed?: boolean; perKg?: number
}
/** delivery — курьер (платно, см. deliveryFee), pickup — самовывоз из магазина (бесплатно, адрес не нужен). */
export type DeliveryMethod = 'delivery' | 'pickup'
/** point — точка доставки на карте (тогда address — описание для курьера). */
export interface CheckoutData { name: string; phone: string; address: string; point?: GeoPoint | null; slot: string; payment: PaymentMethod; delivery: DeliveryMethod; saveProfile?: boolean; comment?: string }

/** Сервер принимает не больше 99 штук одной позиции. */
export const MAX_QTY = 99

type OrderLine = { type: 'product'; productId: number; qty: number } | { type: 'meat'; productId: number; kg: number; qty: number }
  | { type: 'weighed'; productId: number; portions: number } | ({ type: 'kebab' } & KebabSelection)
/** Порций одной позиции на развес (сервер присылает предел в /api/config → weigh). */
const maxPortions = (): number => useCatalog().config.weigh?.maxPortions ?? WEIGH_DEFAULT.maxPortions
/** Название мяса на развес: «Ձուկ իշխան — 2 բաժին». */
export const portionsName = (name: string, n: number): string => t('weigh.itemName', { meat: name, n })

/** Название мяса на вес: «Խոզի փափուկ միս — 1.5 կգ» (как у порции шашлыка и как на сервере). */
export const weightName = (name: string, kg: number): string => t('kebab.itemName', { meat: name, kg })

const STORAGE_KEY = 'cart'
const METHOD_KEY = 'cart-delivery'

function isItem(v: unknown): v is CartItem {
  if (!v || typeof v !== 'object') return false
  const i = v as Partial<CartItem>
  if (!(typeof i.id === 'number' || typeof i.id === 'string') || typeof i.name !== 'string' || typeof i.price !== 'number') return false
  if (!Number.isInteger(i.qty) || (i.qty as number) < 1) return false
  if (i.kind === 'product') return typeof i.productId === 'number'
  // мясо — с весом упаковки; рыба и кролик на развес — порциями (вес пришлёт работник)
  if (i.kind === 'meat') return typeof i.productId === 'number' && (typeof i.kg === 'number' || i.weighed === true)
  // подарки за баллы в корзину больше не кладутся (их обменивают на код) — старые записи отбрасываем
  if (i.kind === 'kebab') return !!i.kebab && typeof i.kebab.meat === 'string' && (typeof i.kebab.kg === 'number' || typeof i.kebab.portions === 'number') && Array.isArray(i.kebab.extras)
  return false
}

// Корзина хранится локально (гость может собирать её до входа), заказ уходит на сервер.
// Повреждённые данные или недоступное хранилище (приватный режим, запрет cookie) не должны ломать сайт.
function stored(): CartItem[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter(isItem).map((i) => ({ ...i, qty: Math.min(i.qty, MAX_QTY), art: i.art || 'basket', note: i.note || '' }))
  } catch {
    return []
  }
}

function storedMethod(): DeliveryMethod {
  try { return localStorage.getItem(METHOD_KEY) === 'pickup' ? 'pickup' : 'delivery' } catch { return 'delivery' }
}

export const useCart = defineStore('cart', {
  // deliveryKm — до адреса доставки по прямой (км): его задаёт форма заказа по точке на карте или проверенному адресу;
  // null — адрес ещё неизвестен (тогда показываем обычную цену доставки)
  state: () => ({ items: stored(), method: storedMethod(), deliveryKm: null as number | null }),
  getters: {
    count: (s): number => s.items.reduce((n, i) => n + i.qty, 0),
    // price здесь — только для показа: сервер пересчитывает цены сам (у бонусных товаров price = 0)
    subtotal(): number { return this.items.reduce((n, i) => n + i.price * i.qty, 0) + (this.pack ? this.pack.price * this.pack.qty : 0) },
    /** Весь шашлык из окна шашлыка в корзине, кг (шашлык из рыбы и кролика — без веса: «Լավաշ + աման» к нему добавит сервер). */
    kebabKg: (s): number => s.items.reduce((n, i) => n + (i.kind === 'kebab' && i.kebab ? (i.kebab.kg ?? 0) * i.qty : 0), 0),
    /** В корзине рыба или кролик на развес: итог — без их мяса, точную цену покупатель подтвердит после взвешивания. */
    hasWeighed: (s): boolean => s.items.some((i) => i.weighed),
    /** «Լավաշ + աման»: один на каждые начатые 3 кг шашлыка — сервер добавит его к заказу сам, отдельной позицией. */
    pack(): { name: string; price: number; qty: number } | null {
      const p = useCatalog().kebab.pack
      if (!p || !(this.kebabKg > 0)) return null
      return { name: p.name, price: p.price, qty: Math.ceil(this.kebabKg / p.perKg - 1e-9) }
    },
    /** Акция группы покупателя (новый, постоянный, VIP): скидка, баллы, бесплатная доставка. */
    perks: (): Perks => useBonus().perks,
    /** В корзине есть комбо: доставка входит в его цену — заказ доставят бесплатно, и дальний тоже (так же решит сервер).
     *  У порции из окна шашлыка товар — её мясо (kebab.meat — номер товара). */
    hasCombo(): boolean {
      const byId = new Map(useCatalog().products.map((p) => [p.id, p]))
      return this.items.some((i) => {
        const id = i.kind === 'kebab' ? Number(i.kebab?.meat) : i.productId
        return id !== undefined && byId.get(id)?.combo === true
      })
    },
    /** Адрес дальше deliveryFar.overKm от магазина — дальняя доставка (как решит сервер). */
    far(): boolean {
      const far = useCatalog().config.deliveryFar
      return !!far && this.deliveryKm !== null && this.deliveryKm > far.overKm
    },
    /** Цена с акцией — так же, как посчитает сервер. Доставка платная при любой сумме (дальняя — deliveryFar.fee);
     *  бесплатно — только по акции группы (VIP) и с комбо, и на дальнюю тоже. */
    priced(): ReturnType<typeof applyPerks> {
      const { deliveryFee, deliveryFar } = useCatalog().config
      // порога бесплатной доставки нет: бесплатно — с комбо (здесь) и по акции группы VIP (applyPerks)
      const base = this.subtotal === 0 || this.hasCombo ? 0 : this.far && deliveryFar ? deliveryFar.fee : deliveryFee
      return applyPerks(this.subtotal, base, this.perks)
    },
    /** Скидка по акции группы (֏). */
    discount(): number { return this.priced.discount },
    /** Сколько стоила бы доставка курьером (для подписи варианта). */
    deliveryPrice(): number { return this.priced.deliveryFee },
    /** Доставка в итоге: при самовывозе — 0. */
    delivery(): number { return this.method === 'pickup' ? 0 : this.deliveryPrice },
    total(): number { return this.subtotal - this.discount + this.delivery },
    /** Сколько баллов принесёт заказ (процент группы от товаров после скидки, без доставки) — окончательно считает сервер. */
    pointsEarned(): number { return this.priced.bonusEarned },
    /** В корзине только мясо: время — любое с 10:00 до 22:00 с шагом 30 минут. Есть хоровац (порция из окна шашлыка
     *  или штучный хоровац) — часовое окно с ограниченным числом мест. Так же решает сервер. */
    exactTime(): boolean {
      const { products } = useCatalog()
      const byId = new Map(products.map((p) => [p.id, p]))
      return this.items.length > 0 && this.items.every((i) => {
        if (i.kind === 'meat') return true
        const p = i.kind === 'product' && i.productId !== undefined ? byId.get(i.productId) : undefined
        return !!p && !isKebab(p)
      })
    },
  },
  actions: {
    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items)) } catch { /* хранилище недоступно — корзина живёт до перезагрузки */ }
    },
    setMethod(m: DeliveryMethod) {
      this.method = m
      try { localStorage.setItem(METHOD_KEY, m) } catch { /* выбор живёт до перезагрузки */ }
    },
    /** qty — сколько штук положить (кебаб из окна шашлыка — сразу несколько). */
    add(p: Addable, qty = 1) {
      // витринный товар и товар не в наличии заказать нельзя (сервер всё равно отклонит);
      // товар «за кг» кладут в корзину с весом: хоровац — через окно шашлыка, мясо — через окно выбора веса (p.kg)
      if (p.orderable === false || p.inStock === false || p.unit === 'kg') return
      // мясо на развес — порции одной позицией (не больше maxPortions), остальное — до MAX_QTY штук
      const max = p.weighed && !p.selection ? maxPortions() : MAX_QTY
      const n = Math.min(max, Math.max(1, Math.floor(qty) || 1))
      const kind: CartItem['kind'] = p.selection ? 'kebab' : p.kg !== undefined || p.weighed ? 'meat' : 'product'
      // одинаковые позиции складываются: мясо того же веса — ещё одна упаковка (id мяса — «meat-<товар>-<вес>»),
      // рыба и кролик на развес — ещё порции (id — «weighed-<товар>»)
      const found = this.items.find((i) => i.id === p.id)
      if (found) {
        found.qty = Math.min(max, found.qty + n)
        if (found.weighed && kind === 'meat') found.name = portionsName(p.name, found.qty)
      } else this.items.push({
        id: p.id, kind, productId: p.productId ?? (typeof p.id === 'number' ? p.id : undefined), kebab: p.selection, kg: p.kg,
        name: p.weighed && kind === 'meat' ? portionsName(p.name, n) : p.name, price: p.price, art: p.art || 'basket', image: p.image, note: p.note || '', qty: n,
        ...(p.weighed ? { weighed: true, perKg: p.perKg } : {}),
      })
      this.save()
    },
    /** Больше этого в одной позиции не положить: мясо на развес — maxPortions порций, остальное — MAX_QTY. */
    maxQty(item: CartItem): number { return item.weighed && item.kind === 'meat' ? maxPortions() : MAX_QTY },
    change(id: number | string, delta: number) {
      const item = this.items.find((i) => i.id === id)
      if (!item) return
      item.qty = Math.min(this.maxQty(item), item.qty + delta)
      // у рыбы и кролика на развес число порций — в названии
      if (item.weighed && item.kind === 'meat' && item.qty > 0) {
        const p = item.productId === undefined ? undefined : useCatalog().products.find((x) => x.id === item.productId)
        if (p) item.name = portionsName(p.name, item.qty)
      }
      if (item.qty <= 0) this.items = this.items.filter((i) => i.id !== id)
      this.save()
    },
    /** Сверяет корзину с каталогом: убирает то, что больше нельзя заказать (товар скрыт, стал витриной или его нет в наличии,
     *  хоровац для шашлыка или добавка убраны из меню), и обновляет цены и названия (у мяса на вес — по новой цене за кг) —
     *  корзина могла пролежать в браузере долго.
     *  true — что-то было убрано. */
    sync(): boolean {
      const { products, kebab } = useCatalog()
      const available = products.filter((p) => p.orderable && p.inStock !== false)
      const byId = new Map(available.filter((p) => p.unit !== 'kg').map((p) => [p.id, p]))
      const meatById = new Map(available.filter((p) => p.unit === 'kg' && isMeat(p)).map((p) => [p.id, p]))
      const before = this.items.length
      this.items = this.items.filter((i) => {
        if (i.kind === 'kebab') {
          // шашлык из рыбы и кролика — только порциями: прежняя порция с весом из корзины убирается (kebabPrice → null)
          const price = i.kebab ? kebabPrice(kebab, i.kebab, maxPortions()) : null
          if (price === null) return false
          i.price = price
          const meat = kebab.meats.find((m) => m.id === i.kebab!.meat)
          if (meat?.weighed) Object.assign(i, { weighed: true, perKg: meat.perKg })
          return true
        }
        if (i.kind === 'meat') {
          const p = i.productId === undefined ? undefined : meatById.get(i.productId)
          if (!p) return false
          if (p.weighed) {
            // рыба и кролик — только порциями: прежняя позиция с весом убирается
            if (!i.weighed) return false
            i.qty = Math.min(i.qty, maxPortions())
            Object.assign(i, { name: portionsName(p.name, i.qty), price: 0, perKg: p.price, art: p.art, image: p.image })
            return true
          }
          if (i.weighed || i.kg === undefined || !isValidKg(i.kg)) return false
          Object.assign(i, { name: weightName(p.name, i.kg), price: weightPrice(p.price, i.kg), art: p.art, image: p.image })
          return true
        }
        if (i.kind === 'bonus') return false
        const p = i.productId === undefined ? undefined : byId.get(i.productId)
        if (!p) return false
        Object.assign(i, { name: p.name, price: p.price, art: p.art, image: p.image })
        return true
      })
      this.save()
      return this.items.length < before
    },
    /** «Повторить заказ»: кладёт в корзину то, что из прошлого заказа можно заказать сейчас, — по сегодняшним ценам.
     *  skipped — названия позиций, которые повторить нельзя: товара больше нет или он закончился, шашлык или мясо из старого
     *  заказа (тогда выбор порции и вес не сохранялись). Подарки за баллы не повторяются: их обменивают на код. */
    repeat(order: Order): { added: number; skipped: string[] } {
      const { products, kebab } = useCatalog()
      const byId = new Map(products.filter((p) => p.orderable && p.inStock !== false).map((p) => [p.id, p]))
      const skipped: string[] = []
      let added = 0
      const put = (item: CartItem) => {
        const found = this.items.find((i) => i.id === item.id)
        if (found) found.qty = Math.min(MAX_QTY, found.qty + item.qty)
        else this.items.push({ ...item, qty: Math.min(MAX_QTY, item.qty) })
        added += item.qty
      }
      for (const it of order.items) {
        if (it.kind === 'bonus' || it.kind === 'pack') continue
        const o = (it.options ?? {}) as KebabOptions
        const p = it.productId == null ? undefined : byId.get(it.productId)
        if (it.kind === 'kebab') {
          // порция с весом или (рыба, кролик) порциями — как была заказана
          const portions = it.weigh?.portions ?? o.portions
          const sel: KebabSelection | null = o.meat && (o.kg || portions)
            ? { meat: o.meat, ...(portions ? { portions } : { kg: o.kg }), marinade: o.marinade ?? '', extras: o.extraIds ?? [], comment: o.comment || undefined }
            : null
          const price = sel ? kebabPrice(kebab, sel, maxPortions()) : null
          const meat = sel && kebab.meats.find((m) => m.id === sel.meat)
          if (!sel || price === null || !meat) { skipped.push(it.name); continue }
          const kp = products.find((x) => String(x.id) === sel.meat)
          const extras = kebab.extras.filter((e) => sel.extras.includes(e.id)).map((e) => e.name).join(', ')
          put({
            id: 'kebab-' + uuid(), kind: 'kebab', kebab: sel, price,
            name: sel.portions ? portionsName(meat.name, sel.portions) : t('kebab.itemName', { meat: meat.name, kg: sel.kg ?? '' }),
            art: kp?.art ?? 'kebab', image: kp?.image, note: [sel.marinade, extras, sel.comment].filter(Boolean).join(' · '), qty: it.qty,
            ...(meat.weighed ? { weighed: true, perKg: meat.perKg } : {}),
          })
        } else if (it.kind === 'meat' && (it.weigh || o.portions)) {
          // рыба, кролик на развес — снова те же порции (вес и цену пришлёт работник)
          const portions = it.weigh?.portions ?? o.portions ?? 1
          if (!p || p.unit !== 'kg' || !isMeat(p) || !p.weighed) { skipped.push(it.name); continue }
          const id = `weighed-${p.id}`, found = this.items.find((i) => i.id === id)
          const qty = Math.min(maxPortions(), (found?.qty ?? 0) + portions)
          if (found) Object.assign(found, { qty, name: portionsName(p.name, qty) })
          else this.items.push({ id, kind: 'meat', productId: p.id, weighed: true, perKg: p.price, name: portionsName(p.name, qty), price: 0, art: p.art, image: p.image, note: '', qty })
          added += portions
        } else if (it.kind === 'meat') {
          const kg = o.kg
          if (!p || p.unit !== 'kg' || !isMeat(p) || p.weighed || kg === undefined || !isValidKg(kg)) { skipped.push(it.name); continue }
          put({ id: `meat-${p.id}-${kg}`, kind: 'meat', productId: p.id, kg, name: weightName(p.name, kg), price: weightPrice(p.price, kg), art: p.art, image: p.image, note: '', qty: it.qty })
        } else {
          if (!p || p.unit === 'kg') { skipped.push(it.name); continue }
          put({ id: p.id, kind: 'product', productId: p.id, name: p.name, price: p.price, art: p.art || 'basket', image: p.image, note: '', qty: it.qty })
        }
      }
      this.save()
      return { added, skipped: [...new Set(skipped)] }
    },
    /** Очистить корзину после принятого заказа. */
    clear() {
      this.items = []
      this.save()
    },
    /** requestId — ключ идемпотентности: повтор того же запроса вернёт тот же заказ, а не создаст второй.
     *  Корзину не очищает: это делает форма через clear() — уже после того, как сообщила «заказ принят». */
    async checkout(form: CheckoutData, requestId: string): Promise<Order> {
      const items = this.items.flatMap((i): OrderLine[] => {
        if (i.kind === 'kebab' && i.kebab) {
          const k = i.kebab
          return Array.from({ length: i.qty }, () => ({ type: 'kebab', ...k })) // на сервере каждая порция — отдельная позиция
        }
        if (i.productId === undefined) return []
        // рыба, кролик — порции одной позицией: вес и цену пришлёт работник, покупатель подтвердит чек
        if (i.kind === 'meat' && i.weighed) return [{ type: 'weighed', productId: i.productId, portions: i.qty }]
        if (i.kind === 'meat') return i.kg === undefined ? [] : [{ type: 'meat', productId: i.productId, kg: i.kg, qty: i.qty }]
        return [{ type: 'product', productId: i.productId, qty: i.qty }]
      })
      return api<Order>('/orders', { method: 'POST', body: { ...form, items, requestId } })
    },
  },
})
