export type LinkTo = string | { path: string; query?: Record<string, string | number> }

export interface Category { id: number; name: string; art: string; orderable: boolean }
export interface Product {
  id: number; name: string; categoryId: number; price: number; old?: number
  art: string; image?: string; rating: number; reviews: number; discount: number; orderable: boolean
}

export interface KebabMeat { id: string; name: string; perKg: number }
export interface KebabExtra { id: string; name: string; price: number }
export interface KebabConfig { meats: KebabMeat[]; marinades: string[]; extras: KebabExtra[] }
export interface KebabSelection { meat: string; kg: number; marinade: string; extras: string[]; comment?: string }
export interface ShopConfig { deliveryFee: number; freeDeliveryFrom: number; otpChannels?: Channel[]; phone?: { countryCode: string; mobileCodes: string[] } }

export interface CartItem {
  id: number | string; kind: 'product' | 'kebab'; productId?: number; kebab?: KebabSelection
  name: string; price: number; art: string; image?: string; note: string; qty: number
}
export type Channel = 'email' | 'phone'
export interface PublicUser {
  id: string; name: string; email: string; phone: string; role?: string
  twoFactorChannel?: Channel; emailVerified?: boolean; phoneVerified?: boolean
}
/** devCode приходит только в тестовом режиме (почта/SMS не настроены на сервере) — чтобы регистрацию можно было пройти. */
export interface OtpChallenge { challengeId: string; channel: Channel; destination: string; expiresIn: number; resendIn: number; devCode?: string }
export interface OrderItem { name: string; unitPrice: number; qty: number; options: unknown }
export interface Order {
  id: number; status: string; createdAt: string
  name: string; phone: string; address: string; time: string; payment: string
  geo?: { formatted: string; lat: number; lon: number } | null
  subtotal: number; deliveryFee: number; total: number; items: OrderItem[]
}
export type NavItem = { label: string; to: LinkTo } | { label: string; id: string }

export interface SlotDay { date: string; slots: { key: string; hour: number; left: number }[] }
export interface SlotsResponse { today: string; capacity: number; days: SlotDay[] }
