export type LinkTo = string | { path: string; query?: Record<string, string | number> }

/** kebab — хоровац (заказ к часовому окну, «за кг» — через окно шашлыка); false — мясо. Старый сервер поля не присылает:
 *  тогда заказывать можно было только хоровац. */
export interface Category { id: number; name: string; art: string; orderable: boolean; kebab?: boolean }
/** Категория в админке (раздел «Բաժիններ»): position — место на сайте; products — товаров каталога в ней (и скрытых тоже). */
export interface AdminCategory extends Category { position: number; kebab: boolean; products: number }
/** Цена — за 1 кг или за штуку. */
export type ProductUnit = 'kg' | 'pc'
/** Вид мяса у хороваца (фильтр и порядок в каталоге) — см. utils/kinds.ts. */
export type ProductKind = 'pork' | 'beef' | 'lamb' | 'chicken' | 'turkey' | 'fish' | 'rabbit' | 'veg'
export interface Product {
  id: number; name: string; categoryId: number; price: number; old?: number
  /** rating и reviews — из отзывов покупателей о заказах с этим товаром (0 — отзывов ещё нет). */
  art: string; image?: string; rating: number; reviews: number; discount: number; orderable: boolean
  /** Хоровац (true) или мясо (false) — см. isKebab в utils/kebab.ts: старый сервер поля не присылает. */
  kebab?: boolean
  /** Нет в наличии (false) — товар виден, но заказать нельзя. Старый сервер поля не присылает — значит, есть. */
  inStock?: boolean
  /** kg — цена за 1 кг: хоровац — через окно «Խորոված պատվիրել», мясо — окно выбора веса (шаг 0,5 кг);
   *  pc — за штуку, сразу в корзину. */
  unit?: ProductUnit
  /** Описание для страницы товара (состав порции и т.п.). */
  description?: string
  /** Вид мяса у хороваца; нет — «прочее». */
  kind?: ProductKind
  /** Можно получить в подарок за столько бонусных баллов. */
  bonusPoints?: number
  /** Товар только за баллы (заведён в админке): в каталоге не показывается, за деньги не продаётся. */
  bonusOnly?: boolean
}

export interface KebabMeat { id: string; name: string; perKg: number }
/** note — состав добавки (показывается под названием). */
export interface KebabExtra { id: string; name: string; price: number; note?: string }
export interface KebabConfig { meats: KebabMeat[]; marinades: string[]; extras: KebabExtra[] }
export interface KebabSelection { meat: string; kg: number; marinade: string; extras: string[]; comment?: string }
export interface BonusConfig { percent: number; rate: number; matureHours: number; maxQty: number }
/** Группа клиента: новый, постоянный, VIP. */
export type Segment = 'new' | 'regular' | 'vip'
/** Акция группы: скидка на товары (%), баллы с покупки (%), бесплатная доставка. */
export interface Perks { discount: number; bonusPercent: number; freeDelivery: boolean }
/** Группа на месяц: сколько полученных заказов этого месяца нужно и от какой суммы каждый (товары без доставки). */
export interface SegmentRules { regularOrders: number; regularMin: number; vipOrders: number; vipMin: number }
export interface SegmentSettings { perks: Record<Segment, Perks>; rules: SegmentRules }
export interface ShopConfig { deliveryFee: number; freeDeliveryFrom: number; otpChannels?: Channel[]; phone?: { countryCode: string; mobileCodes: string[] }; bonus?: BonusConfig
  segments?: SegmentSettings
  /** Круг доставки вокруг магазина (нет у старого сервера). */
  zone?: DeliveryZone }
/** Точка на карте (градусы). */
export interface GeoPoint { lat: number; lon: number }
export interface DeliveryZone extends GeoPoint { radiusKm: number }

export interface CartItem {
  id: number | string; kind: 'product' | 'kebab' | 'meat' | 'bonus'; productId?: number; kebab?: KebabSelection
  /** Мясо на вес: вес одной упаковки (кг); price — цена этого веса, qty — сколько таких упаковок. */
  kg?: number
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
  /** Точка этого адреса на карте; null — адрес только текстом. */
  addressGeo?: GeoPoint | null
}
/** devCode приходит только в тестовом режиме (почта/SMS не настроены на сервере) — чтобы регистрацию можно было пройти. */
export interface OtpChallenge { challengeId: string; channel: Channel; destination: string; expiresIn: number; resendIn: number; devCode?: string }
/** productId — у товаров и бонусных товаров (нет у шашлыка и у очень старых заказов); options у шашлыка — см. KebabOptions. */
export interface OrderItem { productId?: number | null; name: string; kind?: string; unitPrice: number; qty: number; points?: number; options: unknown }
/** Параметры порции шашлыка в заказе: названия — для кухни; meat, kg, extraIds — чтобы повторить заказ (у старых заказов их нет). */
export interface KebabOptions { marinade?: string; extras?: string[]; comment?: string; meat?: string; kg?: number; extraIds?: string[] }
export type BonusState = 'pending' | 'available' | 'cancelled'
export interface OrderBonus { earned: number; spent: number; state: BonusState; availableAt: string }
export interface BonusEntry { orderId: number; createdAt: string; earned: number; spent: number; state: BonusState; availableAt: string }
/** Засчитан ли заказ месяца: vip — в VIP (и в постоянного), regular — в постоянного; small — сумма меньше порога,
 *  pending — ещё не получен, cancelled — отменён. */
export type OrderMark = 'vip' | 'regular' | 'small' | 'pending' | 'cancelled'
/** Группа покупателя на этот месяц: manual — назначена магазином (без срока); next — сколько заказов (от min ֏) осталось
 *  до следующей группы (null — выше некуда или назначена); month — до какого дня действует группа, сколько дней осталось
 *  и сколько заказов месяца засчитано; marks — заказы месяца; notice — «вы стали …», пока покупатель не закрыл сообщение. */
export interface CustomerLevel {
  segment: Segment; manual: boolean; perks: Perks; orders: number; spent: number
  next: { segment: Segment; ordersLeft: number; min: number } | null
  month: { until: string; daysLeft: number; regular: number; vip: number }
  marks: { id: number; mark: OrderMark }[]
  notice: { segment: Segment } | null
}
/** Отзыв о полученном заказе (виден автору в «Мои заказы»). */
export interface OrderReview { rating: number; text: string; createdAt: string }
/** Отзыв на сайте: имя и первая буква фамилии, без контактов. */
export interface PublicReview { author: string; rating: number; text: string; createdAt: string }
export interface ReviewsSummary { count: number; average: number; reviews: PublicReview[] }
/** Отзыв в админке: номер заказа и покупатель; hidden — скрыт с сайта. */
export interface AdminReview {
  orderId: number; author: string; rating: number; text: string; hidden: boolean; createdAt: string
  customer: { name: string; email: string; phone: string } | null
}
/** Обмен баллов на подарок: код показывают продавцу. pending — ждёт выдачи, done — выдан, cancelled — отменён (баллы вернулись). */
export type RedemptionStatus = 'pending' | 'done' | 'cancelled'
export interface Redemption { code: string; productId: number; name: string; art: string; image?: string; points: number; status: RedemptionStatus; createdAt: string; closedAt: string | null }
export interface AdminRedemption extends Redemption { customer: { name: string; phone: string; email: string } | null }
export interface BonusInfo {
  available: number; pending: number; history: BonusEntry[]; redemptions?: Redemption[]; level?: CustomerLevel
  /** Баллы прежних заказов, которые магазин убрал из базы после выгрузки месяца: в истории их нет, а в балансе они есть. */
  archived?: { earned: number; spent: number } | null
}
export interface Order {
  id: number; status: string; createdAt: string
  name: string; phone: string; address: string; time: string; payment: string
  /** time — начало часового окна; exactTime — точное время (заказ только из мяса). У старых заказов поля нет — окно. */
  exactTime?: boolean
  /** pickup — самовывоз (address пустой); у старых заказов поля нет — это доставка. */
  delivery?: 'delivery' | 'pickup'
  geo?: { formatted: string; lat: number; lon: number } | null
  subtotal: number; deliveryFee: number; total: number; items: OrderItem[]
  /** Скидка по акции группы (֏) и группа клиента на момент заказа; у старых заказов полей нет. */
  discount?: number; segment?: string | null
  bonus?: OrderBonus
  /** Оплата: false — не оплачен, true — магазин подтвердил оплату (баллы начислены). У заказов до учёта оплаты поля нет. */
  paid?: boolean
  /** Комментарий покупателя к заказу. */
  comment?: string
  /** Отзыв покупателя (только в «Мои заказы»); canReview — заказ получен и ещё не оценён. */
  review?: OrderReview | null
  canReview?: boolean
  /** Только в ответе на новый заказ: обновлённые данные аккаунта. */
  user?: PublicUser
}
/** Заказ в админке: плюс почта покупателя и судьба письма «заказ готов». */
export interface AdminOrder extends Order { email: string | null; readyEmailAt: string | null; readyEmailError: string | null }
/** Итог письма «заказ готов»: sent — ушло; test — почта сервера в тестовом режиме (письмо только в логе); failed — не ушло. */
export interface EmailResult { status: 'sent' | 'test' | 'failed'; to?: string; error?: string }
/** Товар в админке (разделы «Կատալոգ» и «Բոնուսային ապրանքներ»). active — виден на сайте; inStock — есть в наличии. */
export interface AdminProduct {
  id: number; name: string; categoryId: number; price: number; oldPrice: number | null; unit: ProductUnit; description: string | null
  kind: ProductKind | null
  art: string; image: string | null; active: boolean; inStock: boolean; bonusPoints: number | null; bonusOnly: boolean
  rating: number; reviews: number
}
/** Клиент в админке: данные аккаунта, покупки, баллы и группа (назначенная вручную или по покупкам). */
export interface AdminUser {
  id: string; name: string; email: string; phone: string; address: string | null; role: string; createdAt: string
  emailVerified: boolean; phoneVerified: boolean
  segment: Segment; segmentManual: boolean; autoSegment: Segment
  /** Засчитано заказов в этом месяце: в постоянного и в VIP. */
  month?: { regular: number; vip: number }
  orders: number; done: number; cancelled: number; spent: number; lastOrderAt: string | null
  bonus: { available: number; pending: number }
}
/** Отчёт за неделю или месяц (раздел «Հաշվետվություններ»). final — закрытых заказов (их можно удалить после выгрузки),
 *  open — незакрытых (в пути, не оплачены). stale — после выгрузки закрылись новые заказы: файл надо скачать заново.
 *  todo — что пора сделать: download — скачать файл, purge — удалить закрытые заказы закончившегося месяца. */
export interface ExportRow {
  id: string; kind: 'week' | 'month'; key: string; first: string; last: string; label: string
  current: boolean; closed: boolean
  orders: number; final: number; open: number
  downloadedAt: string | null; downloadedBy: string | null; stale: boolean
  purgedAt: string | null; purged: number
  todo: 'download' | 'purge' | null
}
/** todo — сколько всего дел (метка на вкладке). */
export interface ExportsOverview { today: string; weeks: ExportRow[]; months: ExportRow[]; todo: number }
/** Жалоба или предложение с сайта. */
export type FeedbackType = 'complaint' | 'suggestion'
/** Запись в админке: контакты для ответа (у вошедшего — из аккаунта), заказ, «разобрано». */
export interface AdminFeedback {
  id: number; type: FeedbackType; message: string
  name: string | null; phone: string | null; email: string | null
  userId: string | null; orderId: number | null
  status: 'new' | 'done'; createdAt: string; doneAt: string | null
}
export type NavItem = { label: string; to: LinkTo } | { label: string; id: string }

/** Часовые окна для заказа с хоровацем: left — свободных мест (0 — окно занято). */
export interface SlotDay { date: string; slots: { key: string; hour: number; left: number }[] }
/** Время для заказа только из мяса: с 10:00 до 22:00 с шагом 30 минут, без ограничения мест. */
export interface TimeDay { date: string; slots: { key: string; time: string }[] }
/** times — у старого сервера нет. */
export interface SlotsResponse { today: string; capacity: number; days: SlotDay[]; times?: TimeDay[] }
/** День в выборе времени (SlotPicker): left не задан — мест сколько угодно. */
export interface PickerDay { date: string; slots: { key: string; label: string; left?: number }[] }
