export type LinkTo = string | { path: string; query?: Record<string, string | number> }

export interface Category { id: number; name: string; art: string; orderable: boolean }
export interface Product {
  id: number; name: string; categoryId: number; price: number; old?: number
  art: string; image?: string; rating: number; reviews: number; discount: number; orderable: boolean
  /** Можно получить в подарок за столько бонусных баллов. */
  bonusPoints?: number
  /** Товар только за баллы (заведён в админке): в каталоге не показывается, за деньги не продаётся. */
  bonusOnly?: boolean
}

export interface KebabMeat { id: string; name: string; perKg: number }
export interface KebabExtra { id: string; name: string; price: number }
export interface KebabConfig { meats: KebabMeat[]; marinades: string[]; extras: KebabExtra[] }
export interface KebabSelection { meat: string; kg: number; marinade: string; extras: string[]; comment?: string }
export interface BonusConfig { percent: number; rate: number; matureHours: number; maxQty: number }
/** Группа клиента: новый, постоянный, VIP. */
export type Segment = 'new' | 'regular' | 'vip'
/** Акция группы: скидка на товары (%), баллы с покупки (%), бесплатная доставка. */
export interface Perks { discount: number; bonusPercent: number; freeDelivery: boolean }
/** С какого числа заказов клиент постоянный и VIP (или с какой суммы покупок — VIP). */
export interface SegmentRules { regularOrders: number; vipOrders: number; vipSpent: number }
export interface SegmentSettings { perks: Record<Segment, Perks>; rules: SegmentRules }
export interface ShopConfig { deliveryFee: number; freeDeliveryFrom: number; otpChannels?: Channel[]; phone?: { countryCode: string; mobileCodes: string[] }; bonus?: BonusConfig
  segments?: SegmentSettings }

export interface CartItem {
  id: number | string; kind: 'product' | 'kebab' | 'bonus'; productId?: number; kebab?: KebabSelection
  name: string; price: number; art: string; image?: string; note: string; qty: number
  /** Бонусный товар: цена одной штуки в баллах (price = 0). */
  points?: number
}
export type Channel = 'email' | 'phone'
export interface PublicUser {
  id: string; name: string; email: string; phone: string; role?: string
  twoFactorChannel?: Channel; emailVerified?: boolean; phoneVerified?: boolean
  /** Сохранённый адрес доставки — подставляется при заказе. */
  address?: string | null
}
/** devCode приходит только в тестовом режиме (почта/SMS не настроены на сервере) — чтобы регистрацию можно было пройти. */
export interface OtpChallenge { challengeId: string; channel: Channel; destination: string; expiresIn: number; resendIn: number; devCode?: string }
export interface OrderItem { name: string; kind?: string; unitPrice: number; qty: number; points?: number; options: unknown }
export type BonusState = 'pending' | 'available' | 'cancelled'
export interface OrderBonus { earned: number; spent: number; state: BonusState; availableAt: string }
export interface BonusEntry { orderId: number; createdAt: string; earned: number; spent: number; state: BonusState; availableAt: string }
/** Группа покупателя: manual — назначена магазином; next — сколько осталось до следующей группы (null — выше некуда или назначена). */
export interface CustomerLevel {
  segment: Segment; manual: boolean; perks: Perks; orders: number; spent: number
  next: { segment: Segment; ordersLeft: number; spentLeft: number | null } | null
}
/** Обмен баллов на подарок: код показывают продавцу. pending — ждёт выдачи, done — выдан, cancelled — отменён (баллы вернулись). */
export type RedemptionStatus = 'pending' | 'done' | 'cancelled'
export interface Redemption { code: string; productId: number; name: string; art: string; image?: string; points: number; status: RedemptionStatus; createdAt: string; closedAt: string | null }
export interface AdminRedemption extends Redemption { customer: { name: string; phone: string; email: string } | null }
export interface BonusInfo { available: number; pending: number; history: BonusEntry[]; redemptions?: Redemption[]; level?: CustomerLevel }
export interface Order {
  id: number; status: string; createdAt: string
  name: string; phone: string; address: string; time: string; payment: string
  /** pickup — самовывоз (address пустой); у старых заказов поля нет — это доставка. */
  delivery?: 'delivery' | 'pickup'
  geo?: { formatted: string; lat: number; lon: number } | null
  subtotal: number; deliveryFee: number; total: number; items: OrderItem[]
  /** Скидка по акции группы (֏) и группа клиента на момент заказа; у старых заказов полей нет. */
  discount?: number; segment?: string | null
  bonus?: OrderBonus
  /** Только в ответе на новый заказ: обновлённые данные аккаунта. */
  user?: PublicUser
}
/** Заказ в админке: плюс почта покупателя и судьба письма «заказ готов». */
export interface AdminOrder extends Order { email: string | null; readyEmailAt: string | null; readyEmailError: string | null }
/** Итог письма «заказ готов»: sent — ушло; test — почта сервера в тестовом режиме (письмо только в логе); failed — не ушло. */
export interface EmailResult { status: 'sent' | 'test' | 'failed'; to?: string; error?: string }
/** Товар в админке (раздел «Бонусные товары»). */
export interface AdminProduct {
  id: number; name: string; categoryId: number; price: number; art: string; image: string | null
  active: boolean; bonusPoints: number | null; bonusOnly: boolean
}
/** Клиент в админке: данные аккаунта, покупки, баллы и группа (назначенная вручную или по покупкам). */
export interface AdminUser {
  id: string; name: string; email: string; phone: string; address: string | null; role: string; createdAt: string
  emailVerified: boolean; phoneVerified: boolean
  segment: Segment; segmentManual: boolean; autoSegment: Segment
  orders: number; done: number; cancelled: number; spent: number; lastOrderAt: string | null
  bonus: { available: number; pending: number }
}
export type NavItem = { label: string; to: LinkTo } | { label: string; id: string }

export interface SlotDay { date: string; slots: { key: string; hour: number; left: number }[] }
export interface SlotsResponse { today: string; capacity: number; days: SlotDay[] }
