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
  /** Комбо: набор по одной цене (в «Հատուկ առաջարկներ»); доставка заказа с ним бесплатна — входит в цену. */
  combo?: boolean
  /** На развес (рыба, кролик): заказывают порциями, работник взвешивает, покупатель подтверждает цену (utils/weigh.ts). */
  weighed?: boolean
}

/** weighed — на развес (рыба, кролик): порция заказывается порциями (portions), без веса. */
export interface KebabMeat { id: string; name: string; perKg: number; weighed?: boolean }
/** note — состав добавки (показывается под названием). */
export interface KebabExtra { id: string; name: string; price: number; note?: string }
/** Обязательный «Լավաշ + աման» к шашлыку: один на каждые начатые perKg кг всего шашлыка в заказе (старый сервер его не присылает). */
export interface KebabPack { name: string; price: number; perKg: number }
export interface KebabConfig { meats: KebabMeat[]; marinades: string[]; extras: KebabExtra[]; pack?: KebabPack }
/** Порция шашлыка: обычное мясо — с весом kg; мясо на развес (рыба, кролик) — порциями portions, вес пришлёт работник. */
export interface KebabSelection { meat: string; kg?: number; portions?: number; marinade: string; extras: string[]; comment?: string }
/** welcome — баллы в подарок при регистрации (нет у старого сервера). */
export interface BonusConfig { percent: number; rate: number; matureHours: number; maxQty: number; welcome?: number }
/** Группа клиента: новый, постоянный, VIP. */
export type Segment = 'new' | 'regular' | 'vip'
/** Акция группы: скидка на товары (%), баллы с покупки (%), бесплатная доставка. */
export interface Perks { discount: number; bonusPercent: number; freeDelivery: boolean }
/** Группа на месяц: сколько полученных заказов этого месяца нужно и от какой суммы каждый (товары без доставки). */
export interface SegmentRules { regularOrders: number; regularMin: number; vipOrders: number; vipMin: number }
export interface SegmentSettings { perks: Record<Segment, Perks>; rules: SegmentRules }
/** Дальняя доставка заказа с комбо — со скидкой: дальше overKm от магазина fee ֏ вместо full ֏. */
export interface ComboFar { overKm: number; fee: number; full: number }
/** hours — часы работы по времени Армении: заказ на сайте можно оформить только с open:00 до close:00 (у старого сервера нет).
 *  Порога бесплатной доставки нет: бесплатно — только VIP (segments.perks.*.freeDelivery) и заказ с комбо (дальний — со скидкой). */
export interface ShopConfig { deliveryFee: number; hours?: { open: number; close: number }; phone?: { countryCode: string; mobileCodes: string[] }; bonus?: BonusConfig
  segments?: SegmentSettings
  /** Круг доставки вокруг магазина (нет у старого сервера). */
  zone?: DeliveryZone
  /** Дальняя доставка: адрес дальше overKm от магазина — fee ֏ (порог бесплатной доставки на неё не действует).
   *  comboFee — дальняя доставка заказа с комбо: не бесплатно, а со скидкой (нет у старого сервера — с комбо бесплатно везде). */
  deliveryFar?: { overKm: number; fee: number; comboFee?: number }
  /** Оплата картой на сайте (AmeriaBank) включена на сервере. */
  onlinePay?: boolean
  /** Рыба, кролик: порций в позиции, минут на подтверждение чека, пределы веса (нет у старого сервера). */
  weigh?: WeighConfig }
export interface WeighConfig { maxPortions: number; answerMinutes: number; minKg: number; maxKg: number }
/** Способ оплаты: наличными, картой в магазине (самовывоз), картой на сайте (AmeriaBank). */
export type PaymentMethod = 'cash' | 'card' | 'online'
/** Онлайн-оплата заказа: pending — ждём банк, paid — оплачено, failed — не прошла (можно оплатить снова). */
export interface OrderPay { state: 'pending' | 'paid' | 'failed'; at: string; card?: string }
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
  /** На развес (рыба, кролик): мясо — qty порций одной позицией (price = 0), шашлык — порции в kebab.portions
   *  (price — только добавки). Цену мяса посчитают после взвешивания; perKg — цена за кг для подписи. */
  weighed?: boolean
  perKg?: number
}
export interface PublicUser {
  id: string; name: string; email: string; phone: string; role?: string
  emailVerified?: boolean
  /** Сохранённый адрес доставки — подставляется при заказе. */
  address?: string | null
  /** Точка этого адреса на карте; null — адрес только текстом. */
  addressGeo?: GeoPoint | null
}
/** Код подтверждения отправлен на почту (destination — адрес со звёздочками).
 *  devCode приходит только в тестовом режиме (почта не настроена на сервере) — чтобы регистрацию можно было пройти. */
export interface OtpChallenge { challengeId: string; channel: 'email'; destination: string; expiresIn: number; resendIn: number; devCode?: string }
/** productId — у товаров и бонусных товаров (нет у шашлыка и у очень старых заказов); options у шашлыка — см. KebabOptions. */
/** weigh — позиция на развес (рыба, кролик): цена за кг, порций, вес всех порций (null — ещё не взвешено), добавки шашлыка. */
export interface OrderItem { productId?: number | null; name: string; kind?: string; unitPrice: number; qty: number; points?: number; options: unknown; weigh?: OrderItemWeigh }
export interface OrderItemWeigh { perKg: number; portions: number; kg: number | null; extras: number }
/** Параметры порции шашлыка в заказе: названия — для кухни; meat, kg (или portions — на развес), extraIds — чтобы повторить
 *  заказ (у старых заказов их нет). */
export interface KebabOptions { marinade?: string; extras?: string[]; comment?: string; meat?: string; kg?: number; portions?: number; extraIds?: string[] }
/** Взвешивание заказа с рыбой и кроликом: pending — ждём, пока работник взвесит; sent — чек отправлен, покупатель
 *  подтверждает до expiresAt; confirmed — подтвердил (заказ принят); rejected — отказался (reason); expired — не ответил. */
export type WeighState = 'pending' | 'sent' | 'confirmed' | 'rejected' | 'expired'
export interface OrderWeigh { state: WeighState; sentAt: string | null; expiresAt: string | null; answeredAt: string | null; reason?: string }
export type BonusState = 'pending' | 'available' | 'cancelled'
export interface OrderBonus { earned: number; spent: number; state: BonusState; availableAt: string }
export interface BonusEntry { orderId: number; createdAt: string; earned: number; spent: number; state: BonusState; availableAt: string }
/** Баллы не за заказ: welcome — подарок при регистрации; admin — магазин начислил (points > 0) или снял (points < 0).
 *  note — причина; by — кто из администраторов (только в админке). */
export interface BonusAdjustment { kind: 'welcome' | 'admin'; points: number; note: string | null; at: string; by?: string | null }
/** Засчитан ли заказ месяца: vip — в VIP (и в постоянного), regular — в постоянного; small — сумма меньше порога,
 *  pending — ещё не получен, cancelled — отменён. */
export type OrderMark = 'vip' | 'regular' | 'small' | 'pending' | 'cancelled'
/** Группа покупателя сейчас: заработанная в месяце действует до конца следующего. manual — назначена магазином (без срока);
 *  next — цель месяца: сколько заказов (от min ֏) осталось до группы segment, keep — чтобы сохранить нынешнюю группу и на
 *  следующий месяц (null — выше некуда или назначена); month — до какого дня действует группа, сколько дней осталось
 *  и сколько заказов месяца засчитано; marks — заказы месяца; notice — «вы стали …», пока покупатель не закрыл сообщение. */
export interface CustomerLevel {
  segment: Segment; manual: boolean; perks: Perks; orders: number; spent: number
  next: { segment: Segment; ordersLeft: number; min: number; keep?: boolean } | null
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
  /** Баллы не за заказы (подарок при регистрации, начисления и списания магазина), новые первыми; нет у старого сервера. */
  adjustments?: BonusAdjustment[]
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
  /** Комментарий магазина покупателю: пишет админ или работник, принимая или отменяя заказ (причина отмены).
   *  У старого сервера поля нет. */
  shopNote?: string | null
  /** Взвешивание — только у заказов с рыбой и кроликом (позиции на развес). */
  weigh?: OrderWeigh
  /** Онлайн-оплата (payment = 'online'): итог последней попытки. */
  pay?: OrderPay
  /** Только в ответе на новый заказ с онлайн-оплатой: страница оплаты банка (нет — банк не ответил, оплатить можно позже). */
  payUrl?: string
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
  /** Комбо: в «Հատուկ առաջարկներ», доставка заказа с ним бесплатна (у старого сервера поля нет). */
  combo?: boolean
  /** На развес сейчас (с правилом по умолчанию: рыба и кролик); weighedSet — задано вручную (у старого сервера полей нет). */
  weighed?: boolean
  weighedSet?: boolean
  rating: number; reviews: number
}
/** Клиент в админке: данные аккаунта, покупки, баллы и группа (назначенная вручную или по покупкам). */
export interface AdminUser {
  id: string; name: string; email: string; phone: string; address: string | null; role: string; createdAt: string
  emailVerified: boolean
  segment: Segment; segmentManual: boolean; autoSegment: Segment
  /** До какого дня действует группа по заказам (null — «новый»; у старого сервера поля нет). */
  autoUntil?: string | null
  /** Засчитано заказов в этом месяце: в постоянного и в VIP. */
  month?: { regular: number; vip: number }
  orders: number; done: number; cancelled: number; spent: number; lastOrderAt: string | null
  /** adjustments — баллы вручную и подарок при регистрации, новые первыми (нет у старого сервера). */
  bonus: { available: number; pending: number; adjustments?: BonusAdjustment[] }
}
/** Отчёт за неделю или месяц (раздел «Հաշվետվություններ»). final — закрытых заказов (их можно удалить после выгрузки),
 *  open — незакрытых (в пути, не оплачены). stale — после выгрузки закрылись новые заказы: файл надо скачать заново.
 *  todo — что пора сделать: download — скачать файл, purge — удалить закрытые заказы закончившегося месяца. */
export interface ExportRow {
  id: string; kind: 'week' | 'month'; key: string; first: string; last: string; label: string
  current: boolean; closed: boolean
  /** orders — все заказы периода (на сервере и в архивах недель); final — закрытые на сервере (их можно удалить);
   *  archived — удалённые после выгрузки недели, копии лежат в архиве (у месяца их удаляет очистка месяца). */
  orders: number; final: number; open: number; archived: number
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
/** open — магазин сейчас работает (вне часов работы заказ не принимается; у старого сервера поля нет). */
export interface SlotsResponse { today: string; capacity: number; days: SlotDay[]; times?: TimeDay[]; open?: boolean; hours?: { open: number; close: number } }
/** День в выборе времени (SlotPicker): left не задан — мест сколько угодно. */
export interface PickerDay { date: string; slots: { key: string; label: string; left?: number }[] }
