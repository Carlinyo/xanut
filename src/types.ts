export type LinkTo = string | { path: string; query?: Record<string, string | number> }

export interface Category { id: number; name: string; art: string; orderable: boolean }
export interface Product {
  id: number; name: string; categoryId: number; price: number; old?: number
  art: string; image?: string; rating: number; reviews: number; discount: number; orderable: boolean
  /** Можно получить в подарок за столько бонусных баллов. */
  bonusPoints?: number
}

export interface KebabMeat { id: string; name: string; perKg: number }
export interface KebabExtra { id: string; name: string; price: number }
export interface KebabConfig { meats: KebabMeat[]; marinades: string[]; extras: KebabExtra[] }
export interface KebabSelection { meat: string; kg: number; marinade: string; extras: string[]; comment?: string }
export interface BonusConfig { percent: number; rate: number; matureHours: number; maxQty: number }
export interface ShopConfig { deliveryFee: number; freeDeliveryFrom: number; otpChannels?: Channel[]; phone?: { countryCode: string; mobileCodes: string[] }; bonus?: BonusConfig }

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
export interface BonusInfo { available: number; pending: number; history: BonusEntry[] }
export interface Order {
  id: number; status: string; createdAt: string
  name: string; phone: string; address: string; time: string; payment: string
  geo?: { formatted: string; lat: number; lon: number } | null
  subtotal: number; deliveryFee: number; total: number; items: OrderItem[]
  bonus?: OrderBonus
  /** Только в ответе на новый заказ: обновлённые данные аккаунта. */
  user?: PublicUser
}
export type NavItem = { label: string; to: LinkTo } | { label: string; id: string }

export interface SlotDay { date: string; slots: { key: string; hour: number; left: number }[] }
export interface SlotsResponse { today: string; capacity: number; days: SlotDay[] }
